import assert from 'node:assert/strict'
import { after, test } from 'node:test'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const base = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:5173'
const attemptKey = 'nft-marketplace.checkout-attempt.v1'
const markerKey = `${attemptKey}.submitted`
after(() => browser.close())

async function withCheckout(run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 903 } })
  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    return { status: response.status, data: await response.json() }
  }, { path, method, body })
  const persisted = () => page.evaluate(({ attemptKey, markerKey }) => ({ attempt: JSON.parse(localStorage.getItem(attemptKey)), marker: localStorage.getItem(markerKey) }), { attemptKey, markerKey })
  const confirm = () => page.getByRole('button', { name: 'Confirmar compra', exact: true })
  const quote = async () => {
    await confirm().click()
    await page.getByText('Cotacao inicial gerada. Clique novamente para confirmar a compra.', { exact: true }).waitFor()
    return (await persisted()).attempt
  }
  const scenario = async (name) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.locator('.checkout-development > summary').click()
    await page.getByRole('combobox', { name: 'Cenario do pedido', exact: true }).click()
    await page.getByRole('option', { name, exact: true }).click()
    await page.setViewportSize({ width: 390, height: 903 })
  }
  try {
    await page.goto(`${base}/login?redirect=%2Fcheckout`)
    await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('collector123')
    await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByRole('heading', { name: 'Seu carrinho esta vazio', exact: true }).waitFor()
    await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
    await page.reload()
    await page.locator('.checkout-summary').waitFor()
    await run({ page, api, persisted, confirm, quote, scenario })
  } finally { await context.close() }
}

// Request and response gates distinguish a POST not yet received by the server
// from an order already created whose response has not reached the handler.
async function installGates(page, { orders = [], quote = false, session = false, recovery = false } = {}) {
  await page.evaluate(async (options) => {
    const resource = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/api/http/client.ts'))
    const { apiClient } = await import(resource.name)
    const state = window.__lifecycleRegression = { posts: [], quoteReplies: 0, sessionReplies: 0, recoveryReplies: 0, replies: [] }
    const orderGates = options.orders.map((_, index) => new Promise((resolve) => { (state.releaseOrders ??= [])[index] = resolve }))
    const quoteGate = new Promise((resolve) => { state.releaseQuote = resolve })
    const sessionGate = new Promise((resolve) => { state.releaseSession = resolve })
    const recoveryGate = new Promise((resolve) => { state.releaseRecovery = resolve })
    let quoteCount = 0
    let sessionCount = 0
    apiClient.interceptors.request.use(async (config) => {
      if (config.method === 'post' && config.url === '/orders') {
        const index = state.posts.length
        state.posts.push(structuredClone(config.data))
        config.lifecycleOrder = index
        if (options.orders[index] === 'request') await orderGates[index]
      }
      if (options.quote && config.method === 'post' && config.url === '/quotes' && quoteCount++ === 0) config.lifecycleQuote = true
      if (options.session && config.method === 'get' && config.url === '/auth/session' && sessionCount++ === 0) config.lifecycleSession = true
      return config
    })
    apiClient.interceptors.response.use(async (response) => {
      const index = response.config.lifecycleOrder
      if (index !== undefined) {
        state.replies[index] = structuredClone(response.data)
        if (options.orders[index] === 'response') await orderGates[index]
      }
      if (response.config.lifecycleQuote) { state.quoteReplies++; await quoteGate }
      if (response.config.lifecycleSession) { state.sessionReplies++; await sessionGate }
      if (options.recovery && response.config.url?.startsWith('/orders/attempts/')) { state.recoveryReplies++; await recoveryGate }
      return response
    })
  }, { orders, quote, session, recovery })
}

const navigate = (page, to) => page.evaluate(async (to) => { const { router } = await import('/src/router.tsx'); await router.navigate({ to }) }, to)
const leave = async (page) => { await navigate(page, '/cart'); await page.waitForURL((url) => url.pathname === '/cart') }
const releaseOrder = (page, index = 0) => page.evaluate((index) => window.__lifecycleRegression.releaseOrders[index](), index)
const posts = (page) => page.evaluate(() => window.__lifecycleRegression.posts)
const receipt = (page) => page.waitForURL((url) => url.pathname.startsWith('/orders/'))
async function idle(page, key) {
  await page.waitForFunction(async (key) => {
    const { queryClient } = await import('/src/api/queryClient.ts')
    const { router } = await import('/src/router.tsx')
    const finished = key
      ? queryClient.getMutationCache().getAll().some((mutation) => mutation.state.variables?.idempotencyKey === key && mutation.state.status !== 'pending')
      : queryClient.isMutating() === 0
    return finished && queryClient.isFetching() === 0 && !router.state.isLoading
  }, key)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.waitForFunction(async () => { const { router } = await import('/src/router.tsx'); return !router.state.isLoading })
}
async function assertCart(page) {
  assert.equal(new URL(page.url()).pathname, '/cart', 'an obsolete checkout must not redirect the user')
}
async function recoverOrder(app, attempt) {
  await navigate(app.page, '/checkout')
  await receipt(app.page)
  const recovered = await app.api(`/orders/attempts/${attempt.key}`)
  assert.equal(app.page.url().split('/').pop(), recovered.data.order.id)
  return recovered.data.order
}

for (const scenarioName of [null, 'Pedido pendente', 'Pagamento recusado', 'Timeout antes do pedido', 'Timeout apos criar pedido', 'Cotacao expirada', 'Sessao expirada']) {
  test(`leaving during POST: ${scenarioName ?? 'confirmed'} cannot navigate or clean the old attempt`, async () => {
    await withCheckout(async (app) => {
      const { page, scenario, quote, confirm, persisted } = app
      if (scenarioName) await scenario(scenarioName)
      const original = await quote()
      await installGates(page, { orders: ['request'] })
      await confirm().click()
      await page.waitForFunction(() => window.__lifecycleRegression.posts.length === 1)
      await leave(page)
      await releaseOrder(page)
      await idle(page, original.key)
      await assertCart(page)
      assert.deepEqual(await persisted(), { attempt: original, marker: original.key }, 'the original attempt must remain recoverable after unmount')
      assert.deepEqual((await posts(page))[0], { quoteId: original.quoteId, walletId: original.walletId, network: original.network, idempotencyKey: original.key, scenario: original.scenario })
      if ([null, 'Pedido pendente', 'Timeout apos criar pedido'].includes(scenarioName)) await recoverOrder(app, original)
    })
  })
}

test('remount before POST response retains ownership in the new instance and recovers on the next entry', async () => {
  await withCheckout(async (app) => {
    const { page, quote, confirm, persisted } = app
    const original = await quote()
    await installGates(page, { orders: ['request'] })
    await confirm().click()
    await page.waitForFunction(() => window.__lifecycleRegression.posts.length === 1)
    await leave(page)
    await navigate(page, '/checkout')
    await page.locator('.checkout-summary').waitFor()
    assert.deepEqual(await persisted(), { attempt: original, marker: original.key })
    await releaseOrder(page)
    await idle(page, original.key)
    assert.equal(new URL(page.url()).pathname, '/checkout', 'the unmounted handler must not take over the remounted route')
    assert.deepEqual(await persisted(), { attempt: original, marker: original.key })
    let recoveryPosts = 0
    page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/api/orders')) recoveryPosts++ })
    await page.reload()
    await receipt(page)
    assert.equal(recoveryPosts, 0, 'recovery must not create another order')
    const recovered = await app.api(`/orders/attempts/${original.key}`)
    assert.equal(page.url().split('/').pop(), recovered.data.order.id)
  })
})

for (const lateResult of ['success', 'definitive-error']) {
  test(`a newer submitted attempt survives the older ${lateResult}`, async () => {
    await withCheckout(async (app) => {
      const { page, api, quote, confirm, persisted } = app
      const original = await quote()
      await installGates(page, { orders: [lateResult === 'success' ? 'response' : 'request', 'request'] })
      await confirm().click()
      await page.waitForFunction(() => window.__lifecycleRegression.posts.length === 1)
      if (lateResult === 'success') await page.waitForFunction(() => Boolean(window.__lifecycleRegression.replies[0]))
      await leave(page)
      if (lateResult === 'success') {
        // The current instance may legitimately recover A while its original
        // instance is still waiting for A's POST response.
        await recoverOrder(app, original)
        await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
        await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); await queryClient.invalidateQueries({ queryKey: ['cart'] }) })
        await leave(page)
      } else {
        // Exercise the preserved legacy behavior to prepare B: modern submitted
        // attempts must no longer be discarded on quote 404 (stage 10F).
        await page.evaluate(({ markerKey, key }) => {
          if (localStorage.getItem(markerKey) === key) localStorage.removeItem(markerKey)
        }, { markerKey, key: original.key })
        // A real cart mutation invalidates the legacy quote, allowing its 404
        // cleanup and a new B. Keep all old-response/newer-identity assertions.
        const response = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().includes('/api/cart/items/'))
        await page.getByRole('button', { name: /Aumentar quantidade/ }).first().click()
        await response
      }
      await navigate(page, '/checkout')
      await page.locator('.checkout-summary').waitFor()
      const newer = await quote()
      assert.notEqual(newer.key, original.key)
      await confirm().click()
      await page.waitForFunction(() => window.__lifecycleRegression.posts.length === 2)
      await leave(page)
      await releaseOrder(page, 0)
      await idle(page, original.key)
      await assertCart(page)
      assert.deepEqual(await persisted(), { attempt: newer, marker: newer.key }, 'old cleanup must match both owner and attempt identity')
      await releaseOrder(page, 1)
      await idle(page, newer.key)
      await assertCart(page)
      assert.deepEqual(await persisted(), { attempt: newer, marker: newer.key })
      await recoverOrder(app, newer)
      assert.equal((await posts(page))[1].idempotencyKey, newer.key)
    })
  })
}

for (const entry of ['Confirmar compra', 'Revalidar cotacao']) {
  test(`an old ${entry} quote response cannot persist after unmount`, async () => {
    await withCheckout(async ({ page, confirm, quote, persisted }) => {
      await installGates(page, { quote: true })
      await page.getByRole('button', { name: entry, exact: true }).click()
      await page.waitForFunction(() => window.__lifecycleRegression.quoteReplies === 1)
      await leave(page)
      await page.evaluate(() => window.__lifecycleRegression.releaseQuote())
      await idle(page)
      await assertCart(page)
      assert.deepEqual(await persisted(), { attempt: null, marker: null })
      assert.equal((await posts(page)).length, 0)
      await navigate(page, '/checkout')
      await page.locator('.checkout-summary').waitFor()
      const newer = await quote()
      assert.equal((await persisted()).attempt.key, newer.key)
      assert.equal(await confirm().isEnabled(), true)
    })
  })
}

for (const expired of [false, true]) {
  test(`late ${expired ? 'expired' : 'valid'} session cannot submit or redirect an unmounted checkout`, async () => {
    await withCheckout(async ({ page, api, quote, confirm, persisted }) => {
      const original = await quote()
      if (expired) await api('/auth/logout', 'POST')
      await installGates(page, { session: true })
      await confirm().click()
      await page.waitForFunction(() => window.__lifecycleRegression.sessionReplies === 1)
      await leave(page)
      await page.evaluate(() => window.__lifecycleRegression.releaseSession())
      await idle(page)
      await assertCart(page)
      assert.equal((await posts(page)).length, 0)
      assert.deepEqual(await persisted(), { attempt: original, marker: null })
    })
  })
}

test('a delayed recovery lookup cannot clear or navigate over a newer persisted attempt', async () => {
  await withCheckout(async ({ page, api, quote, persisted }) => {
    const original = await quote()
    await api('/orders', 'POST', { quoteId: original.quoteId, walletId: original.walletId, network: original.network, idempotencyKey: original.key })
    await leave(page)
    await installGates(page, { recovery: true })
    await navigate(page, '/checkout')
    await page.waitForFunction(() => window.__lifecycleRegression.recoveryReplies > 0)
    await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
    const nextQuote = (await api('/quotes', 'POST', {})).data.quote
    const newer = { ...original, quoteId: nextQuote.id, key: 'newer-recovery-attempt' }
    // Fixture for a competing operation's already-persisted identity, while the
    // recovery UI is loading and cannot itself start another checkout action.
    await page.evaluate(({ newer, attemptKey, markerKey }) => { localStorage.setItem(attemptKey, JSON.stringify(newer)); localStorage.setItem(markerKey, newer.key) }, { newer, attemptKey, markerKey })
    await page.evaluate(() => window.__lifecycleRegression.releaseRecovery())
    await page.waitForFunction(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); return queryClient.isFetching() === 0 })
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(new URL(page.url()).pathname, '/checkout')
    assert.deepEqual(await persisted(), { attempt: newer, marker: newer.key })
  })
})

test('StrictMode effect replay preserves the submitted key and permits one legitimate recovery retry', async () => {
  await withCheckout(async ({ page, api, scenario, quote, confirm, persisted }) => {
    await scenario('Timeout antes do pedido')
    const original = await quote()
    await confirm().click()
    await page.getByRole('alert').waitFor()
    await idle(page, original.key)
    let lookups = 0
    page.on('request', (request) => { if (request.url().endsWith(`/api/orders/attempts/${original.key}`)) lookups++ })
    await page.reload()
    await page.locator('.checkout-summary').waitFor()
    assert(lookups >= 2, 'development StrictMode must exercise setup, cleanup and a fresh setup')
    assert.deepEqual(await persisted(), { attempt: original, marker: original.key })
    const request = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/api/orders'))
    await confirm().click()
    assert.equal((await request).postDataJSON().idempotencyKey, original.key)
    await receipt(page)
    const recovered = await api(`/orders/attempts/${original.key}`)
    assert.equal(page.url().split('/').pop(), recovered.data.order.id)
    assert.equal((await api('/cart')).data.cart.items.length, 0)
  })
})
