import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const base = process.env.PROFILE_TEST_URL || 'http://127.0.0.1:5173'
const page = await browser.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

async function post(path, body = {}) {
  return page.evaluate(async ({ path, body }) => {
    const response = await fetch(`/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { status: response.status, data: await response.json() }
  }, { path, body })
}

async function reset() {
  await page.goto(base)
  await page.getByRole('navigation', { name: 'Navegação principal' }).waitFor()
  assert.equal((await post('/__mock/reset-auth')).status, 200)
  await page.reload()
}

async function login(email, password) {
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname !== '/login')
  await page.locator('header').getByRole('link', { name: /Ada|Bruno/ }).waitFor()
}

async function logout() {
  await page.goto(`${base}/profile`)
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.waitForURL(base + '/')
}

async function overflowCheck() {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `horizontal overflow at ${width}px on ${page.url()}`)
  }
}

async function prepareGallery() {
  // The API currently repeats one asset, which the UI correctly deduplicates.
  // Exercise multi-image selection using two existing local assets only in this test.
  await page.evaluate(async () => {
    const payload = await (await fetch('/api/nfts/aurora-001')).json()
    payload.images[1].src = '/images/nfts/nft2.png'
    const { worker } = await import('/src/mocks/browser.ts')
    const source = await (await fetch('/src/mocks/handlers.ts')).text()
    const { http, HttpResponse } = await import(source.match(/from ["']([^"']*\/msw\.js[^"']*)/)[1])
    worker.use(http.get('/api/nfts/aurora-001', () => HttpResponse.json(payload)))
    const { queryClient } = await import('/src/api/queryClient.ts')
    await queryClient.invalidateQueries({ queryKey: ['nfts'] })
  })
}

try {
  await reset()
  await page.goto(`${base}/nft/aurora-001`)
  const favorite = page.getByRole('button', { name: /Adicionar Aurora Chain #001 aos favoritos/ })
  await favorite.click()
  await page.waitForURL(/\/login\?redirect=/)
  assert.equal(new URL(page.url()).searchParams.get('redirect'), '/nft/aurora-001?scenario=normal')
  await login('ada@example.com', 'collector123')
  await page.waitForURL((url) => url.pathname === '/nft/aurora-001')
  const removeFavorite = page.getByRole('button', { name: /Remover Aurora Chain #001 dos favoritos/ })
  await removeFavorite.waitFor()
  assert.equal(await removeFavorite.getAttribute('aria-pressed'), 'true')
  await page.reload()
  await removeFavorite.waitFor()
  console.log('PASS guest favorite survives login intent and refresh')

  await page.goto(`${base}/nft/aurora-001`)
  await page.getByRole('button', { name: /Remover Aurora Chain #001 dos favoritos/ }).waitFor()
  await post('/__mock/favorites/fail-next', { type: 'error' })
  const removeOnCard = page.getByRole('button', { name: /Remover Aurora Chain #001 dos favoritos/ })
  await removeOnCard.click()
  assert.equal(await page.getByRole('button', { name: /Adicionar Aurora Chain #001 aos favoritos/ }).getAttribute('aria-pressed'), 'false', 'optimistic update was not visible')
  await page.getByRole('alert').filter({ hasText: 'Erro simulado' }).waitFor()
  await removeOnCard.waitFor()
  assert.equal(await removeOnCard.getAttribute('aria-pressed'), 'true', 'failed mutation did not roll back')
  await page.getByRole('alert').getByRole('button', { name: 'Tentar novamente' }).click()
  await removeOnCard.click()
  await page.getByRole('button', { name: /Adicionar Aurora Chain #001 aos favoritos/ }).waitFor()
  console.log('PASS favorite mutation rolls back on HTTP failure and recovers')

  await page.goto(`${base}/profile`)
  await page.getByRole('heading', { name: 'Perfil do colecionador' }).waitFor()
  await overflowCheck()
  await page.getByLabel('Nome de exibição', { exact: true }).fill('A')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByText('Informe um nome com pelo menos 2 caracteres.').waitFor()
  await page.getByLabel('Nome de exibição', { exact: true }).fill('Ada Revisada')
  await page.getByLabel('E-mail', { exact: true }).fill('bruno@example.com')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Este e-mail ja esta em uso' }).waitFor()
  await page.getByLabel('E-mail', { exact: true }).fill('ada.revisada@example.com')
  await page.getByText('Informações adicionais', { exact: true }).click()
  await page.getByLabel('Bio').fill('Nova bio de colecionadora.')
  await page.getByLabel('Pixel art').check()
  await page.locator('#profile-avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQxAAAAABJRU5ErkJggg==', 'base64') })
  await page.getByRole('img', { name: 'Avatar de Ada Revisada' }).waitFor()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Perfil atualizado com sucesso' }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: 'Perfil do colecionador' }).waitFor()
  assert.equal(await page.getByLabel('Nome de exibição', { exact: true }).inputValue(), 'Ada Revisada')
  assert.equal(await page.getByLabel('E-mail', { exact: true }).inputValue(), 'ada.revisada@example.com')
  await page.getByText('Informações adicionais', { exact: true }).click()
  assert.equal(await page.getByLabel('Bio').inputValue(), 'Nova bio de colecionadora.')
  assert.equal(await page.getByLabel('Pixel art').isChecked(), true)
  await page.getByRole('img', { name: 'Avatar de Ada Revisada' }).waitFor()
  console.log('PASS profile validation, API conflict, avatar and refresh persistence')

  assert.equal((await post('/__mock/profile/read-failure', { enabled: true })).status, 200)
  await page.reload()
  await page.getByRole('heading', { name: 'Nao foi possivel carregar o perfil' }).waitFor()
  await page.getByRole('alert').filter({ hasText: 'Erro simulado ao consultar perfil' }).waitFor()
  assert.equal((await post('/__mock/profile/read-failure', { enabled: false })).status, 200)
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByRole('heading', { name: 'Perfil do colecionador' }).waitFor()
  console.log('PASS profile read error is visible and retry recovers')

  await page.getByLabel('Nova senha', { exact: true }).fill('new-secret-123')
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('new-secret-123')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByText('Informe a senha atual.').waitFor()
  await page.getByLabel('Senha atual', { exact: true }).fill('wrong-password')
  await page.getByLabel('Nova senha', { exact: true }).fill('new-secret-123')
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('new-secret-123')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Senha atual incorreta' }).first().waitFor()
  await page.getByLabel('Senha atual', { exact: true }).fill('collector123')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Senha alterada com sucesso' }).waitFor()
  await logout()
  await page.goto(`${base}/login`)
  await page.getByLabel('E-mail', { exact: true }).fill('ada.revisada@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('collector123')
  await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.getByText('E-mail ou senha invalidos.').waitFor()
  await login('ada.revisada@example.com', 'new-secret-123')
  console.log('PASS password change rejects old credentials and accepts new credentials')

  await page.goto(`${base}/nft/aurora-001`)
  await page.getByRole('button', { name: /Adicionar Aurora Chain #001 aos favoritos/ }).click()
  await page.getByRole('button', { name: /Remover Aurora Chain #001 dos favoritos/ }).waitFor()
  await logout()
  await page.goto(`${base}/login`)
  await login('bruno@example.com', 'vault1234')
  await page.goto(`${base}/nft/aurora-001`)
  await page.getByRole('button', { name: /Adicionar Aurora Chain #001 aos favoritos/ }).waitFor()
  await page.goto(`${base}/profile`)
  await page.getByRole('heading', { name: 'Perfil do colecionador' }).waitFor()
  assert.equal(await page.getByLabel('Nome de exibição', { exact: true }).inputValue(), 'Bruno Vault')
  await logout()
  await page.goto(`${base}/login`)
  await login('ada.revisada@example.com', 'new-secret-123')
  await page.goto(`${base}/nft/aurora-001`)
  await page.getByRole('button', { name: /Remover Aurora Chain #001 dos favoritos/ }).waitFor()
  console.log('PASS profile and favorites remain isolated between users')

  await page.goto(`${base}/profile`)
  await page.getByRole('heading', { name: 'Perfil do colecionador' }).waitFor()
  await page.evaluate(() => {
    const key = 'nft-marketplace.auth-state.v1'
    const state = JSON.parse(localStorage.getItem(key))
    state.session.expiresAt = '2000-01-01T00:00:00.000Z'
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload()
  await page.waitForURL(/\/login\?redirect=/)
  assert.equal(new URL(page.url()).searchParams.get('redirect'), '/profile')
  await login('ada.revisada@example.com', 'new-secret-123')
  await page.getByRole('heading', { name: 'Perfil do colecionador' }).waitFor()
  console.log('PASS expired session recovers protected profile route')

  await page.goto(`${base}/nft/aurora-001`)
  await page.getByLabel('Quantidade', { exact: true }).fill('2')
  await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/, exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'NFT adicionado' }).waitFor()
  const cart = await page.evaluate(async () => (await (await fetch('/api/cart')).json()).cart)
  assert.equal(cart.items.find((item) => item.nftId === 'aurora-001').quantity, 2)
  await page.getByLabel('Quantidade', { exact: true }).fill('6')
  assert.equal(await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/, exact: true }).isDisabled(), true)
  await overflowCheck()
  console.log('PASS NFT detail quantity respects edition stock')

  await page.goto(`${base}/?q=aurora&category=art&chain=ethereum&availability=available&sort=price-asc&page=1&scenario=normal`)
  await page.getByText('Aurora Chain #001').last().waitFor()
  if (await page.getByRole('button', { name: 'Pesquisar no mercado', exact: true }).getAttribute('aria-expanded') !== 'true') await page.getByRole('button', { name: 'Pesquisar no mercado', exact: true }).click()
  assert.equal(await page.getByRole('searchbox', { name: 'Buscar NFTs pelo nome' }).inputValue(), 'aurora')
  assert.equal(await page.getByText(/NFTs encontrados/).textContent(), '1 NFTs encontrados')
  await page.getByRole('combobox', { name: 'Ordenar por', exact: true }).click()
  await page.getByRole('option', { name: 'Maior preço' }).click()
  await page.waitForURL((url) => url.searchParams.get('sort') === 'price-desc')
  await page.goBack()
  await page.waitForURL((url) => url.searchParams.get('sort') === 'price-asc')
  if (await page.getByRole('button', { name: 'Pesquisar no mercado', exact: true }).getAttribute('aria-expanded') !== 'true') await page.getByRole('button', { name: 'Pesquisar no mercado', exact: true }).click()
  assert.equal(await page.getByRole('searchbox', { name: 'Buscar NFTs pelo nome' }).inputValue(), 'aurora')
  await page.reload()
  await page.getByText('Aurora Chain #001').last().waitFor()
  await overflowCheck()
  console.log('PASS combined catalog URL filters survive history, refresh and mobile width')

  await page.goto(`${base}/?scenario=normal`)
  const pagination = page.getByRole('navigation', { name: 'Paginação do catálogo' })
  await pagination.getByRole('button', { name: 'Próxima página' }).click()
  await page.waitForURL((url) => url.searchParams.get('page') === '2')
  await pagination.getByRole('button', { name: 'Ir para a página 2', exact: true }).and(page.locator('[aria-current="page"]')).waitFor()
  assert.equal(await pagination.getByRole('button', { name: 'Ir para a página 2', exact: true }).getAttribute('aria-current'), 'page')
  await page.goBack()
  await page.waitForURL((url) => url.searchParams.get('page') === '1')
  await pagination.getByRole('button', { name: 'Ir para a página 1', exact: true }).and(page.locator('[aria-current="page"]')).waitFor()
  assert.equal(await pagination.getByRole('button', { name: 'Ir para a página 1', exact: true }).getAttribute('aria-current'), 'page')
  await pagination.getByRole('button', { name: 'Próxima página' }).click()
  await page.waitForURL((url) => url.searchParams.get('page') === '2')
  await page.getByRole('complementary', { name: 'Filtros do catálogo' }).getByRole('button', { name: /^Arte digital/ }).click()
  await page.waitForURL((url) => url.searchParams.get('page') === '1' && url.searchParams.get('category') === 'art')
  console.log('PASS pagination, history and filter reset are reflected in URL')

  await page.goto(`${base}/nft/does-not-exist`)
  await page.getByRole('heading', { name: 'Nao foi possivel carregar o NFT' }).waitFor()
  await page.getByText('NFT nao encontrado.').waitFor()
  console.log('PASS nonexistent NFT direct route has visible error and retry')

  await page.goto(`${base}/?scenario=empty`)
  await page.getByText('Nenhum NFT em destaque disponível.', { exact: true }).waitFor()
  await page.goto(`${base}/?scenario=error`)
  await page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o destaque.' }).waitFor()
  await page.goto(`${base}/?scenario=normal`)
  await page.getByRole('heading', { name: 'NFT em destaque' }).waitFor()
  await page.getByRole('link', { name: /^Explorar NFT em destaque:/ }).waitFor()
  console.log('PASS featured NFTs have empty, error and recovered states')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${base}/?scenario=latency`)
  const skeleton = page.getByRole('region', { name: 'NFT em destaque', exact: true }).locator('[data-slot="skeleton"]').first()
  await skeleton.waitFor()
  const animation = await skeleton.evaluate((element) => getComputedStyle(element).animationDuration)
  assert.ok(Number.parseFloat(animation) <= 0.001, `reduced-motion animation duration: ${animation}`)
  await page.getByText(/NFTs encontrados/).waitFor()
  console.log('PASS loading skeleton shimmer respects reduced motion')

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(`${base}/nft/aurora-001`)
  await page.getByRole('heading', { name: 'Aurora Chain #001', exact: true }).waitFor()
  await prepareGallery()
  const mainImage = page.locator('.nft-main-image').getByRole('img', { name: /Macaco marrom com oculos verdes/ })
  await mainImage.waitFor()
  const mainThumb = page.getByRole('button', { name: 'Mostrar vista principal de Aurora Chain #001' })
  const detailThumb = page.getByRole('button', { name: 'Mostrar detalhe de Aurora Chain #001' })
  await mainThumb.focus()
  await page.keyboard.press('Tab')
  assert.equal(await detailThumb.evaluate((element) => element === document.activeElement), true)
  const focusVisible = await detailThumb.evaluate((element) => {
    const style = getComputedStyle(element)
    return style.boxShadow !== 'none' || (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0)
  })
  assert.equal(focusVisible, true, 'keyboard focus is not visible')
  await page.keyboard.press('Enter')
  assert.equal(await detailThumb.getAttribute('aria-pressed'), 'true')
  await page.locator('.nft-main-image').getByRole('img', { name: /Retrato aproximado do macaco marrom/ }).waitFor()
  await overflowCheck()
  console.log('PASS gallery image selection, keyboard traversal, focus ring and responsive widths')

  await page.reload()
  await page.getByRole('heading', { name: 'Aurora Chain #001', exact: true }).waitFor()
  await prepareGallery()
  await page.getByRole('button', { name: 'Mostrar detalhe de Aurora Chain #001' }).locator('img').evaluate((image) => { image.src = 'data:image/png;base64,broken' })
  await page.getByRole('button', { name: 'Mostrar detalhe de Aurora Chain #001' }).getByText('Sem imagem').waitFor()
  await page.getByRole('button', { name: 'Mostrar detalhe de Aurora Chain #001' }).click()
  await page.getByRole('status').filter({ hasText: 'Imagem indisponivel para este NFT' }).waitFor()
  console.log('PASS gallery provides accessible fallback for an unavailable asset')

  await page.goto(`${base}/`)
  const featuredLink = page.getByRole('link', { name: /^Explorar NFT em destaque:/ })
  await featuredLink.waitFor()
  const featuredId = new URL(await featuredLink.getAttribute('href'), base).pathname.split('/').pop()
  const featured = await page.evaluate(async (id) => await (await fetch(`/api/nfts/${id}`)).json(), featuredId)
  const featuredCard = page.locator('#catalogo article').filter({ has: page.getByRole('link', { name: `Abrir ${featured.name}`, exact: true }) })
  await featuredCard.getByText(`${featured.priceEth} ETH`, { exact: true }).waitFor()
  assert.equal((await post('/__mock/realtime/nft', { nftId: featuredId, priceEth: '1.44', available: false })).status, 200)
  await featuredCard.getByText('1.44 ETH', { exact: true }).waitFor()
  await featuredCard.getByText(/Vendido/).waitFor()
  await featuredLink.click()
  await page.waitForURL((url) => url.pathname === `/nft/${featuredId}`)
  assert.equal(await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).isDisabled(), true)
  console.log('PASS featured price and availability follow REST after Socket.IO update')

  // A 195 CSS-pixel viewport exercises the reflow available at 200% browser zoom on 390 physical pixels.
  await page.setViewportSize({ width: 195, height: 900 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'horizontal overflow at 200% zoom equivalent')
  assert.equal(await page.locator('main button, main input').evaluateAll((controls) => controls.every((control) => {
    const bounds = control.getBoundingClientRect()
    return bounds.left >= 0 && bounds.right <= innerWidth + 1
  })), true, 'interactive controls are clipped at 200% zoom equivalent')
  await page.getByRole('heading', { name: featured.name, exact: true }).waitFor()
  const bodyContrast = await page.evaluate(() => {
    const style = getComputedStyle(document.body)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D unavailable')
    const luminance = (color) => {
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      const linear = [r, g, b].map((channel) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4 })
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
    }
    const foreground = luminance(style.color)
    const background = luminance(style.backgroundColor)
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
  })
  assert.ok(bodyContrast >= 4.5, `body text contrast ratio: ${bodyContrast}`)
  console.log(`PASS 200% zoom keeps content reachable; body text contrast ${bodyContrast.toFixed(2)}:1`)

  const workerUpdateErrors = errors.filter((message) => message.includes('Failed to update a ServiceWorker') && message.includes('/mockServiceWorker.js'))
  assert.deepEqual(errors.filter((message) => !workerUpdateErrors.includes(message)), [])
  if (workerUpdateErrors.length) console.log(`NOTE ${workerUpdateErrors.length} nonfatal MSW registration.update warning(s) during full-page navigation`)
} finally {
  await browser.close()
}
