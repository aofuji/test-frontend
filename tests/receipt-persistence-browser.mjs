import assert from 'node:assert/strict'
import { after, test } from 'node:test'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const base = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:5173'
const attemptKey = 'nft-marketplace.checkout-attempt.v1'
const markerKey = `${attemptKey}.submitted`
after(() => browser.close())
const navigate = (page, to) => page.evaluate(async (to) => { const { router } = await import('/src/router.tsx'); await router.navigate({ to }) }, to)

async function settled(page) {
  await page.waitForFunction(async () => {
    const { queryClient } = await import('/src/api/queryClient.ts')
    return queryClient.isFetching() === 0 && window.__receipt.reads === 0
  })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function withReceipt(run) {
  const context = await browser.newContext({ viewport: { width: 390, height: 903 } })
  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    return { status: response.status, data: await response.json() }
  }, { path, method, body })
  const persisted = () => page.evaluate(({ attemptKey, markerKey }) => ({ record: localStorage.getItem(attemptKey), marker: localStorage.getItem(markerKey) }), { attemptKey, markerKey })
  const store = (record, marker) => page.evaluate(({ attemptKey, markerKey, record, marker }) => {
    for (const [key, value] of [[attemptKey, record], [markerKey, marker]]) {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    }
  }, { attemptKey, markerKey, record: typeof record === 'object' && record !== null ? JSON.stringify(record) : record, marker })
  try {
    await page.goto(`${base}/login?redirect=%2Fcheckout`)
    await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('collector123')
    await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByRole('heading', { name: 'Seu carrinho esta vazio', exact: true }).waitFor()
    await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
    const quote = (await api('/quotes', 'POST', {})).data.quote
    const wallet = (await api('/wallets')).data.wallets.find((wallet) => wallet.network === 'ethereum')
    const attempt = { userId: 'user-ada', quoteId: quote.id, key: 'receipt-attempt-original', walletId: wallet.id, network: wallet.network, scenario: 'pending-manual' }
    const create = async (value = attempt) => {
      const response = await api('/orders', 'POST', { quoteId: value.quoteId, walletId: value.walletId, network: value.network, scenario: value.scenario, idempotencyKey: value.key })
      assert.equal(response.status, 201)
      return response.data.order
    }
    const order = await create()
    await page.evaluate(async () => {
      const resource = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/api/http/client.ts'))
      const { apiClient } = await import(resource.name)
      const state = window.__receipt = { reads: 0, arrived: 0, gate: false, fail: false }
      const hold = new Promise((resolve) => { state.release = resolve })
      apiClient.interceptors.request.use((config) => {
        if (config.url.startsWith('/orders/attempts/')) state.reads++
        return config
      })
      apiClient.interceptors.response.use(async (response) => {
        if (response.config.url.startsWith('/orders/attempts/')) {
          state.arrived++
          if (state.gate) await hold
          state.reads--
          if (state.fail) throw new Error('receipt lookup connection lost')
        }
        return response
      }, (error) => {
        if (error.config?.url.startsWith('/orders/attempts/')) window.__receipt.reads--
        throw error
      })
    })
    const confirm = () => api('/__mock/realtime/order', 'POST', { orderId: order.id, status: 'confirmed' })
    const open = async () => {
      await navigate(page, `/orders/${order.id}`)
      await page.locator('.order-receipt').waitFor()
      await settled(page)
    }
    await run({ page, api, persisted, store, attempt, order, create, confirm, open })
  } finally { await context.close() }
}

for (const marker of ['matching', 'absent', 'foreign']) {
  test(`confirmed receipt cleans its exact attempt with ${marker} marker`, async () => {
    await withReceipt(async ({ store, attempt, confirm, open, persisted }) => {
      const value = marker === 'matching' ? attempt.key : marker === 'foreign' ? 'a-different-key' : null
      await store(attempt, value)
      await confirm()
      await open()
      assert.deepEqual(await persisted(), { record: null, marker: marker === 'foreign' ? value : null })
    })
  })
}

for (const status of ['pending', 'declined']) {
  test(`${status} receipt preserves the attempt and submitted correlation`, async () => {
    await withReceipt(async ({ api, order, store, attempt, open, persisted }) => {
      await store(attempt, attempt.key)
      if (status === 'declined') await api('/__mock/realtime/order', 'POST', { orderId: order.id, status })
      await open()
      assert.deepEqual(await persisted(), { record: JSON.stringify(attempt), marker: attempt.key })
    })
  })
}

test('confirmed receipt preserves a later order with the same user, quote, wallet and network', async () => {
  await withReceipt(async ({ create, attempt, store, confirm, open, persisted }) => {
    const later = { ...attempt, key: 'receipt-attempt-later' }
    await create(later)
    await store(later, later.key)
    await confirm()
    await open()
    assert.deepEqual(await persisted(), { record: JSON.stringify(later), marker: later.key })
  })
})

for (const [field, value] of [['userId', 'user-bruno'], ['walletId', 'another-wallet'], ['network', 'polygon'], ['key', 'not-yet-submitted-key']]) {
  test(`confirmed receipt preserves an attempt with a different ${field}`, async () => {
    await withReceipt(async ({ attempt, store, confirm, open, persisted }) => {
      const other = { ...attempt, [field]: value }
      await store(other, other.key)
      await confirm()
      await open()
      assert.deepEqual(await persisted(), { record: JSON.stringify(other), marker: other.key })
    })
  })
}

for (const raw of [null, '{broken', 'null', '[]', '{"userId":"user-ada"}']) {
  test(`confirmed receipt tolerates absent or malformed persisted data: ${raw}`, async () => {
    await withReceipt(async ({ store, attempt, confirm, open, persisted }) => {
      await store(raw, attempt.key)
      await confirm()
      await open()
      assert.deepEqual(await persisted(), { record: raw, marker: attempt.key })
    })
  })
}

test('confirmed receipt does not erase an incomplete record matching its user and quote', async () => {
  await withReceipt(async ({ store, attempt, confirm, open, persisted }) => {
    const raw = JSON.stringify({ userId: attempt.userId, quoteId: attempt.quoteId })
    await store(raw, attempt.key)
    await confirm()
    await open()
    assert.deepEqual(await persisted(), { record: raw, marker: attempt.key })
  })
})

test('a failed correlation lookup preserves the attempt and its marker', async () => {
  await withReceipt(async ({ page, store, attempt, confirm, open, persisted }) => {
    await store(attempt, attempt.key)
    await confirm()
    await page.evaluate(() => { window.__receipt.fail = true })
    await open()
    assert.deepEqual(await persisted(), { record: JSON.stringify(attempt), marker: attempt.key })
  })
})

for (const field of ['key', 'quoteId', 'walletId', 'network', 'scenario', 'userId']) {
  test(`delayed receipt cleanup preserves a newer attempt with changed ${field}`, async () => {
    await withReceipt(async ({ page, attempt, store, confirm, order, persisted }) => {
      await store(attempt, attempt.key)
      await confirm()
      await page.evaluate(() => { window.__receipt.gate = true })
      await navigate(page, `/orders/${order.id}`)
      await page.waitForFunction(() => window.__receipt.arrived === 1)
      const values = { key: 'later-key', quoteId: 'later-quote', walletId: 'later-wallet', network: 'polygon', scenario: 'confirmed', userId: 'user-bruno' }
      const later = { ...attempt, [field]: values[field] }
      await store(later, later.key)
      await page.evaluate(() => window.__receipt.release())
      await settled(page)
      assert.deepEqual(await persisted(), { record: JSON.stringify(later), marker: later.key })
    })
  })
}

for (const method of ['getItem', 'removeItem']) {
  test(`localStorage ${method} failure does not hide the confirmed receipt or affect other keys`, async () => {
    await withReceipt(async ({ page, attempt, store, confirm, open, persisted }) => {
      await store(attempt, attempt.key)
      await confirm()
      await page.evaluate(({ method, attemptKey }) => {
        const original = Storage.prototype[method]
        window.__restoreStorage = () => { Storage.prototype[method] = original }
        Storage.prototype[method] = function (key, ...args) {
          if (key === attemptKey) throw new DOMException('Storage access refused', 'SecurityError')
          return original.call(this, key, ...args)
        }
      }, { method, attemptKey })
      await open()
      assert.equal(await page.locator('.order-receipt').count(), 1)
      await page.evaluate(() => window.__restoreStorage())
      assert.deepEqual(await persisted(), { record: JSON.stringify(attempt), marker: attempt.key })
    })
  })
}

test('a session change invalidates receipt cleanup even when the old attempt remains in storage', async () => {
  await withReceipt(async ({ page, api, attempt, store, confirm, order, persisted }) => {
    await store(attempt, attempt.key)
    await confirm()
    await page.evaluate(() => { window.__receipt.gate = true })
    await navigate(page, `/orders/${order.id}`)
    await page.waitForFunction(() => window.__receipt.arrived === 1)
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
    await page.evaluate(() => window.__receipt.release())
    await settled(page)
    assert.deepEqual(await persisted(), { record: JSON.stringify(attempt), marker: attempt.key })
    assert.equal(await page.locator('.order-receipt').count(), 0)
  })
})
