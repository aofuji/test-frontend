import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 })
const page = await context.newPage()
const base = process.env.WALLETS_TEST_URL || 'http://127.0.0.1:5173'
const errors = []
const writes = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('request', (request) => {
  if (request.method() !== 'GET' && /\/api\/(wallets|profile)/.test(request.url())) writes.push(request)
})

const textbox = (name) => page.getByRole('textbox', { name, exact: true })
const save = () => page.getByRole('button', { name: 'Salvar carteira', exact: true })
async function api(path) {
  return page.evaluate(async (path) => (await (await fetch(`/api${path}`)).json()), path)
}
async function choose(name, option) {
  await page.getByRole('combobox', { name, exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

try {
  await page.goto(`${base}/login?redirect=%2Fwallets`)
  await textbox('E-mail').fill('ada@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('collector123')
  await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL(`${base}/wallets`)
  await save().waitFor()

  const left = [textbox('Nome de exibição'), page.getByRole('combobox', { name: 'Rede da carteira', exact: true }), textbox('Endereço da carteira'), page.getByRole('combobox', { name: 'Tipo da carteira', exact: true }), textbox('E-mail')]
  const right = ['Apelido da carteira', 'Nome do perfil', 'ENS ou carteira secundária (opcional)', 'Código de indicação', 'Nome ENS'].map(textbox)
  for (const column of [left, right]) {
    const boxes = []
    for (const control of column) { await control.waitFor(); boxes.push(await control.boundingBox()) }
    assert.ok(boxes.every((box) => Math.abs(box.x - boxes[0].x) < 100), 'Fields must stay in their reference column')
    assert.ok(boxes.every((box, index) => index === 0 || box.y > boxes[index - 1].y), 'Field order must follow the frame')
  }
  for (let index = 0; index < 5; index++) {
    const l = await left[index].boundingBox(), r = await right[index].boundingBox()
    assert.ok(r.x > l.x + l.width, 'Columns must not overlap')
    assert.ok(Math.abs(r.y - l.y) < 2, 'Matching rows must align')
    assert.equal(l.height, 40)
    assert.equal(r.height, 40)
  }
  assert.equal(await textbox('Nome de exibição').inputValue(), 'Ada Collector')
  assert.equal(await textbox('E-mail').inputValue(), 'ada@example.com')
  await page.screenshot({ path: '/tmp/kurio-wallet-fields-desktop.png', fullPage: true })
  console.log('PASS ten fields: presence, column/row order, alignment and session defaults')

  const locals = {
    'Nome de exibição': 'Nome apenas nesta tela',
    'E-mail': 'sem-arroba',
    'Nome do perfil': 'Perfil local',
    'ENS ou carteira secundária (opcional)': 'um-nome-sem-resolucao',
    'Código de indicação': 'codigo-sem-regra',
    'Nome ENS': 'ens de apresentação',
  }
  for (const [name, value] of Object.entries(locals)) {
    const input = textbox(name)
    assert.equal(await input.getAttribute('required'), null)
    assert.equal(await input.getAttribute('pattern'), null)
    await input.fill(value)
    assert.equal(await input.inputValue(), value)
  }
  assert.equal(writes.length, 0, 'Local fields must not issue wallet/profile writes')
  await textbox('Apelido da carteira').fill('Reserva visual')
  await textbox('Endereço da carteira').fill('invalid')
  await save().click()
  await page.getByRole('alert').waitFor()
  assert.equal(await textbox('Endereço da carteira').getAttribute('aria-invalid'), 'true')
  await textbox('Endereço da carteira').fill(`0x${'2'.repeat(40)}`)
  await choose('Rede da carteira', 'Polygon')
  const response = page.waitForResponse((response) => response.url().endsWith('/api/wallets') && response.request().method() === 'POST' && response.status() === 201)
  await save().click()
  const created = await response
  assert.deepEqual(created.request().postDataJSON(), { label: 'Reserva visual', address: `0x${'2'.repeat(40)}`, network: 'polygon', kind: 'secondary' })
  await page.getByRole('status').filter({ hasText: 'Carteira conectada com sucesso.' }).waitFor()
  assert.equal((await api('/wallets')).wallets.length, 2)
  const profile = (await api('/profile')).profile
  assert.equal(profile.name, 'Ada Collector')
  assert.equal(profile.email, 'ada@example.com')
  assert.equal(writes.some((request) => request.url().includes('/api/profile')), false)
  console.log('PASS local-only state does not block saving; original EVM validation and exact wallet payload retained')

  await page.reload()
  await save().waitFor()
  assert.equal(await textbox('Nome de exibição').inputValue(), 'Ada Collector')
  assert.equal(await textbox('E-mail').inputValue(), 'ada@example.com')
  for (const name of ['Nome do perfil', 'ENS ou carteira secundária (opcional)', 'Código de indicação', 'Nome ENS']) assert.equal(await textbox(name).inputValue(), '')
  await page.getByRole('button', { name: 'Editar Reserva visual', exact: true }).click()
  assert.equal(await textbox('Apelido da carteira').inputValue(), 'Reserva visual')
  assert.equal(await textbox('Endereço da carteira').inputValue(), `0x${'2'.repeat(40)}`)
  await textbox('Apelido da carteira').fill('Reserva revisada')
  await save().click()
  await page.getByRole('status').filter({ hasText: 'Carteira atualizada com sucesso.' }).waitFor()
  await page.getByRole('button', { name: 'Editar Reserva revisada', exact: true }).waitFor()
  console.log('PASS supported fields persist after refresh and edit; presentation fields do not pretend to persist')

  const primary = (await api('/wallets')).wallets.find((wallet) => wallet.isDefault)
  const secondary = page.locator('.wallets-group-secondary')
  const beforeCopy = writes.length
  await secondary.getByRole('checkbox', { name: 'Igual à carteira principal', exact: true }).check()
  await secondary.getByRole('button', { name: 'Adicionar', exact: true }).click()
  assert.equal(writes.length, beforeCopy, 'Copying a draft must not create or update a wallet')
  assert.equal(await textbox('Apelido da carteira').inputValue(), '')
  assert.equal(await textbox('Endereço da carteira').inputValue(), primary.address)
  await page.getByRole('combobox', { name: 'Rede da carteira', exact: true }).getByText('Ethereum', { exact: true }).waitFor()
  await page.getByRole('combobox', { name: 'Tipo da carteira', exact: true }).getByText('Secundaria', { exact: true }).waitFor()
  assert.equal((await api('/wallets')).wallets.length, 2)
  await secondary.getByRole('checkbox', { name: 'Igual à carteira principal', exact: true }).uncheck()
  await secondary.getByRole('button', { name: 'Adicionar', exact: true }).click()
  assert.equal(await textbox('Endereço da carteira').inputValue(), '')
  console.log('PASS secondary checkbox and Add only prepare a draft; no implicit duplicate or synchronization')

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1080 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}px`)
    assert.equal(await page.locator('main form input, main form button').evaluateAll((controls) => controls.every((control) => {
      const bounds = control.getBoundingClientRect()
      return bounds.left >= 0 && bounds.right <= innerWidth + 1
    })), true, `Clipped form controls at ${width}px`)
  }
  await page.setViewportSize({ width: 390, height: 1000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: '/tmp/kurio-wallet-fields-mobile.png', fullPage: true })
  assert.deepEqual(errors.filter((message) => !message.includes('Failed to update a ServiceWorker')), [])
  console.log('PASS reflow 320–1440px; no application errors')
} finally {
  await browser.close()
}
