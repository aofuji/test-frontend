import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const base = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:5173'

async function startCheckout() {
  const context = await browser.newContext({ viewport: { width: 390, height: 903 } })
  const page = await context.newPage()
  const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    return { status: response.status, data: await response.json() }
  }, { path, method, body })
  await page.goto(`${base}/login?redirect=%2Fcheckout`)
  await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('collector123')
  await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/checkout')
  await page.getByRole('heading', { name: 'Seu carrinho esta vazio', exact: true }).waitFor()
  assert.equal((await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })).status, 200)
  const { data: { wallet: reserve } } = await api('/wallets', 'POST', { label: 'Reserva de teste', address: '0x1111111111111111111111111111111111111111', network: 'polygon', kind: 'secondary' })
  await page.reload()
  await page.getByRole('heading', { name: 'Pagamento com carteira', exact: true }).waitFor()
  const confirm = page.getByRole('button', { name: 'Confirmar compra', exact: true })
  async function quote() {
    await confirm.click()
    await page.getByText('Cotacao inicial gerada. Clique novamente para confirmar a compra.', { exact: true }).waitFor()
  }
  async function scenario(label) {
    // Deterministic development controls remain available on desktop.
    await page.setViewportSize({ width: 1440, height: 1080 })
    const details = page.locator('.checkout-development')
    if (!await details.evaluate((element) => element.open)) await details.locator('summary').click()
    await page.getByRole('combobox', { name: 'Cenario do pedido', exact: true }).click()
    await page.getByRole('option', { name: label, exact: true }).click()
    await page.setViewportSize({ width: 390, height: 903 })
  }
  return { context, page, api, reserve, confirm, quote, scenario }
}

try {
  const app = await startCheckout()
  try {
    const { page, api, reserve, confirm, quote } = app
    for (const width of [375, 390]) {
      await page.setViewportSize({ width, height: 903 })
      assert.equal(await page.locator('header').isVisible(), false)
      assert.equal(await page.locator('.checkout-breadcrumb').isVisible(), false)
      assert.equal(await page.getByLabel('Nome de exibição', { exact: true }).isVisible(), false)
      assert.equal(await page.getByLabel('E-mail', { exact: true }).isVisible(), false)
      assert.equal(await page.getByRole('radio').count(), 2)
      assert.equal(await page.getByRole('combobox', { name: 'Carteira do pedido' }).isVisible(), false)
      assert.equal(await page.getByRole('combobox', { name: 'Rede do pedido' }).isVisible(), true)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      assert.equal(await page.locator('.checkout-total-final dd').innerText(), `${(await api('/cart')).data.cart.totals.totalEth} ETH`)
    }
    assert.equal(await page.getByRole('link', { name: 'Trocar carteira', exact: true }).getAttribute('href'), '/wallets')
    const primaryWallet = (await api('/wallets')).data.wallets.find((wallet) => wallet.isDefault)
    await api(`/wallets/${primaryWallet.id}`, 'PATCH', { status: 'disconnected' })
    await page.reload()
    await page.getByRole('alert').filter({ hasText: 'Carteira desconectada.' }).waitFor()
    assert.equal(await confirm.isDisabled(), true)
    await page.getByRole('radio', { name: 'Reserva de teste, polygon', exact: true }).check()
    assert.equal(await page.getByRole('combobox', { name: 'Rede do pedido' }).innerText(), 'Polygon')
    await quote()
    await page.getByRole('radio', { name: 'Carteira principal, ethereum', exact: true }).check()
    assert.equal(await page.evaluate(() => localStorage.getItem('nft-marketplace.checkout-attempt.v1')), null)
    await page.getByRole('radio', { name: 'Reserva de teste, polygon', exact: true }).check()
    await page.getByRole('button', { name: 'Revisar pedido', exact: true }).click()
    await page.getByRole('heading', { name: 'Aurora Chain #001', exact: true }).waitFor()
    assert.equal(await page.locator('.checkout-total-final dd').innerText(), `${(await api('/cart')).data.cart.totals.totalEth} ETH`)
    await quote()
    const request = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/api/orders'))
    await confirm.click()
    const payload = (await request).postDataJSON()
    assert.equal(payload.walletId, reserve.id)
    assert.equal(payload.network, 'polygon')
    await page.waitForURL((url) => url.pathname.startsWith('/orders/'))
    assert.equal((await api('/cart')).data.cart.items.length, 0)
    await page.reload()
    await page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true }).waitFor()
    console.log('PASS mobile widths, real wallet cards, shared wallet/network state, quote invalidation, API total, review, confirmation and receipt refresh')
  } finally { await app.context.close() }

  const failure = await startCheckout()
  try {
    await failure.scenario('Cotacao expirada')
    await failure.quote()
    await failure.confirm.click()
    await failure.page.getByRole('alert').waitFor()
    assert.equal((await failure.api('/cart')).data.cart.items.length, 1)
    await failure.scenario('Erro HTTP 500')
    await failure.quote()
    await failure.confirm.click()
    await failure.page.getByRole('alert').waitFor()
    assert.equal((await failure.api('/cart')).data.cart.items.length, 1)
    await failure.page.getByRole('link', { name: 'Trocar carteira', exact: true }).click()
    await failure.page.waitForURL((url) => url.pathname === '/wallets')
    await failure.page.goto(`${base}/checkout`)
    await failure.page.getByRole('link', { name: 'Voltar ao carrinho', exact: true }).click()
    await failure.page.waitForURL((url) => url.pathname === '/cart')
    console.log('PASS expired quote and HTTP error preserve cart; wallet management and back navigation use existing routes')
  } finally { await failure.context.close() }

  const timeout = await startCheckout()
  try {
    await timeout.scenario('Timeout apos criar pedido')
    await timeout.quote()
    await timeout.confirm.click()
    await timeout.page.getByRole('alert').waitFor()
    const attempt = await timeout.page.evaluate(() => JSON.parse(localStorage.getItem('nft-marketplace.checkout-attempt.v1')))
    assert(attempt.key)
    await timeout.page.reload()
    await timeout.page.waitForURL((url) => url.pathname.startsWith('/orders/'))
    await timeout.page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true }).waitFor()
    const recoveredId = timeout.page.url().split('/').pop()
    assert.equal((await timeout.api(`/orders/attempts/${attempt.key}`)).data.order.id, recoveredId)
    assert.equal((await timeout.api('/cart')).data.cart.items.length, 0)
    console.log('PASS mobile timeout recovery preserves idempotency and opens one order receipt')
  } finally { await timeout.context.close() }
} finally {
  await browser.close()
}
