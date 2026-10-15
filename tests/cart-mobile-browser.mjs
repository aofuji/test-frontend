import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 375, height: 1000 } })
const base = process.env.CART_TEST_URL || 'http://127.0.0.1:5173'
const inc = () => page.getByRole('button', { name: /Aumentar quantidade de Aurora/ })
const dec = () => page.getByRole('button', { name: /Diminuir quantidade de Aurora/ })
const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
  const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, data: await response.json() }
}, { path, method, body })

async function settled() {
  await page.waitForFunction(async () => {
    const { queryClient } = await import('/src/api/queryClient.ts')
    return queryClient.isMutating({ mutationKey: ['cart'] }) === 0 && queryClient.isFetching({ queryKey: ['cart'] }) === 0
  })
}
async function mutate(button) {
  const response = page.waitForResponse((response) => response.url().includes('/api/cart/items') && response.request().method() !== 'GET')
  await button.click()
  await response
  await settled()
}
async function checkTotals() {
  const { data: { cart } } = await api('/cart')
  for (const [label, key] of [['Subtotal', 'subtotalEth'], ['Desconto', 'discountEth'], ['Taxa de rede', 'networkFeeEth'], ['Total', 'totalEth']]) {
    const row = page.locator('.cart-totals > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) })
    assert.equal(await row.locator('dd').innerText(), `${key === 'discountEth' ? '-' : ''}${cart.totals[key]} ETH`)
  }
}

try {
  await page.goto(base)
  await page.locator('#catalogo article').first().waitFor()
  await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
  await api('/cart/items', 'POST', { nftId: 'neon-204', editionId: 'neon-204-a', quantity: 1 })
  await page.goto(`${base}/cart`)
  await inc().waitFor()
  await settled()
  for (const width of [375, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    assert.equal(await page.locator('header').isVisible(), false)
    assert.equal(await page.getByRole('navigation', { name: 'Caminho de navegação' }).isVisible(), false)
    assert.equal(await page.getByRole('heading', { name: 'Carrinho de NFTs' }).isVisible(), true)
    assert.equal(await page.getByRole('link', { name: 'Voltar ao catálogo' }).isVisible(), true)
    assert.equal(await page.locator('.cart-summary-heading').isVisible(), false)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    const image = await page.locator('.cart-item-image').first().boundingBox()
    assert.equal(image.width, image.height)
    await checkTotals()
  }

  await mutate(inc())
  assert.equal((await api('/cart')).data.cart.items[0].quantity, 2)
  for (let quantity = 2; quantity < 5; quantity++) await mutate(inc())
  assert.equal(await inc().isDisabled(), true)
  for (let quantity = 5; quantity > 1; quantity--) await mutate(dec())
  assert.equal(await dec().isDisabled(), true)
  await checkTotals()

  await page.getByLabel('Cupom', { exact: true }).fill('EXPIRED')
  await mutate(page.getByRole('button', { name: 'Aplicar', exact: true }))
  await page.getByRole('alert').filter({ hasText: 'Cupom expirado' }).waitFor()
  await page.getByLabel('Cupom', { exact: true }).fill('SAVE10')
  await mutate(page.getByRole('button', { name: 'Aplicar', exact: true }))
  assert.equal((await api('/cart')).data.cart.coupon.code, 'SAVE10')
  await checkTotals()
  await mutate(page.getByRole('button', { name: 'Remover', exact: true }))
  assert.equal((await api('/cart')).data.cart.coupon, null)
  await checkTotals()
  await mutate(page.getByRole('button', { name: /Remover Neon District/ }))
  assert.equal((await api('/cart')).data.cart.items.length, 1)
  await checkTotals()
  await page.reload()
  await inc().waitFor()
  await checkTotals()

  await page.getByRole('button', { name: 'Continuar e finalizar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/login')
  assert.equal(new URL(page.url()).searchParams.get('redirect'), '/checkout')
  await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('collector123')
  await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/checkout')
  await page.getByRole('heading', { name: 'Confirmar compra', exact: true }).waitFor()
  await page.goto(`${base}/cart`)
  await page.getByRole('button', { name: 'Continuar e finalizar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/checkout')
  await page.goto(`${base}/cart`)
  await mutate(page.getByRole('button', { name: /Remover Aurora Chain/ }))
  await page.getByRole('heading', { name: 'Carrinho vazio', exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Voltar ao catálogo' }).isVisible(), true)
  console.log('PASS cart mobile at 375/390px, integrated layout, square images, no overflow, quantity limits, removal, coupon errors/apply/remove, API totals, refresh, guest login and authenticated checkout, empty state')
} finally {
  await browser.close()
}
