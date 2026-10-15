import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const base = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:5173'
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
  const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  assertResponse(response)
  return response.json()
  function assertResponse(response) { if (!response.ok) throw new Error(`${path}: ${response.status}`) }
}, { path, method, body })

try {
  await page.goto(`${base}/login?redirect=%2Fcheckout`)
  await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('collector123')
  await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.getByRole('heading', { name: 'Seu carrinho esta vazio', exact: true }).waitFor()
  await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 2 })
  await api('/cart/items', 'POST', { nftId: 'neon-204', editionId: 'neon-204-a', quantity: 1 })
  const { wallets } = await api('/wallets')
  const { quote } = await api('/quotes', 'POST', {})
  const { order } = await api('/orders', 'POST', { quoteId: quote.id, walletId: wallets[0].id, network: wallets[0].network, idempotencyKey: 'receipt-mobile-test' })
  await page.goto(`${base}/orders/${order.id}`)
  await page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true }).waitFor()

  for (const width of [375, 390]) {
    await page.setViewportSize({ width, height: 844 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `document overflow at ${width}px`)
    const overflow = await page.locator('.order-receipt-page').evaluate((element) => element.scrollWidth > element.clientWidth)
    assert.equal(overflow, false, `receipt overflow at ${width}px`)
    assert.equal(await page.locator('.order-receipt-strip dd').first().innerText(), order.transactionId ?? 'Não emitida')
    assert.equal(await page.locator('.order-receipt-strip dd').last().innerText(), order.wallet.label)
    assert.equal(await page.locator('.order-receipt-info-strong dd').innerText(), `${order.totals.totalEth} ETH`)
    assert.equal(await page.locator('.order-receipt-item').count(), order.items.length)
    for (const [index, item] of order.items.entries()) {
      const row = page.locator('.order-receipt-item').nth(index)
      assert.equal(await row.locator('h3').innerText(), item.name)
      assert.equal(await row.locator('.order-receipt-line-total').innerText(), `${item.lineTotalEth} ETH`)
      assert((await row.locator('.order-receipt-quantity').innerText()).includes(`× ${item.quantity}`))
      assert(await row.evaluate((element) => element.scrollWidth <= element.clientWidth), `item overflow at ${width}px`)
    }
    await page.locator('.order-receipt-page').evaluate((element) => { element.scrollTop = 0 })
    await page.screenshot({ path: `/tmp/kurio-receipt-top-${width}.png` })
    const close = page.getByRole('link', { name: 'Fechar recibo e voltar ao catálogo', exact: true })
    await close.scrollIntoViewIfNeeded()
    assert(await close.isVisible())
    const buttonBox = await close.boundingBox()
    assert(buttonBox.x >= 0 && buttonBox.x + buttonBox.width <= width)
    assert(buttonBox.y >= 0 && buttonBox.y + buttonBox.height <= 844)
    await page.screenshot({ path: `/tmp/kurio-receipt-bottom-${width}.png` })
  }
  await page.reload()
  await page.getByText('Confirmado', { exact: true }).waitFor()
  await page.getByRole('link', { name: 'Fechar recibo e voltar ao catálogo', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/')
  console.log('PASS receipt at 375/390px: no overflow, API data and quantities, refresh, final catalog navigation')
} finally {
  await browser.close()
}
