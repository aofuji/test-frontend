import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { build, preview } from 'vite'
import { gzipSync } from 'node:zlib'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const directory = await mkdtemp(join(tmpdir(), 'kurio-auth-loading-'))
const output = join(directory, 'dist')
const baseline = Boolean(process.env.AUTH_LAZY_BASELINE)
const report = { chunks: [], samples: [], snapshots: {}, checks: [] }
let server, browser
try {
  process.env.NODE_ENV = 'production'
  const baselineSource = baseline && process.env.AUTH_LAZY_BASELINE_SOURCE
    ? await readFile(process.env.AUTH_LAZY_BASELINE_SOURCE, 'utf8') : undefined
  const built = await build({ logLevel: 'silent',
    plugins: baselineSource ? [{ name: 'auth-dialog-baseline', enforce: 'pre', load(id) { if (id.endsWith('/auth-dialog.tsx')) return baselineSource } }] : [],
    build: { outDir: output, emptyOutDir: true } })
  for (const item of built.output) if (item.type === 'chunk') report.chunks.push({ file: item.fileName, bytes: Buffer.byteLength(item.code), gzip: gzipSync(item.code).length, modules: Object.keys(item.modules) })
  const forms = report.chunks.filter(chunk => chunk.modules.some(path => path.endsWith('/auth-forms.tsx')))
  assert.equal(forms.length, 1)
  const formsPath = `/${forms[0].file}`
  server = await preview({ build: { outDir: output }, preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false } })
  const traffic = []
  server.httpServer.prependListener('request', (request, response) => {
    const row = { path: new URL(request.url, 'http://local').pathname, bytes: 0 }
    const write = response.write, end = response.end
    const count = (chunk, encoding) => { if (chunk != null) row.bytes += Buffer.isBuffer(chunk) || ArrayBuffer.isView(chunk) ? chunk.byteLength : Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding : undefined) }
    response.write = function (chunk, ...args) { count(chunk, args[0]); return write.call(this, chunk, ...args) }
    response.end = function (chunk, ...args) { count(chunk, args[0]); return end.call(this, chunk, ...args) }
    response.once('finish', () => { row.status = response.statusCode; traffic.push(row) })
  })
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  report.chrome = browser.version()
  const base = server.resolvedUrls.local[0]
  async function fresh(width = 1440) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage()
    page.setDefaultTimeout(15_000)
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    const scripts = []
    page.on('request', request => { const path = new URL(request.url()).pathname; if (path.startsWith('/assets/') && path.endsWith('.js')) scripts.push(path) })
    return { context, page, cdp, scripts }
  }
  async function ready(page) {
    await page.locator('a[href^="/nft/aurora-001"]').first().waitFor()
    await page.getByText('Atualizacoes em tempo real conectadas.', { exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
  }
  // Mobile uses the existing /login route. Exercise the responsive dialog by opening
  // its desktop trigger before resizing, as the existing auth-mobile suite does.
  const trigger = page => page.getByRole('button', { name: 'Entrar', exact: true }).filter({ visible: true }).first()
  const dialog = page => page.getByRole('dialog')
  async function open(page) {
    const viewport = page.viewportSize()
    if (viewport.width < 640) await page.setViewportSize({ ...viewport, width: 1440 })
    await trigger(page).focus(); await page.keyboard.press('Enter'); await dialog(page).waitFor()
    if (viewport.width < 640) {
      await page.setViewportSize(viewport)
      await page.waitForFunction(() => document.querySelector('.auth-mobile-brand') && getComputedStyle(document.querySelector('.auth-mobile-brand')).display !== 'none')
    }
  }
  async function usable(page) { await dialog(page).getByLabel('E-mail', { exact: true }).waitFor() }
  async function close(page) {
    await page.keyboard.press('Escape')
    await dialog(page).waitFor({ state: 'hidden' })
    await page.waitForFunction(() => innerWidth < 640
      ? document.activeElement?.getAttribute('href') === '/profile'
      : document.activeElement?.textContent === 'Entrar')
  }
  async function checkTrap(page) {
    const controls = dialog(page).locator('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')
    const visible = []
    for (const control of await controls.all()) {
      if (await control.isVisible() && await control.evaluate(element => element.tabIndex >= 0)) visible.push(control)
    }
    assert.ok(visible.length)
    await visible.at(-1).focus()
    await page.keyboard.press('Tab')
    assert.equal(await visible[0].evaluate(element => element === document.activeElement), true, 'Tab must wrap within dialog')
    await page.keyboard.press('Shift+Tab')
    assert.equal(await visible.at(-1).evaluate(element => element === document.activeElement), true, 'Shift+Tab must wrap within dialog')
    await page.keyboard.press('Tab')
  }
  async function snapshot(page) {
    // Form insertion changes existing adjacent-sibling selectors on social buttons.
    // Compare settled styles, rather than sampling their normal CSS transitions.
    await dialog(page).evaluate(async element => {
      await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})))
    })
    return dialog(page).evaluate(element => {
      const normalize = value => value.replace(/radix-[^\s"<>]+/g, 'radix-id')
      return [...element.querySelectorAll('*'), element].map(node => {
        const css = getComputedStyle(node)
        return { tag: node.tagName, attributes: [...node.attributes].map(({ name, value }) => [name, normalize(value)]).filter(([name]) => name !== 'value'), text: node.children.length ? '' : node.textContent, styles: Object.fromEntries(['display', 'width', 'height', 'color', 'backgroundColor', 'fontFamily', 'fontSize', 'padding', 'margin', 'gap', 'borderRadius'].map(key => [key, css[key]])) }
      })
    })
  }
  for (const width of [1440, 390]) {
    for (let trial = 1; trial <= 3; trial++) {
      const state = await fresh(width)
      const { page, scripts } = state
      for (const kind of ['cold', 'warm']) {
        const start = traffic.length, offset = scripts.length
        if (kind === 'cold') await page.goto(base); else await page.reload()
        await ready(page)
        await page.waitForFunction(() => performance.now() >= 4000)
        const requested = [...new Set(scripts.slice(offset))]
        if (!baseline) assert.equal(requested.includes(formsPath), false, 'closed dialog must not request forms')
        const homeTraffic = traffic.slice(start).filter(row => row.path.startsWith('/assets/') && row.path.endsWith('.js'))
        const openOffset = scripts.length, openTraffic = traffic.length, started = performance.now()
        await open(page); await usable(page)
        const usableMs = performance.now() - started
        console.log(`MEASURE ${width} ${trial} ${kind}: form usable ${usableMs.toFixed(1)} ms`)
        assert.equal(await dialog(page).getByRole('button', { name: 'Fechar', exact: true }).evaluate(button => button === document.activeElement), true)
        assert.equal(await dialog(page).evaluate(element => element.contains(document.activeElement)), true)
        const requestedOnOpen = [...new Set(scripts.slice(openOffset))]
        if (!baseline) assert.ok(requestedOnOpen.includes(formsPath))
        report.samples.push({ width, trial, kind, requested, rawHome: requested.reduce((n, path) => n + report.chunks.find(chunk => `/${chunk.file}` === path).bytes, 0), homeBody: homeTraffic.reduce((n, row) => n + row.bytes, 0), homeTraffic, requestedOnOpen, openBody: traffic.slice(openTraffic).filter(row => row.path.endsWith('.js')).reduce((n, row) => n + row.bytes, 0), usableMs })
        if (trial === 1 && kind === 'cold') {
          report.snapshots[`${width}-login`] = await snapshot(page)
          if (width === 1440) {
            await dialog(page).getByRole('tab', { name: 'Criar conta', exact: true }).focus()
            await page.keyboard.press('Enter')
          } else await dialog(page).getByRole('button', { name: 'Crie uma conta', exact: true }).click()
          await dialog(page).getByLabel('Confirmar senha', { exact: true }).waitFor()
          report.snapshots[`${width}-register`] = await snapshot(page)
          if (width === 1440) {
            await page.keyboard.press('ArrowLeft')
            assert.equal(await page.evaluate(() => document.activeElement.id), 'auth-login-tab')
          } else await dialog(page).getByRole('button', { name: 'Entre', exact: true }).click()
          await usable(page)
        }
        await close(page)
        const beforeReopen = scripts.length
        await open(page); await usable(page)
        assert.equal(scripts.length, beforeReopen, 'reopening must reuse successfully loaded modules')
        await page.keyboard.press('Tab')
        assert.equal(await page.evaluate(() => document.activeElement.id), width === 1440 ? 'auth-login-tab' : 'auth-login-email')
        // Focus cannot escape the modal when cycling backwards through its first control.
        await dialog(page).getByRole('button', { name: 'Fechar', exact: true }).focus()
        await page.keyboard.press('Shift+Tab')
        assert.equal(await dialog(page).evaluate(element => element.contains(document.activeElement)), true)
        await close(page)
      }
      await state.context.close()
    }
  }
  if (process.env.AUTH_LAZY_COMPARE) {
    const before = JSON.parse(await readFile(process.env.AUTH_LAZY_COMPARE, 'utf8'))
    assert.deepEqual(report.snapshots, before.snapshots, 'loaded desktop/mobile DOM and computed styles must match baseline')
    assert.ok(report.samples[0].rawHome < before.samples[0].rawHome)
    assert.ok(report.samples[0].homeBody < before.samples[0].homeBody)
    report.checks.push('baseline DOM/styles and actual cold body reduction')
  }
  if (!baseline) {
    for (const mode of ['slow', 'slow-close', 'once', 'persistent']) {
      const state = await fresh(mode === 'slow-close' ? 390 : 1440)
      const { page, context, cdp } = state
      await page.goto(base); await ready(page)
      let arrivals = 0, release, entered
      const held = new Promise(resolve => { release = resolve })
      const entry = new Promise(resolve => { entered = resolve })
      await context.route(`**${formsPath}`, async route => {
        arrivals++; entered()
        if (mode.startsWith('slow')) await held
        await cdp.send('Network.setBypassServiceWorker', { bypass: false })
        if (mode === 'persistent' || (mode === 'once' && arrivals === 1)) await route.abort('failed')
        else await route.continue()
      })
      await cdp.send('Network.setBypassServiceWorker', { bypass: true })
      await open(page)
      await Promise.race([entry, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('forms chunk was not requested')), 15_000); timer.unref() })])
      if (mode.startsWith('slow')) {
        await dialog(page).getByText('Carregando formulário...', { exact: true }).waitFor()
        assert.equal(await dialog(page).getByRole('button', { name: 'Fechar', exact: true }).evaluate(button => button === document.activeElement), true)
        await checkTrap(page)
        if (mode === 'slow-close') {
          await dialog(page).getByRole('button', { name: 'Crie uma conta', exact: true }).click()
          await close(page)
          const arrived = page.waitForResponse(response => new URL(response.url()).pathname === formsPath)
          release()
          await arrived
          assert.equal(await dialog(page).count(), 0, 'completion after closing must not reopen dialog')
          await open(page); await usable(page)
        } else {
          await dialog(page).getByRole('tab', { name: 'Criar conta', exact: true }).focus()
          await page.keyboard.press('Enter')
          release()
          await dialog(page).getByLabel('Confirmar senha', { exact: true }).waitFor()
          assert.equal(await page.evaluate(() => document.activeElement.id), 'auth-register-tab')
          await page.keyboard.press('Home')
          await usable(page)
        }
        await close(page)
      } else {
        await dialog(page).getByRole('alert').waitFor()
        assert.equal(await dialog(page).getByRole('status').count(), 0)
        await checkTrap(page)
        await close(page); await open(page)
        await dialog(page).getByRole('alert').waitFor()
        assert.equal(await dialog(page).getByRole('button', { name: 'Fechar', exact: true }).isEnabled(), true)
        await dialog(page).getByRole('button', { name: 'Recarregar página', exact: true }).focus()
        await page.keyboard.press('Enter')
        await ready(page)
        await cdp.send('Network.setBypassServiceWorker', { bypass: true })
        await open(page)
        if (mode === 'persistent') {
          await dialog(page).getByRole('alert').waitFor()
          await close(page)
          await context.unroute(`**${formsPath}`)
          await page.reload(); await ready(page)
          await open(page)
        }
        await usable(page)
        await close(page)
      }
      report.checks.push(`${mode}: usable shell, close and recovery`)
      await context.close()
    }
    const state = await fresh()
    const { page } = state
    await page.goto(base); await ready(page); await open(page); await usable(page)
    await dialog(page).getByLabel('E-mail', { exact: true }).fill('ada@example.com')
    await dialog(page).getByLabel('Senha', { exact: true }).fill('wrong-password')
    await dialog(page).getByRole('button', { name: 'Entrar', exact: true }).click()
    await dialog(page).getByText('E-mail ou senha invalidos.', { exact: true }).waitFor()
    await dialog(page).getByLabel('Senha', { exact: true }).fill('collector123')
    await dialog(page).getByRole('button', { name: 'Entrar', exact: true }).click()
    await dialog(page).waitFor({ state: 'hidden' })
    await page.locator('header a[href="/profile"]').waitFor()
    report.checks.push('authentication failure and success')
    await state.context.close()
  }
  await writeFile(process.env.AUTH_LAZY_REPORT || process.env.AUTH_LAZY_BASELINE || join(tmpdir(), 'kurio-auth-loading-last.json'), JSON.stringify(report, null, 2))
  console.log(`PASS auth dialog production: closed-home isolation, loading, keyboard/focus, reopen, tabs, desktop/mobile DOM/styles${baseline ? ' (baseline)' : ', transient/persistent failures and authentication'}`)
} finally {
  await browser?.close()
  if (server) await new Promise(resolve => server.httpServer.close(resolve))
  await rm(directory, { recursive: true, force: true })
}
