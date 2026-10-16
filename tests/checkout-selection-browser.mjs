import assert from 'node:assert/strict'
import { after, test } from 'node:test'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const base = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:5173'
const attemptKey = 'nft-marketplace.checkout-attempt.v1'
after(() => browser.close())

async function withCheckout(width, run) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(10_000)
  const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    return { status: response.status, data: await response.json() }
  }, { path, method, body })
  const attempt = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), attemptKey)
  const confirm = () => page.getByRole('button', { name: 'Confirmar compra', exact: true })
  const quote = async () => {
    await confirm().click()
    await page.getByText('Cotacao inicial gerada. Clique novamente para confirmar a compra.', { exact: true }).waitFor()
    return attempt()
  }
  const scenario = async (name) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    const details = page.locator('.checkout-development')
    if (!await details.evaluate((element) => element.open)) await details.locator('summary').click()
    await page.getByRole('combobox', { name: 'Cenario do pedido', exact: true }).click()
    await page.getByRole('option', { name, exact: true, includeHidden: true }).click()
    await page.setViewportSize({ width, height: 1000 })
  }
  try {
    await page.goto(`${base}/login?redirect=%2Fcheckout`)
    await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('collector123')
    await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByRole('heading', { name: 'Seu carrinho esta vazio', exact: true }).waitFor()
    await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
    const reserve = (await api('/wallets', 'POST', { label: 'Reserva de teste', address: '0x1111111111111111111111111111111111111111', network: 'polygon', kind: 'secondary' })).data.wallet
    await page.reload()
    await page.locator('.checkout-summary').waitFor()
    await run({ page, api, attempt, confirm, quote, scenario, reserve })
  } finally { await context.close() }
}

async function installGates(page) {
  await page.evaluate(async () => {
    const resource = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/api/http/client.ts'))
    const { apiClient } = await import(resource.name)
    const state = window.__selectionRegression = { sessions: 0, orders: [], holdSession: true }
    const sessionGate = new Promise((resolve) => { state.releaseSession = () => { state.holdSession = false; resolve() } })
    const orderGate = new Promise((resolve) => { state.releaseOrder = resolve })
    apiClient.interceptors.request.use(async (config) => {
      if (config.method === 'get' && config.url === '/auth/session' && state.holdSession) config.selectionRegressionSession = true
      if (config.method === 'post' && config.url === '/orders') {
        state.orders.push(structuredClone(config.data))
        await orderGate
      }
      return config
    })
    apiClient.interceptors.response.use(async (response) => {
      if (response.config.selectionRegressionSession) { state.sessions++; await sessionGate }
      return response
    })
  })
}

const releaseSession = (page) => page.evaluate(() => window.__selectionRegression.releaseSession())
const releaseOrder = (page) => page.evaluate(() => window.__selectionRegression.releaseOrder())
const orders = (page) => page.evaluate(() => window.__selectionRegression.orders)
const receipt = (page) => page.waitForURL((url) => url.pathname.startsWith('/orders/'))
async function settled(page) {
  await page.waitForFunction(async () => {
    const { queryClient } = await import('/src/api/queryClient.ts')
    return queryClient.isMutating() === 0
  })
}

async function changeSelection(page, width, kind) {
  if (kind === 'wallet' && width < 640) {
    // Native click also checks that disabled radio inputs cannot be activated.
    await page.getByRole('radio', { name: 'Reserva de teste, polygon', exact: true }).evaluate((element) => element.click())
  } else {
    const trigger = page.getByRole('combobox', { name: kind === 'wallet' ? 'Carteira do pedido' : 'Rede do pedido', exact: true })
    if (!await trigger.isDisabled()) {
      await trigger.click()
      await page.getByRole('option', { name: kind === 'wallet' ? 'Reserva de teste' : 'Polygon', exact: true }).click()
    }
  }
}

async function assertSelection(page, original) {
  assert.equal(await page.getByRole('radio', { name: 'Carteira principal, ethereum', exact: true, includeHidden: true }).isChecked(), true)
  assert.equal(await page.getByRole('combobox', { name: 'Rede do pedido', exact: true }).innerText(), 'Ethereum')
  const selected = await page.getByRole('radio', { name: 'Carteira principal, ethereum', exact: true, includeHidden: true }).inputValue()
  assert.equal(selected, original.walletId)
}

async function assertLocked(page) {
  for (const name of ['Carteira do pedido', 'Rede do pedido']) {
    assert.equal(await page.getByRole('combobox', { name, exact: true, includeHidden: true }).isDisabled(), true, `${name} must be disabled`)
  }
  for (const radio of await page.getByRole('radio', { includeHidden: true }).all()) assert.equal(await radio.isDisabled(), true)
}

for (const width of [1440, 390]) {
  for (const phase of ['session', 'post']) {
    for (const kind of ['wallet', 'network']) {
      test(`${width}px: ${kind} cannot change during ${phase}; success uses the original attempt`, async () => {
        await withCheckout(width, async ({ page, attempt, confirm, quote, api }) => {
          const original = await quote()
          await installGates(page)
          await confirm().click()
          await page.waitForFunction(() => window.__selectionRegression.sessions === 1)
          if (phase === 'post') {
            await releaseSession(page)
            await page.waitForFunction(() => window.__selectionRegression.orders.length === 1)
          }
          await changeSelection(page, width, kind)
          assert.deepEqual(await attempt(), original, 'selection must not discard the persisted attempt')
          await assertSelection(page, original)
          await assertLocked(page)
          await releaseSession(page)
          await page.waitForFunction(() => window.__selectionRegression.orders.length === 1)
          const [payload] = await orders(page)
          assert.deepEqual(payload, { quoteId: original.quoteId, walletId: original.walletId, network: original.network, idempotencyKey: original.key, scenario: original.scenario })
          await releaseOrder(page)
          await receipt(page)
          assert.equal(await attempt(), null)
          assert.equal((await api('/cart')).data.cart.items.length, 0)
        })
      })
    }
  }
}

for (const width of [1440, 390]) {
  for (const scenarioName of ['Timeout antes do pedido', 'Timeout apos criar pedido']) {
    test(`${width}px: ${scenarioName} retains selection, correlation and the retry key`, async () => {
      await withCheckout(width, async ({ page, scenario, quote, confirm, attempt, api }) => {
        await scenario(scenarioName)
        const original = await quote()
        await installGates(page)
        await confirm().click()
        await page.waitForFunction(() => window.__selectionRegression.sessions === 1)
        await releaseSession(page)
        await page.waitForFunction(() => window.__selectionRegression.orders.length === 1)
        await releaseOrder(page)
        await page.getByRole('alert').waitFor()
        await settled(page)
        await changeSelection(page, width, 'wallet')
        await changeSelection(page, width, 'network')
        assert.deepEqual(await attempt(), original, 'an ambiguous result must retain its correlation')
        await assertLocked(page)
        await assertSelection(page, original)
        assert.equal(await page.getByRole('button', { name: 'Revalidar cotacao', exact: true }).isDisabled(), true, 'requote must not replace an unresolved attempt')
        const beforeRetry = await api(`/orders/attempts/${original.key}`)
        assert.equal(beforeRetry.status, scenarioName === 'Timeout antes do pedido' ? 404 : 200)
        await confirm().click()
        await receipt(page)
        const payloads = await orders(page)
        assert.equal(payloads.length, 2)
        assert.deepEqual(payloads[1], payloads[0], 'retry must preserve the complete original payload')
        const recovered = await api(`/orders/attempts/${original.key}`)
        assert.equal(page.url().split('/').pop(), recovered.data.order.id)
        if (beforeRetry.status === 200) assert.equal(recovered.data.order.id, beforeRetry.data.order.id)
      })
    })

    test(`${width}px: ${scenarioName} survives remount without selection discarding recovery`, async () => {
      await withCheckout(width, async ({ page, scenario, quote, confirm, attempt, api }) => {
        await scenario(scenarioName)
        const original = await quote()
        await confirm().click()
        await page.getByRole('alert').waitFor()
        await settled(page)
        await page.reload()
        if (scenarioName === 'Timeout antes do pedido') {
          await page.locator('.checkout-summary').waitFor()
          await changeSelection(page, width, 'network')
          await changeSelection(page, width, 'wallet')
          assert.deepEqual(await attempt(), original)
          await assertLocked(page)
          await installGates(page)
          await releaseSession(page)
          await releaseOrder(page)
          await confirm().click()
          await receipt(page)
          assert.equal((await orders(page))[0].idempotencyKey, original.key)
        } else {
          await receipt(page)
        }
        const recovered = await api(`/orders/attempts/${original.key}`)
        assert.equal(page.url().split('/').pop(), recovered.data.order.id)
        assert.equal((await api('/cart')).data.cart.items.length, 0)
      })
    })
  }
}

for (const width of [1440, 390]) {
  for (const scenarioName of ['Pagamento recusado', 'Cotacao expirada']) {
    test(`${width}px: ${scenarioName} allows a new selection and keyboard interaction`, async () => {
      await withCheckout(width, async ({ page, scenario, quote, confirm, attempt, reserve }) => {
        await scenario(scenarioName)
        await quote()
        await confirm().click()
        await page.locator('.checkout-feedback').filter({ hasNotText: 'Cotacao inicial gerada.' }).waitFor()
        await settled(page)
        assert.equal(await attempt(), null)
        for (const name of ['Carteira do pedido', 'Rede do pedido']) assert.equal(await page.getByRole('combobox', { name, exact: true, includeHidden: true }).isDisabled(), false)
        if (width < 640) {
          const radio = page.getByRole('radio', { name: 'Reserva de teste, polygon', exact: true })
          await radio.focus()
          await page.keyboard.press('Space')
          assert.equal(await radio.isChecked(), true)
          assert.equal(await radio.evaluate((element) => document.activeElement === element), true)
        } else {
          const wallet = page.getByRole('combobox', { name: 'Carteira do pedido', exact: true })
          await wallet.focus()
          await page.keyboard.press('Enter')
          await page.getByRole('option', { name: 'Reserva de teste', exact: true }).click()
          assert.equal(await wallet.evaluate((element) => document.activeElement === element), true)
        }
        assert.equal(await page.getByRole('radio', { name: 'Reserva de teste, polygon', exact: true, includeHidden: true }).isChecked(), true)
        assert.equal(await page.getByRole('radio', { name: 'Reserva de teste, polygon', exact: true, includeHidden: true }).inputValue(), reserve.id)
        const network = page.getByRole('combobox', { name: 'Rede do pedido', exact: true })
        await network.focus()
        await page.keyboard.press('Enter')
        await page.getByRole('option', { name: 'Base', exact: true }).click()
        assert.equal(await network.innerText(), 'Base')
        assert.equal(await network.evaluate((element) => document.activeElement === element), true)
        const next = await quote()
        assert.equal(next.walletId, reserve.id)
        assert.equal(next.network, 'base')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      })
    })
  }
}
