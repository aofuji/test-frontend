import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const base = process.env.AUTH_TEST_URL || 'http://127.0.0.1:5173'
let audits = 0

async function audit(page, name) {
  // Reuse axe-core shipped with the existing Lighthouse installation.
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  const result = await page.evaluate(() => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
  }))
  assert.deepEqual(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), [], name)
  audits++
}

async function focusIsVisible(locator) {
  assert(await locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return element === document.activeElement && (style.boxShadow !== 'none' || (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0))
  }), 'Keyboard focus must have an outline or ring')
}

async function checkTrap(page, dialog) {
  const controls = dialog.locator('button:not(:disabled), input:not(:disabled), a[href], summary, [tabindex="0"]')
  const visible = []
  for (const control of await controls.all()) {
    if (await control.isVisible() && await control.evaluate((element) => element.tabIndex >= 0)) visible.push(control)
  }
  assert(visible.length > 0)
  await visible.at(-1).focus()
  await page.keyboard.press('Tab')
  assert(await visible[0].evaluate((element) => element === document.activeElement), 'Tab must wrap inside the dialog')
  await page.keyboard.press('Shift+Tab')
  assert(await visible.at(-1).evaluate((element) => element === document.activeElement), 'Shift+Tab must wrap inside the dialog')
  await page.keyboard.press('Tab')
}

const api = (page, path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
  const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  assertResponse(response)
  return response.json()
  function assertResponse(response) { if (!response.ok) throw new Error(`${path}: ${response.status}`) }
}, { path, method, body })

try {
  for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await context.newPage()
    try {
      await page.goto(base)
      await page.locator('#catalogo article').first().waitFor()
      await page.keyboard.press('Tab')
      const skip = page.getByRole('link', { name: 'Pular para o conteúdo', exact: true })
      await focusIsVisible(skip)
      await page.keyboard.press('Enter')
      assert(await page.getByRole('main').evaluate((element) => element === document.activeElement))
      assert.equal(await page.locator('html').getAttribute('lang'), 'pt-BR')

      const trigger = page.getByRole('button', { name: 'Entrar', exact: true })
      await trigger.focus()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).waitFor()
      await checkTrap(page, dialog)
      await focusIsVisible(dialog.getByRole('button', { name: 'Fechar', exact: true }))
      await dialog.getByRole('tab', { name: 'Entrar', exact: true }).focus()
      await page.keyboard.press('ArrowRight')
      assert.equal(await dialog.getByRole('tab', { name: 'Criar conta', exact: true }).getAttribute('aria-selected'), 'true')
      await page.keyboard.press('Home')
      assert.equal(await dialog.getByRole('tab', { name: 'Entrar', exact: true }).getAttribute('aria-selected'), 'true')
      await page.setViewportSize({ width, height: 1000 })
      await audit(page, `login dialog ${width}`)
      await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
      const email = dialog.getByLabel('E-mail', { exact: true })
      assert(await email.evaluate((element) => element === document.activeElement))
      assert.equal(await email.getAttribute('aria-describedby'), 'auth-login-email-error')
      await dialog.locator('#auth-login-email-error[role="alert"]').waitFor()
      await audit(page, `login errors ${width}`)
      if (width < 640) await dialog.getByRole('button', { name: 'Crie uma conta', exact: true }).click()
      else await dialog.getByRole('tab', { name: 'Criar conta', exact: true }).click()
      await audit(page, `register dialog ${width}`)
      await dialog.getByLabel('Nome', { exact: true }).fill('Collector')
      await dialog.getByLabel('E-mail', { exact: true }).fill('collector@example.com')
      await dialog.getByLabel('Senha', { exact: true }).fill('collector123')
      await dialog.getByLabel('Confirmar senha', { exact: true }).fill('mismatch123')
      await dialog.getByRole('button', { name: width < 640 ? 'Criar perfil' : 'Criar conta', exact: true }).click()
      const confirmation = dialog.getByLabel('Confirmar senha', { exact: true })
      assert(await confirmation.evaluate((element) => element === document.activeElement))
      assert.equal(await confirmation.getAttribute('aria-describedby'), 'auth-register-confirmation-error')
      await audit(page, `register errors ${width}`)
      await checkTrap(page, dialog)
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      const returnTarget = width < 640 ? page.getByRole('navigation', { name: 'Navegação inferior' }).getByRole('link', { name: 'Perfil', exact: true }) : trigger
      await page.waitForFunction(() => document.activeElement?.matches('header button, .home-mobile-nav a[href="/profile"]'))
      assert(await returnTarget.evaluate((element) => element === document.activeElement))

      await page.goto(base)
      await page.locator('#catalogo article').first().waitFor()
      await audit(page, `home ${width}`)
      if (width < 640) {
        const filters = page.getByRole('button', { name: 'Abrir filtros', exact: true })
        await filters.focus()
        await page.keyboard.press('Enter')
        const panel = page.getByRole('dialog', { name: 'Filtros e ordenação' })
        await panel.waitFor()
        await checkTrap(page, panel)
        const min = panel.getByRole('slider', { name: 'Preço mínimo em ETH' })
        const old = Number(await min.getAttribute('aria-valuenow'))
        await min.focus()
        await page.keyboard.press('ArrowRight')
        assert(Number(await min.getAttribute('aria-valuenow')) > old)
        await focusIsVisible(min)
        assert(await page.evaluate(() => {
          const ids = [...document.querySelectorAll('[id]')].map((element) => element.id)
          return new Set(ids).size === ids.length
        }), 'Mobile panels must not duplicate IDs from the sidebar')
        await audit(page, 'mobile filters')
        await page.keyboard.press('Escape')
        await panel.waitFor({ state: 'hidden' })
        assert(await filters.evaluate((element) => element === document.activeElement))
      }

      for (const route of ['/login', '/register', '/nft/aurora-001']) {
        await page.goto(base + route)
        await page.locator('main input, main h1').first().waitFor()
        await audit(page, `${route} ${width}`)
      }
      const details = page.getByRole('tab', { name: 'Detalhes do NFT', exact: true })
      await details.focus()
      await page.keyboard.press('ArrowRight')
      const reviews = page.getByRole('tab', { name: 'Avaliações de colecionadores', exact: true })
      assert.equal(await reviews.getAttribute('aria-selected'), 'true')
      await focusIsVisible(reviews)
      await page.keyboard.press('Tab')
      assert(await page.getByRole('tabpanel').evaluate((element) => element === document.activeElement))
      await page.getByRole('heading', { name: 'Nenhuma avaliação disponível', exact: true }).waitFor()
      await api(page, '/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
      await page.goto(base + '/cart')
      await page.getByRole('button', { name: /Aumentar quantidade de Aurora/ }).waitFor()
      await audit(page, `cart ${width}`)
      const increase = page.getByRole('button', { name: /Aumentar quantidade de Aurora/ })
      await increase.focus()
      const quantityResponse = page.waitForResponse((response) => response.url().includes('/api/cart/items/') && response.request().method() === 'PATCH')
      await page.keyboard.press('Enter')
      await quantityResponse
      await page.waitForFunction(async () => (await (await fetch('/api/cart')).json()).cart.items[0].quantity === 2)
      assert.equal((await api(page, '/cart')).cart.items[0].quantity, 2)
      await page.getByLabel('Cupom', { exact: true }).fill('EXPIRED')
      await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
      await page.getByRole('alert').filter({ hasText: 'Cupom expirado' }).waitFor()
      assert.equal(await page.getByLabel('Cupom', { exact: true }).getAttribute('aria-describedby'), 'cart-mutation-error')
      await audit(page, `cart errors ${width}`)
      await page.goto(base + '/login?redirect=%2Fcheckout')
      await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
      await page.getByLabel('Senha', { exact: true }).fill('collector123')
      await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
      await page.getByRole('heading', { name: width < 640 ? 'Pagamento com carteira' : 'Confirmar compra', exact: true }).waitFor()
      await api(page, '/wallets', 'POST', { label: 'Carteira de teste', address: '0x1111111111111111111111111111111111111111', network: 'polygon', kind: 'secondary' })
      await page.reload()
      await page.getByRole('heading', { name: width < 640 ? 'Pagamento com carteira' : 'Confirmar compra', exact: true }).waitFor()
      await audit(page, `checkout ${width}`)
      if (width < 640) {
        const primary = page.getByRole('radio').first()
        await primary.focus()
        await page.keyboard.press('Space')
        assert(await primary.isChecked())
        await page.keyboard.press('ArrowDown')
        assert(await page.getByRole('radio', { name: 'Carteira de teste, polygon', exact: true }).isChecked())
        assert.equal(await page.getByRole('combobox', { name: 'Rede do pedido', exact: true }).innerText(), 'Polygon')
        await page.getByRole('button', { name: 'Revisar pedido', exact: true }).click()
        await page.getByRole('heading', { name: 'Aurora Chain #001', exact: true }).waitFor()
        await audit(page, 'mobile order review')
      } else {
        const wallets = page.getByRole('combobox', { name: 'Carteira do pedido', exact: true })
        await wallets.focus()
        await page.keyboard.press('Enter')
        await page.keyboard.press('End')
        await page.keyboard.press('Enter')
        assert((await wallets.innerText()).includes('Carteira de teste'))
        assert.equal(await page.getByRole('combobox', { name: 'Rede do pedido', exact: true }).innerText(), 'Polygon')
      }
      for (const route of ['/profile', '/wallets']) {
        await page.goto(base + route)
        await page.locator('main input').first().waitFor()
        await audit(page, `${route} ${width}`)
      }
      if (width < 640) {
        await page.goto(base)
        await page.locator('#catalogo article').first().waitFor()
        const favorites = page.getByRole('navigation', { name: 'Navegação inferior' }).getByRole('link', { name: 'Favoritos', exact: true })
        await favorites.focus()
        await page.keyboard.press('Enter')
        const panel = page.getByRole('dialog', { name: 'Favoritos', exact: true })
        await panel.waitFor()
        assert.equal(await page.locator('#home-mobile-favorites').getAttribute('aria-expanded'), 'true')
        await checkTrap(page, panel)
        await audit(page, 'mobile favorites')
        await page.keyboard.press('Escape')
        await panel.waitFor({ state: 'hidden' })
        assert(await favorites.evaluate((element) => element === document.activeElement))
        assert.equal(await favorites.getAttribute('aria-expanded'), 'false')
      }
      const { quote } = await api(page, '/quotes', 'POST', {})
      const { wallets } = await api(page, '/wallets')
      const { order } = await api(page, '/orders', 'POST', { quoteId: quote.id, walletId: wallets[0].id, network: wallets[0].network, idempotencyKey: `a11y-${width}` })
      await page.goto(`${base}/orders/${order.id}`)
      await page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true }).waitFor()
      await audit(page, `receipt ${width}`)
      console.log(`PASS accessibility ${width}px: keyboard, focus trap/return, tabs, associated errors, names, language, filters, cart and checkout`)
    } finally { await context.close() }
  }
  console.log(`PASS ${audits} axe audits with zero detected violations (including contrast); no screen-reader certification implied`)
} finally { await browser.close() }
