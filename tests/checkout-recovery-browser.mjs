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

const navigate = (page, to) => page.evaluate(async (to) => { const { router } = await import('/src/router.tsx'); await router.navigate({ to }) }, to)
const leave = (page) => navigate(page, '/cart')
const recoveryError = (page) => page.getByRole('heading', { name: 'Nao foi possivel recuperar a tentativa', exact: true })
const payload = (attempt) => ({ quoteId: attempt.quoteId, walletId: attempt.walletId, network: attempt.network, idempotencyKey: attempt.key, scenario: attempt.scenario })
async function idle(page) {
  await page.waitForFunction(async () => {
    const { queryClient } = await import('/src/api/queryClient.ts')
    const { router } = await import('/src/router.tsx')
    return !queryClient.isMutating() && !queryClient.isFetching() && !router.state.isLoading
  })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

function trace(page) {
  const result = { posts: [], lookups: [], quotes: [] }
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/orders')) result.posts.push(request.postDataJSON())
  })
  page.on('response', (response) => {
    if (response.url().includes('/api/orders/attempts/')) result.lookups.push(response.status())
    if (response.request().method() === 'GET' && response.url().includes('/api/quotes/')) result.quotes.push(response.status())
  })
  return result
}

async function invalidateQuote({ page, api }) {
  const cart = (await api('/cart')).data.cart
  assert.equal((await api(`/cart/items/${cart.items[0].id}`, 'PATCH', { quantity: 2 })).status, 200)
  await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); await queryClient.invalidateQueries({ queryKey: ['cart'] }) })
}

async function installGates(page, { post = false, quote = false, fail = '' } = {}) {
  await page.evaluate(async (options) => {
    const resource = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/api/http/client.ts'))
    const { apiClient } = await import(resource.name)
    const { ApiError } = await import('/src/api/http/errors.ts')
    const state = window.__recovery = { posts: [], quoteReads: 0, quoteErrors: 0 }
    const postGate = new Promise((resolve) => { state.releasePost = resolve })
    const quoteGate = new Promise((resolve) => { state.releaseQuote = resolve })
    apiClient.interceptors.request.use(async (config) => {
      if (config.method === 'post' && config.url === '/orders') {
        state.posts.push(structuredClone(config.data))
        if (options.post) await postGate
      }
      if (config.method === 'get' && config.url.startsWith('/orders/attempts/') && options.fail === 'order') {
        throw new ApiError('Falha de rede dirigida na recuperacao.', { code: 'ERR_NETWORK' })
      }
      if (config.method === 'get' && config.url.startsWith('/quotes/')) {
        state.quoteReads++
        if (options.quote) await quoteGate
        if (options.fail === 'quote') throw new ApiError('Falha de rede dirigida na recuperacao.', { code: 'ERR_NETWORK' })
      }
      return config
    })
    apiClient.interceptors.response.use((response) => {
      if (response.config.method === 'post' && response.config.url === '/orders') state.order = structuredClone(response.data.order)
      return response
    }, (error) => {
      if (error.code === 'QUOTE_NOT_FOUND') state.quoteErrors++
      throw error
    })
  }, { post, quote, fail })
}

async function timeoutAttempt(app) {
  await app.scenario('Timeout antes do pedido')
  const original = await app.quote()
  await app.confirm().click()
  await app.page.getByRole('alert').waitFor()
  await idle(app.page)
  assert.deepEqual(await app.persisted(), { attempt: original, marker: original.key })
  return original
}

async function persistNewer({ page, api }, original, key) {
  const nextQuote = (await api('/quotes', 'POST', {})).data.quote
  const newer = { ...original, quoteId: nextQuote.id, key, scenario: 'confirmed' }
  // Competing persisted identity fixture; no UI polling or tab synchronization.
  await page.evaluate(({ newer, attemptKey, markerKey }) => { localStorage.setItem(attemptKey, JSON.stringify(newer)); localStorage.setItem(markerKey, newer.key) }, { newer, attemptKey, markerKey })
  return newer
}

for (const width of [1440, 390]) {
  test(`${width}px: submitted attempt survives repeated 404 recovery and keyboard retry without automatic POST`, async () => {
    await withCheckout(async (app) => {
      const { page, persisted } = app
      const original = await timeoutAttempt(app)
      await leave(page)
      await invalidateQuote(app)
      await page.setViewportSize({ width, height: 903 })
      const requests = trace(page)
      for (let entry = 0; entry < 3; entry++) {
        await navigate(page, '/checkout')
        await idle(page)
        assert.deepEqual(await persisted(), { attempt: original, marker: original.key })
        await recoveryError(page).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Confirmar compra', exact: true }).count(), 0)
        if (entry < 2) await leave(page)
      }
      const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true })
      await retry.focus()
      assert.equal(await retry.evaluate((button) => document.activeElement === button), true)
      const reloaded = page.waitForEvent('domcontentloaded')
      await page.keyboard.press('Enter')
      await reloaded
      await recoveryError(page).waitFor()
      await idle(page)
      assert.deepEqual(await persisted(), { attempt: original, marker: original.key })
      assert.equal(requests.posts.length, 0)
      assert(requests.lookups.length > 0 && requests.lookups.length <= 8, 'at most two StrictMode lookups per explicit entry; no polling')
      assert(requests.lookups.every((status) => status === 404))
      assert(requests.quotes.every((status) => status === 404))
    })
  })
}

for (const target of ['order', 'quote']) {
  test(`${target} recovery network failure preserves the context and permits a user retry with the same payload`, async () => {
    await withCheckout(async (app) => {
      const { page, confirm, persisted } = app
      const original = await timeoutAttempt(app)
      await leave(page)
      const requests = trace(page)
      await installGates(page, { fail: target })
      await navigate(page, '/checkout')
      await recoveryError(page).waitFor()
      assert.deepEqual(await persisted(), { attempt: original, marker: original.key })
      assert.equal(requests.posts.length, 0)
      await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
      await page.locator('.checkout-summary').waitFor()
      await idle(page)
      assert.deepEqual(await persisted(), { attempt: original, marker: original.key })
      assert.equal(await page.getByRole('combobox', { name: 'Rede do pedido', exact: true, includeHidden: true }).isDisabled(), true)
      assert.equal(requests.posts.length, 0)
      await confirm().click()
      await page.waitForURL((url) => url.pathname.startsWith('/orders/'))
      assert.deepEqual(requests.posts, [payload(original)])
      assert.deepEqual(await persisted(), { attempt: null, marker: null })
    })
  })
}

for (const status of ['confirmed', 'pending', 'declined']) {
  test(`POST ${status} between two 404 lookups preserves the attempt until its order is found`, async () => {
    await withCheckout(async (app) => {
      const { page, api, scenario, quote, confirm, persisted } = app
      if (status === 'declined') await scenario('Pagamento recusado')
      let original = await quote()
      if (status === 'pending') {
        // Use the existing manual pending scenario so mock timers/read counts
        // cannot promote the order while this concurrency test is asserting it.
        await leave(page)
        original = { ...original, scenario: 'pending-manual' }
        await page.evaluate(({ original, attemptKey }) => localStorage.setItem(attemptKey, JSON.stringify(original)), { original, attemptKey })
        await navigate(page, '/checkout')
        await page.locator('.checkout-summary').waitFor()
      }
      const requests = trace(page)
      await installGates(page, { post: true, quote: true })
      await confirm().click()
      await page.waitForFunction(() => window.__recovery.posts.length === 1)
      await leave(page)
      await navigate(page, '/checkout')
      await page.waitForFunction(() => window.__recovery.quoteReads > 0)
      await page.evaluate(() => window.__recovery.releasePost())
      await page.waitForFunction(() => Boolean(window.__recovery.order))
      const order = await page.evaluate(() => window.__recovery.order)
      assert.equal(order.status, status)
      if (status !== 'confirmed') await invalidateQuote(app)
      await page.evaluate(() => window.__recovery.releaseQuote())
      await idle(page)
      assert.deepEqual(await persisted(), { attempt: original, marker: original.key })
      await recoveryError(page).waitFor()
      assert(requests.lookups.includes(404))
      assert(requests.quotes.includes(404))
      assert.deepEqual(requests.posts, [payload(original)])
      await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
      if (status === 'declined') {
        await page.locator('.checkout-summary').waitFor()
        assert.equal(new URL(page.url()).pathname, '/checkout')
        assert.deepEqual(await persisted(), { attempt: null, marker: null })
        assert.equal(requests.posts.length, 1)
        const newer = await quote()
        assert.notEqual(newer.key, original.key)
        assert.equal(requests.posts.length, 1, 'the first legitimate click must only quote')
        await confirm().click()
        await page.waitForURL((url) => url.pathname.startsWith('/orders/'))
        assert.equal(requests.posts.length, 2)
      } else {
        await page.waitForURL((url) => url.pathname === `/orders/${order.id}`)
        assert.deepEqual(await persisted(), status === 'pending' ? { attempt: original, marker: original.key } : { attempt: null, marker: null })
        assert.equal(requests.posts.length, 1, 'recovery cannot create another order')
        if (status === 'pending') await page.getByText('Pendente', { exact: true }).first().waitFor()
      }
      assert.equal((await api(`/orders/attempts/${original.key}`)).data.order.id, order.id)
    })
  })
}

test('legacy quote without marker keeps its existing 404 cleanup and permits a fresh two-click purchase', async () => {
  await withCheckout(async (app) => {
    const { page, quote, confirm, persisted } = app
    const original = await quote()
    await leave(page)
    await invalidateQuote(app)
    const requests = trace(page)
    await navigate(page, '/checkout')
    await page.locator('.checkout-summary').waitFor()
    assert.deepEqual(await persisted(), { attempt: null, marker: null })
    assert.equal(requests.posts.length, 0)
    const newer = await quote()
    assert.notEqual(newer.key, original.key)
    assert.equal(requests.posts.length, 0)
    await confirm().click()
    await page.waitForURL((url) => url.pathname.startsWith('/orders/'))
    assert.deepEqual(requests.posts, [payload(newer)])
  })
})

test('legacy attempt without marker still recovers an already-created order before reading its missing quote', async () => {
  await withCheckout(async ({ page, api, quote, persisted }) => {
    const original = await quote()
    await leave(page)
    const order = (await api('/orders', 'POST', payload(original))).data.order
    const requests = trace(page)
    await navigate(page, '/checkout')
    await page.waitForURL((url) => url.pathname === `/orders/${order.id}`)
    assert.deepEqual(await persisted(), { attempt: null, marker: null })
    assert.equal(requests.posts.length, 0)
    assert.equal(requests.quotes.length, 0)
  })
})

test('a delayed quote 404 cannot erase a newer attempt; the next mount can retry the newer exact payload', async () => {
  await withCheckout(async (app) => {
    const { page, api, confirm, persisted } = app
    const original = await timeoutAttempt(app)
    await leave(page)
    await invalidateQuote(app)
    await installGates(page, { quote: true })
    const requests = trace(page)
    await navigate(page, '/checkout')
    await page.waitForFunction(() => window.__recovery.quoteReads > 0)
    const newer = await persistNewer(app, original, 'checkout-newer-recovery')
    await page.evaluate(() => window.__recovery.releaseQuote())
    await page.waitForFunction(() => window.__recovery.quoteErrors > 0)
    await idle(page)
    assert.deepEqual(await persisted(), { attempt: newer, marker: newer.key })
    assert.equal(requests.posts.length, 0)
    await leave(page)
    await navigate(page, '/checkout')
    await page.locator('.checkout-summary').waitFor()
    await confirm().click()
    await page.waitForURL((url) => url.pathname.startsWith('/orders/'))
    assert.deepEqual(requests.posts, [payload(newer)])
    assert.notEqual((await persisted()).attempt?.key, original.key)
  })
})

test('a modern submitted attempt survives an older POST quote error and retains its exact retry payload', async () => {
  await withCheckout(async (app) => {
    const { page, quote, confirm, persisted } = app
    const original = await quote()
    await installGates(page, { post: true })
    const requests = trace(page)
    await confirm().click()
    await page.waitForFunction(() => window.__recovery.posts.length === 1)
    await leave(page)
    await invalidateQuote(app)
    const newer = await persistNewer(app, original, 'checkout-newer-post-response')
    await navigate(page, '/checkout')
    await page.locator('.checkout-summary').waitFor()
    await page.evaluate(() => window.__recovery.releasePost())
    await page.waitForFunction(() => window.__recovery.quoteErrors > 0)
    await idle(page)
    assert.equal(new URL(page.url()).pathname, '/checkout')
    assert.deepEqual(await persisted(), { attempt: newer, marker: newer.key })
    assert.deepEqual(requests.posts, [payload(original)])
    await confirm().click()
    await page.waitForURL((url) => url.pathname.startsWith('/orders/'))
    assert.deepEqual(requests.posts, [payload(original), payload(newer)])
    assert.deepEqual(await persisted(), { attempt: null, marker: null })
  })
})

test('a quote recovery response from A cannot clear B correlation after login through the modal', async () => {
  await withCheckout(async (app) => {
    const { page, api, persisted } = app
    const original = await timeoutAttempt(app)
    await leave(page)
    await installGates(page, { quote: true })
    const requests = trace(page)
    await navigate(page, '/checkout')
    await page.waitForFunction(() => window.__recovery.quoteReads > 0)
    await api('/auth/logout', 'POST')
    await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] }) })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.locator('header').getByRole('button', { name: 'Entrar', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail', { exact: true }).fill('bruno@example.com')
    await dialog.getByLabel('Senha', { exact: true }).fill('vault1234')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
    const nextQuote = (await api('/quotes', 'POST', {})).data.quote
    const wallet = (await api('/wallets')).data.wallets[0]
    const newer = { userId: 'user-bruno', quoteId: nextQuote.id, walletId: wallet.id, network: wallet.network, key: 'checkout-bruno-recovery', scenario: 'confirmed' }
    await page.evaluate(({ newer, attemptKey, markerKey }) => { localStorage.setItem(attemptKey, JSON.stringify(newer)); localStorage.setItem(markerKey, newer.key) }, { newer, attemptKey, markerKey })
    await page.evaluate(() => window.__recovery.releaseQuote())
    await page.waitForFunction(() => window.__recovery.quoteErrors > 0)
    await idle(page)
    assert.equal(new URL(page.url()).pathname, '/')
    assert.deepEqual(await persisted(), { attempt: newer, marker: newer.key })
    assert.notEqual(newer.key, original.key)
    assert.equal(requests.posts.length, 0)
    await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); await queryClient.invalidateQueries({ queryKey: ['cart'] }) })
    await navigate(page, '/checkout')
    await page.locator('.checkout-summary').waitFor()
    assert.deepEqual(await persisted(), { attempt: newer, marker: newer.key })
    assert.equal(requests.posts.length, 0)
  })
})

