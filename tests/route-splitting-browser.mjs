import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build, preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const directory = await mkdtemp(join(tmpdir(), 'kurio-route-splitting-'))
const output = join(directory, 'dist')
const report = { chunks: [], phases: [], direct: [], failures: [] }
let server
let browser

async function files(path) {
  const entries = await readdir(path, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(path, entry.name)) : join(path, entry.name)))).flat()
}

try {
  // The dev-server test runner passes NODE_ENV=development to child processes.
  process.env.NODE_ENV = 'production'
  await build({ logLevel: 'silent', build: { outDir: output, emptyOutDir: true } })
  for (const file of (await files(output)).filter((file) => file.endsWith('.js'))) {
    const source = await readFile(file)
    report.chunks.push({ file: relative(output, file), bytes: source.length, gzipNode6: gzipSync(source, { level: 6 }).length })
  }
  server = await preview({ build: { outDir: output }, preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false } })
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  const base = server.resolvedUrls.local[0]
  const attemptKey = 'nft-marketplace.checkout-attempt.v1'
  const markerKey = `${attemptKey}.submitted`
  const contexts = []

  async function fresh() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    contexts.push(context)
    const page = await context.newPage()
    page.setDefaultTimeout(15_000)
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    const scripts = []
    const errors = []
    const consoleErrors = []
    const failed = []
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname
      if (path.startsWith('/assets/') && path.endsWith('.js')) scripts.push(path)
    })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('requestfailed', (request) => {
      if (!request.failure()?.errorText.includes('ERR_ABORTED')) failed.push(request.url())
    })
    await page.goto(base)
    await page.locator('a[href^="/nft/aurora-001"]').first().waitFor()
    await page.getByText('Atualizacoes em tempo real conectadas.', { exact: true }).waitFor()
    return { page, context, cdp, scripts, errors, consoleErrors, failed }
  }

  const clickPath = (page, path) => page.evaluate((path) => {
    const link = [...document.querySelectorAll('a[href]')].find((link) => new URL(link.href).pathname === path)
    if (!link) throw new Error(`Missing link ${path}`)
    link.click()
  }, path)

  async function login(page) {
    const trigger = page.locator('header').getByRole('button', { name: 'Entrar', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true)
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await page.waitForFunction(() => document.activeElement?.textContent === 'Entrar')
    await trigger.click()
    await dialog.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
    await dialog.getByLabel('Senha', { exact: true }).fill('collector123')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await page.locator('header a[href="/profile"]').waitFor()
  }

  const state = await fresh()
  const { page, scripts } = state
  let offset = 0
  function phase(name) {
    const requested = [...new Set(scripts.slice(offset))]
    offset = scripts.length
    const bytes = requested.reduce((total, path) => {
      const chunk = report.chunks.find((chunk) => `/${chunk.file}` === path)
      assert.ok(chunk, `Unknown chunk ${path}`)
      return total + chunk.bytes
    }, 0)
    report.phases.push({ name, requested, bytes })
    return { requested, bytes }
  }
  const home = phase('home')
  assert.ok(home.bytes < 1_197_093, `Home JS ${home.bytes} exceeds the stage 11A baseline`)
  assert.equal(home.requested.some((path) => /\/(checkout-|cart-|nft\._nftId-|_protected\.profile-|_protected\.wallets-|orders\._orderId-)/.test(path)), false)
  await login(page)
  phase('login-modal')
  await page.locator('a[href^="/nft/aurora-001"]').first().click()
  await page.getByRole('heading', { name: 'Aurora Chain #001', exact: true }).waitFor()
  assert.ok(phase('nft').requested.some((path) => path.includes('/nft._nftId-')))
  await page.locator('.nft-buy').click()
  await page.getByText('NFT adicionado ao carrinho.', { exact: true }).waitFor()
  await clickPath(page, '/')
  await page.locator('a[href^="/nft/aurora-001"]').first().waitFor()
  await clickPath(page, '/cart')
  await page.locator('.cart-summary').waitFor()
  assert.ok(phase('cart').requested.some((path) => path.includes('/cart-')))
  await page.goBack()
  await page.locator('a[href^="/nft/aurora-001"]').first().waitFor()
  await page.goForward()
  await page.locator('.cart-summary').waitFor()
  assert.deepEqual(phase('back-forward').requested, [])
  await page.locator('.cart-checkout').click()
  await page.locator('.checkout-summary').waitFor()
  assert.ok(phase('checkout').requested.some((path) => path.includes('/checkout-')))
  const confirm = page.getByRole('button', { name: 'Confirmar compra', exact: true })
  await confirm.click()
  await page.getByText('Cotacao inicial gerada. Clique novamente para confirmar a compra.', { exact: true }).waitFor()
  const attempt = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), attemptKey)
  assert.ok(attempt.key)
  const posted = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/api/orders'))
  await confirm.click()
  assert.equal((await posted).postDataJSON().idempotencyKey, attempt.key)
  await page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true }).waitFor()
  await page.waitForFunction(({ attemptKey, markerKey }) => localStorage.getItem(attemptKey) === null && localStorage.getItem(markerKey) === null, { attemptKey, markerKey })
  phase('receipt')
  await page.reload()
  await page.getByText('Confirmado', { exact: true }).first().waitFor()
  phase('receipt-refresh')
  await clickPath(page, '/profile')
  await page.locator('.profile-page form').first().waitFor()
  assert.ok(phase('profile').requested.some((path) => path.includes('/_protected.profile-')))
  await clickPath(page, '/wallets')
  await page.locator('.wallets-workspace form').waitFor()
  assert.ok(phase('wallets').requested.some((path) => path.includes('/_protected.wallets-')))
  await clickPath(page, '/profile')
  await page.locator('.profile-page form').first().waitFor()
  assert.deepEqual(phase('profile-repeat').requested, [])
  for (const [path, selector] of [['/nft/aurora-001', '.nft-detail h1'], ['/profile', '.profile-page form'], ['/wallets', '.wallets-workspace form']]) {
    await page.goto(new URL(path, base).href)
    await page.locator(selector).first().waitFor()
    await page.reload()
    await page.locator(selector).first().waitFor()
    report.direct.push(path)
  }
  await page.goto(new URL('/checkout', base).href)
  await page.getByRole('heading', { name: 'Seu carrinho esta vazio', exact: true }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: 'Seu carrinho esta vazio', exact: true }).waitFor()
  report.direct.push('/checkout')
  assert.deepEqual(state.errors, [])
  assert.deepEqual(state.consoleErrors, [])
  assert.deepEqual(state.failed, [])
  await clickPath(page, '/profile')
  await page.locator('.profile-page form').first().waitFor()
  await page.locator('.account-menu-logout').click()
  await page.locator('a[href^="/nft/aurora-001"]').first().waitFor()
  await page.goto(new URL('/checkout', base).href)
  await page.getByLabel('E-mail', { exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/login')
  assert.equal(new URL(page.url()).searchParams.get('redirect'), '/checkout')
  assert.equal(await page.locator('.checkout-summary').count(), 0)

  // The existing mock endpoint exercises receipt recovery and actual realtime frames.
  const recovered = await fresh()
  await login(recovered.page)
  const pending = await recovered.page.evaluate(async ({ attemptKey, markerKey }) => {
    const api = async (path, method = 'GET', body) => {
      const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
      if (!response.ok) throw new Error(`Fixture ${path}: ${response.status}`)
      return response.json()
    }
    await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
    const { quote } = await api('/quotes', 'POST', {})
    const { wallets } = await api('/wallets')
    const attempt = { userId: 'user-ada', quoteId: quote.id, key: 'splitting-recovery', walletId: wallets[0].id, network: wallets[0].network, scenario: 'pending-manual' }
    const { order } = await api('/orders', 'POST', { quoteId: quote.id, walletId: attempt.walletId, network: attempt.network, idempotencyKey: attempt.key, scenario: attempt.scenario })
    localStorage.setItem(attemptKey, JSON.stringify(attempt))
    localStorage.setItem(markerKey, attempt.key)
    return { attempt, order }
  }, { attemptKey, markerKey })
  await recovered.page.goto(new URL('/checkout', base).href)
  await recovered.page.getByText('Pendente', { exact: true }).first().waitFor()
  assert.equal(new URL(recovered.page.url()).pathname, `/orders/${pending.order.id}`)
  assert.deepEqual(await recovered.page.evaluate((key) => JSON.parse(localStorage.getItem(key)), attemptKey), pending.attempt)
  await recovered.page.evaluate(async (orderId) => {
    const response = await fetch('/api/__mock/realtime/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, status: 'confirmed' }) })
    if (!response.ok) throw new Error('Realtime fixture failed')
  }, pending.order.id)
  await recovered.page.getByText('Confirmado', { exact: true }).first().waitFor()
  await recovered.page.waitForFunction(({ attemptKey, markerKey }) => localStorage.getItem(attemptKey) === null && localStorage.getItem(markerKey) === null, { attemptKey, markerKey })
  assert.deepEqual(recovered.errors, [])
  assert.deepEqual(recovered.consoleErrors, [])

  for (const mode of ['slow', 'once', 'persistent']) {
    const probe = await fresh()
    let arrivals = 0
    let release
    const held = new Promise((resolve) => { release = resolve })
    let entered
    const entry = new Promise((resolve) => { entered = resolve })
    const pattern = '**/assets/nft._nftId-*.js'
    await probe.context.route(pattern, async (route) => {
      arrivals++
      entered()
      if (mode === 'slow') await held
      // Bypass SW only until intercepting the static chunk; API mocking stays intact.
      await probe.cdp.send('Network.setBypassServiceWorker', { bypass: false })
      if (mode === 'once' && arrivals === 1) await route.abort('failed')
      else if (mode === 'persistent') await route.fulfill({ status: 404, contentType: 'text/javascript', body: 'missing chunk' })
      else await route.continue()
    })
    await probe.cdp.send('Network.setBypassServiceWorker', { bypass: true })
    await probe.page.locator('a[href^="/nft/aurora-001"]').first().click()
    if (mode === 'slow') {
      await Promise.race([entry, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Chunk gate not reached')), 15_000); timer.unref() })])
      assert.equal(await probe.page.locator('header').isVisible(), true)
      assert.equal(await probe.page.getByText('Something went wrong!', { exact: true }).count(), 0)
      release()
    }
    if (mode === 'persistent') {
      await probe.page.getByText('Something went wrong!', { exact: true }).waitFor()
      assert.equal(arrivals, 2, 'the router retries the missing module with at most one automatic reload')
      await probe.context.unroute(pattern)
      await probe.page.reload()
    }
    await probe.page.getByRole('heading', { name: 'Aurora Chain #001', exact: true }).waitFor()
    report.failures.push({ mode, arrivals, recovered: true })
  }
  for (const context of contexts) await context.close()
  await writeFile(process.env.SPLITTING_REPORT || join(tmpdir(), 'kurio-route-splitting-last.json'), JSON.stringify(report, null, 2))
  console.log(`PASS production route splitting: home ${home.bytes} bytes; deferred routes, cached navigation, history, deep links/refresh, focus, two-action confirmation, persisted recovery, receipt cleanup and realtime`)
  console.log('PASS slow chunks, transient failure recovery and persistent failure boundary with recovery after refresh')
} finally {
  await browser?.close()
  if (server) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
  await rm(directory, { recursive: true, force: true })
}
