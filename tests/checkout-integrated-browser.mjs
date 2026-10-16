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
  try {
    await page.goto(`${base}/login?redirect=%2Fcheckout`)
    await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('collector123')
    await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByRole('heading', { name: 'Seu carrinho esta vazio', exact: true }).waitFor()
    await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
    await page.reload()
    await page.locator('.checkout-summary').waitFor()
    await run({ page, api, persisted, confirm, quote })
  } finally { await context.close() }
}

const navigate = (page, to) => page.evaluate(async (to) => { const { router } = await import('/src/router.tsx'); await router.navigate({ to }) }, to)
async function settled(page) {
  await page.waitForFunction(async () => {
    const { queryClient } = await import('/src/api/queryClient.ts')
    const { router } = await import('/src/router.tsx')
    return !queryClient.isMutating() && !queryClient.isFetching() && !router.state.isLoading
  })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

// Gate the real client, preserving HTTP payloads and the existing MSW handlers.
// A response gate represents a server commit that the caller has not observed.
async function gate(page, mode) {
  await page.evaluate(async (mode) => {
    const resource = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/api/http/client.ts'))
    const { apiClient } = await import(resource.name)
    const state = window.__integrated = { posts: [], sessions: 0, quoteReads: 0 }
    const order = new Promise((resolve) => { state.releaseOrder = resolve })
    const session = new Promise((resolve) => { state.releaseSession = resolve })
    const quote = new Promise((resolve) => { state.releaseQuote = resolve })
    const detail = new Promise((resolve) => { state.releaseDetail = resolve })
    apiClient.interceptors.request.use(async (config) => {
      if (config.method === 'post' && config.url === '/orders') {
        state.posts.push(structuredClone(config.data))
        if (mode === 'recovery-race') await order
      }
      if (mode === 'recovery-race' && config.method === 'get' && config.url.startsWith('/quotes/')) {
        state.quoteReads++
        await quote
      }
      if (mode === 'user-change' && state.result && config.method === 'get' && config.url === `/orders/${state.result.id}`) await detail
      return config
    })
    apiClient.interceptors.response.use(async (response) => {
      if (response.config.method === 'post' && response.config.url === '/orders') {
        state.result = structuredClone(response.data.order)
        if (mode === 'user-change') await order
      }
      if (mode === 'session' && response.config.url === '/auth/session') {
        state.sessions++
        await session
      }
      return response
    })
  }, mode)
}

test('double click during slow session followed by navigation cannot submit or erase the quote', async () => {
  await withCheckout(async ({ page, quote, confirm, persisted }) => {
    const original = await quote()
    await gate(page, 'session')
    await confirm().evaluate((button) => { button.click(); button.click() })
    await page.waitForFunction(() => window.__integrated.sessions === 1)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.locator('.checkout-development > summary').click()
    for (const name of ['Carteira do pedido', 'Rede do pedido', 'Cenario do pedido']) {
      assert.equal(await page.getByRole('combobox', { name, exact: true }).isDisabled(), true)
    }
    await navigate(page, '/cart')
    await page.evaluate(() => window.__integrated.releaseSession())
    await settled(page)
    assert.equal(new URL(page.url()).pathname, '/cart')
    assert.equal(await page.evaluate(() => window.__integrated.posts.length), 0)
    assert.deepEqual(await persisted(), { attempt: original, marker: null })
  })
})

for (const raw of [null, '{broken', 'null']) {
  test(`absent or malformed persisted record (${raw}) permits a fresh legitimate quote`, async () => {
    await withCheckout(async ({ page, quote, persisted }) => {
      await navigate(page, '/cart')
      await page.evaluate(({ attemptKey, markerKey, raw }) => {
        if (raw === null) localStorage.removeItem(attemptKey)
        else localStorage.setItem(attemptKey, raw)
        localStorage.setItem(markerKey, 'orphan-marker')
      }, { attemptKey, markerKey, raw })
      await navigate(page, '/checkout')
      await page.locator('.checkout-summary').waitFor()
      const next = await quote()
      assert.equal(next.userId, 'user-ada')
      // An orphan marker is ignored, rather than treated as a submitted attempt.
      assert.equal((await persisted()).marker, 'orphan-marker')
      assert.equal(await page.getByRole('combobox', { name: 'Rede do pedido', exact: true }).isEnabled(), true)
    })
  })
}

test('legacy record without submitted marker restores the quote and reuses its key on confirmation', async () => {
  await withCheckout(async ({ page, quote, confirm, persisted }) => {
    const original = await quote()
    await navigate(page, '/cart')
    await navigate(page, '/checkout')
    await page.locator('.checkout-summary').waitFor()
    assert.deepEqual(await persisted(), { attempt: original, marker: null })
    const request = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/api/orders'))
    await confirm().click()
    assert.equal((await request).postDataJSON().idempotencyKey, original.key)
    await page.waitForURL((url) => url.pathname.startsWith('/orders/'))
    assert.deepEqual(await persisted(), { attempt: null, marker: null })
  })
})

test('receipt confirmation removes the matching pending record and its submitted marker', async () => {
  await withCheckout(async ({ page, api, quote, persisted }) => {
    const original = await quote()
    await navigate(page, '/cart')
    const result = await api('/orders', 'POST', { quoteId: original.quoteId, walletId: original.walletId, network: original.network, idempotencyKey: original.key, scenario: 'pending-manual' })
    assert.equal(result.data.order.status, 'pending')
    await page.evaluate(({ markerKey, key }) => localStorage.setItem(markerKey, key), { markerKey, key: original.key })
    await navigate(page, '/checkout')
    await page.waitForURL((url) => url.pathname.startsWith('/orders/'))
    await page.getByText('Pendente', { exact: true }).first().waitFor()
    assert.deepEqual(await persisted(), { attempt: original, marker: original.key })
    assert.equal((await api('/__mock/realtime/order', 'POST', { orderId: result.data.order.id, status: 'confirmed' })).status, 200)
    await page.getByText('Confirmado', { exact: true }).first().waitFor()
    await page.waitForFunction((attemptKey) => localStorage.getItem(attemptKey) === null, attemptKey)
    assert.deepEqual(await persisted(), { attempt: null, marker: null })
  })
})

test('an order committed between recovery lookups retains its correlation until the next lookup finds it', async () => {
  await withCheckout(async ({ page, api, quote, confirm, persisted }) => {
    const original = await quote()
    let orderPosts = 0
    page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/api/orders')) orderPosts++ })
    await gate(page, 'recovery-race')
    await confirm().click()
    await page.waitForFunction(() => window.__integrated.posts.length === 1)
    await navigate(page, '/cart')
    await navigate(page, '/checkout')
    // The order lookup has returned 404; hold the subsequent quote lookup.
    await page.waitForFunction(() => window.__integrated.quoteReads > 0)
    await page.evaluate(() => window.__integrated.releaseOrder())
    await page.waitForFunction(() => Boolean(window.__integrated.result))
    await page.evaluate(() => window.__integrated.releaseQuote())
    await settled(page)
    assert.equal((await api(`/orders/attempts/${original.key}`)).data.order.status, 'confirmed')
    assert.equal(new URL(page.url()).pathname, '/checkout', 'the obsolete handler still cannot navigate')
    assert.deepEqual(await persisted(), { attempt: original, marker: original.key }, 'quote 404 cannot prove that an already-submitted attempt failed')
    await page.getByRole('heading', { name: 'Nao foi possivel recuperar a tentativa', exact: true }).waitFor()
    const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true })
    await retry.focus()
    assert.equal(await retry.evaluate((button) => document.activeElement === button), true)
    await page.keyboard.press('Enter')
    await page.waitForURL((url) => url.pathname.startsWith('/orders/'))
    const recovered = (await api(`/orders/attempts/${original.key}`)).data.order
    assert.equal(page.url().split('/').pop(), recovered.id)
    assert.deepEqual(await persisted(), { attempt: null, marker: null })
    assert.equal(orderPosts, 1, 'recovery must only look up the original order, never submit automatically')
  })
})

test('a previous user order response cannot repopulate private cache or render in the next session', async () => {
  await withCheckout(async ({ page, api, quote, confirm, persisted }) => {
    const original = await quote()
    await gate(page, 'user-change')
    await confirm().click()
    await page.waitForFunction(() => Boolean(window.__integrated.result))
    const orderId = await page.evaluate(() => window.__integrated.result.id)
    await navigate(page, '/cart')
    // Model server-side session expiry, then use the actual login mutation via
    // the existing SPA dialog; a full document reload would destroy the caller.
    await api('/auth/logout', 'POST')
    await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] }) })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.locator('header').getByRole('button', { name: 'Entrar', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail', { exact: true }).fill('bruno@example.com')
    await dialog.getByLabel('Senha', { exact: true }).fill('vault1234')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await api('/auth/session')).data.user.id, 'user-bruno')
    await page.evaluate(() => window.__integrated.releaseOrder())
    await settled(page)
    const cached = await page.evaluate(async (orderId) => {
      const { queryClient } = await import('/src/api/queryClient.ts')
      return queryClient.getQueryCache().getAll().some((query) => query.state.data?.id === orderId)
    }, orderId)
    assert.equal(cached, false, 'a late mutation callback must not reintroduce the previous user order')
    assert.deepEqual(await persisted(), { attempt: original, marker: original.key }, 'the old page handler still preserves its attempt')
    await page.evaluate(async (orderId) => {
      const { queryClient } = await import('/src/api/queryClient.ts')
      // Never read an entry left under the old unscoped contract.
      queryClient.setQueryData(['auth', 'private', 'orders', 'detail', orderId], window.__integrated.result)
      window.__oldReceiptSeen = false
      new MutationObserver(() => {
        if (document.querySelector('.order-receipt')) window.__oldReceiptSeen = true
      }).observe(document.body, { childList: true, subtree: true })
    }, orderId)
    await navigate(page, `/orders/${orderId}`)
    await page.waitForFunction(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); return queryClient.isFetching() > 0 })
    assert.equal(await page.locator('.order-receipt').count(), 0, 'private receipt data must remain hidden during loading')
    await page.evaluate(() => window.__integrated.releaseDetail())
    await page.getByRole('heading', { name: 'Pedido nao encontrado', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.__oldReceiptSeen), false, 'private data must never flash during loading or error')
  })
})

