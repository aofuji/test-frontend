import assert from 'node:assert/strict'
import { after, test } from 'node:test'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const base = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:5173'
const attemptKey = 'nft-marketplace.checkout-attempt.v1'
const confirmText = 'Confirmar compra'
const revalidateText = 'Revalidar cotacao'

after(() => browser.close())

async function withCheckout(run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    return { status: response.status, data: await response.json() }
  }, { path, method, body })
  const attempt = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), attemptKey)
  const quote = async () => {
    await page.getByRole('button', { name: confirmText, exact: true }).click()
    await page.getByText('Cotacao inicial gerada. Clique novamente para confirmar a compra.', { exact: true }).waitFor()
    return attempt()
  }
  const scenario = async (name) => {
    await page.locator('.checkout-development > summary').click()
    await page.getByRole('combobox', { name: 'Cenario do pedido', exact: true }).click()
    await page.getByRole('option', { name, exact: true }).click()
  }
  try {
    await page.goto(`${base}/login?redirect=%2Fcheckout`)
    await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('collector123')
    await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByRole('heading', { name: 'Seu carrinho esta vazio', exact: true }).waitFor()
    assert.equal((await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })).status, 200)
    await page.reload()
    await page.locator('.checkout-summary').waitFor()
    await run({ page, api, attempt, quote, scenario })
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
}

// Hold real session responses and mutation requests independently. No sleep is
// needed to hit the window before React Query's isPending becomes true.
async function installGates(page, failQuoteOnce = false) {
  await page.evaluate(async (failQuoteOnce) => {
    const resource = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/api/http/client.ts'))
    const { apiClient } = await import(resource.name)
    const { ApiError } = await import('/src/api/http/errors.ts')
    const state = window.__checkoutRegression = { sessions: 0, sessionReplies: 0, quotes: [], orders: [], holdSession: true }
    const sessionGate = new Promise((resolve) => { state.releaseSession = () => { state.holdSession = false; resolve() } })
    const mutationGate = new Promise((resolve) => { state.releaseMutation = resolve })
    apiClient.interceptors.request.use(async (config) => {
      if (config.method === 'get' && config.url === '/auth/session' && state.holdSession) {
        state.sessions++
        config.checkoutRegressionSession = true
      }
      if (config.method === 'post' && (config.url === '/quotes' || config.url === '/orders')) {
        state[config.url === '/quotes' ? 'quotes' : 'orders'].push(structuredClone(config.data))
        await mutationGate
        if (config.url === '/quotes' && failQuoteOnce) {
          failQuoteOnce = false
          throw new ApiError('Falha de rede dirigida na cotacao.', { code: 'ERR_NETWORK' })
        }
      }
      return config
    })
    apiClient.interceptors.response.use(async (response) => {
      if (response.config.checkoutRegressionSession) {
        state.sessionReplies++
        await sessionGate
      }
      return response
    })
  }, failQuoteOnce)
}

async function repeatClicks(page, first, second = first) {
  await page.getByRole('button', { name: first, exact: true }).evaluate((button, second) => {
    button.click()
    const other = [...document.querySelectorAll('.checkout-actions button')].find((element) => element.textContent.trim() === second)
    other.click()
  }, second)
  await page.waitForFunction(() => window.__checkoutRegression.sessionReplies > 0)
}

const trace = (page) => page.evaluate(() => {
  const { sessions, quotes, orders } = window.__checkoutRegression
  return { sessions, quotes, orders }
})
const releaseSession = (page) => page.evaluate(() => window.__checkoutRegression.releaseSession())
const releaseMutation = (page) => page.evaluate(() => window.__checkoutRegression.releaseMutation())
const waitForReceipt = (page) => page.waitForURL((url) => url.pathname.startsWith('/orders/'))
async function settled(page) {
  await page.waitForFunction(async () => {
    const { queryClient } = await import('/src/api/queryClient.ts')
    return queryClient.isMutating() === 0
  })
}

for (const button of [confirmText, revalidateText]) {
  test(`slow session: repeated ${button} creates one quote, then permits another action`, async () => {
    await withCheckout(async ({ page, api }) => {
      await installGates(page)
      await repeatClicks(page, button)
      assert.equal((await trace(page)).quotes.length, 0, 'no quote before session validation')
      await releaseSession(page)
      await page.waitForFunction(() => window.__checkoutRegression.quotes.length > 0)
      await releaseMutation(page)
      await page.getByText(button === confirmText ? 'Cotacao inicial gerada. Clique novamente para confirmar a compra.' : 'Cotacao atualizada. Revise os valores antes de confirmar.', { exact: true }).waitFor()
      await settled(page)
      const before = await trace(page)
      assert.equal(before.sessions, 1, 'repeated clicks must not start concurrent session validations')
      assert.equal(before.quotes.length, 1, 'exactly one quote per action')
      assert.equal(before.orders.length, 0, 'quoting must not also confirm')
      assert.equal((await api('/cart')).data.cart.items.length, 1)
      if (button === confirmText) {
        await page.getByRole('button', { name: confirmText, exact: true }).click()
        await waitForReceipt(page)
        assert.equal((await trace(page)).orders.length, 1, 'a distinct second click confirms')
      } else {
        await page.getByRole('button', { name: revalidateText, exact: true }).click()
        await page.waitForFunction(() => window.__checkoutRegression.quotes.length === 2)
        await settled(page)
        assert.equal((await trace(page)).quotes.length, 2, 'a later revalidation is allowed')
      }
    })
  })
}

test('slow session: repeated confirmation sends one order with the persisted key', async () => {
  await withCheckout(async ({ page, quote, api, attempt }) => {
    const original = await quote()
    await installGates(page)
    await repeatClicks(page, confirmText)
    await releaseSession(page)
    await page.waitForFunction(() => window.__checkoutRegression.orders.length > 0)
    await releaseMutation(page)
    await waitForReceipt(page)
    const recorded = await trace(page)
    assert.equal(recorded.sessions, 1)
    assert.equal(recorded.quotes.length, 0)
    assert.equal(recorded.orders.length, 1)
    assert.equal(recorded.orders[0].idempotencyKey, original.key)
    assert.equal((await api('/cart')).data.cart.items.length, 0)
    assert.equal(await attempt(), null)
  })
})

for (const [first, second] of [[confirmText, revalidateText], [revalidateText, confirmText]]) {
  test(`shared entry protection: ${first} excludes concurrent ${second}`, async () => {
    await withCheckout(async ({ page, quote }) => {
      await quote()
      await installGates(page)
      await repeatClicks(page, first, second)
      await releaseSession(page)
      await page.waitForFunction(() => window.__checkoutRegression.quotes.length + window.__checkoutRegression.orders.length > 0)
      await releaseMutation(page)
      if (first === confirmText) await waitForReceipt(page)
      else await page.getByText('Cotacao atualizada. Revise os valores antes de confirmar.', { exact: true }).waitFor()
      await settled(page)
      const recorded = await trace(page)
      assert.equal(recorded.sessions, 1)
      assert.equal(recorded.orders.length, first === confirmText ? 1 : 0)
      assert.equal(recorded.quotes.length, first === revalidateText ? 1 : 0)
    })
  })
}

for (const button of [confirmText, revalidateText]) {
  test(`session failure: repeated ${button} does not submit or replace the attempt`, async () => {
    await withCheckout(async ({ page, quote, api, attempt }) => {
      const original = await quote()
      await api('/auth/logout', 'POST')
      await installGates(page)
      await repeatClicks(page, button)
      await releaseSession(page)
      await page.waitForURL((url) => url.pathname === '/login')
      const recorded = await trace(page)
      assert.equal(recorded.sessions, 1)
      assert.equal(recorded.orders.length + recorded.quotes.length, 0)
      assert.deepEqual(await attempt(), original)
    })
  })
}

for (const button of [confirmText, revalidateText]) {
  test(`quote network failure via ${button} releases entry protection for a legitimate retry`, async () => {
    await withCheckout(async ({ page }) => {
      await installGates(page, true)
      await repeatClicks(page, button)
      await releaseSession(page)
      await page.waitForFunction(() => window.__checkoutRegression.quotes.length > 0)
      await releaseMutation(page)
      await page.getByRole('alert').filter({ hasText: 'Falha de rede dirigida na cotacao.' }).waitFor()
      await settled(page)
      const failed = await trace(page)
      assert.equal(failed.sessions, 1)
      assert.equal(failed.quotes.length, 1)
      await page.getByRole('button', { name: revalidateText, exact: true }).click()
      await page.getByText('Cotacao atualizada. Revise os valores antes de confirmar.', { exact: true }).waitFor()
      await settled(page)
      assert.equal((await trace(page)).quotes.length, 2)
    })
  })
}

for (const scenario of ['Timeout antes do pedido', 'Timeout apos criar pedido']) {
  test(`${scenario}: one failed POST, then retry reuses the same key and order`, async () => {
    await withCheckout(async ({ page, quote, api, attempt, scenario: selectScenario }) => {
      await selectScenario(scenario)
      const original = await quote()
      await installGates(page)
      await repeatClicks(page, confirmText)
      await releaseSession(page)
      await page.waitForFunction(() => window.__checkoutRegression.orders.length > 0)
      await releaseMutation(page)
      await page.getByRole('alert').waitFor()
      await settled(page)
      const failed = await trace(page)
      assert.equal(failed.sessions, 1)
      assert.equal(failed.orders.length, 1)
      assert.deepEqual(await attempt(), original)
      const beforeRetry = await api(`/orders/attempts/${original.key}`)
      assert.equal(beforeRetry.status, scenario === 'Timeout antes do pedido' ? 404 : 200)
      await page.getByRole('button', { name: confirmText, exact: true }).click()
      await waitForReceipt(page)
      const recorded = await trace(page)
      assert.equal(recorded.orders.length, 2)
      assert.equal(recorded.quotes.length, 0)
      assert(recorded.orders.every((payload) => payload.idempotencyKey === original.key))
      const recovered = await api(`/orders/attempts/${original.key}`)
      assert.equal(page.url().split('/').pop(), recovered.data.order.id)
      if (beforeRetry.status === 200) assert.equal(recovered.data.order.id, beforeRetry.data.order.id)
      assert.equal((await api('/cart')).data.cart.items.length, 0)
      const orderCount = await page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('nft-marketplace.order-state.v1'))
        return Object.values(state.ordersByUser).flat().length
      })
      assert.equal(orderCount, 1, 'retry must not create another logical order')
    })
  })
}
