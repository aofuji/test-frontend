import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
const base = process.env.CATALOG_TEST_URL || 'http://127.0.0.1:5173'
const cards = page.locator('#catalogo article')
const pagination = page.getByRole('navigation', { name: 'Paginação do catálogo' })

async function expectItems(items) {
  await page.waitForFunction((names) => JSON.stringify([...document.querySelectorAll('#catalogo article h3')].map((element) => element.textContent)) === JSON.stringify(names), items.map((nft) => nft.name))
  assert.deepEqual(await cards.locator('h3').allTextContents(), items.map((nft) => nft.name))
  const links = await cards.locator('h3 a').evaluateAll((elements) => elements.map((element) => element.getAttribute('href')))
  assert.equal(new Set(links).size, items.length, 'NFTs must not be duplicated')
}

try {
  await page.goto(`${base}/?sort=newest&scenario=normal`)
  await cards.first().waitFor()
  const inventory = await page.evaluate(async () => (await (await fetch('/api/nfts?pageSize=100&sort=newest')).json()).items)
  assert(inventory.length > 9, 'The fixture must exercise more than one page')
  const totalPages = Math.ceil(inventory.length / 9)
  await expectItems(inventory.slice(0, 9))
  assert.equal(await pagination.getByRole('button', { name: /Ir para a página/ }).count(), totalPages)
  const positions = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().y))
  assert.equal(new Set(positions).size, 3, 'Desktop must display three rows')
  assert.equal(positions[0], positions[2], 'Desktop must display three columns')
  assert.equal(await page.locator('#catalogo aside #featured-heading').count(), 1, 'Promotion stays in the sidebar')

  await pagination.getByRole('button', { name: 'Próxima página', exact: true }).click()
  await page.waitForURL((url) => url.searchParams.get('page') === '2')
  await expectItems(inventory.slice(9, 18))
  await page.reload()
  await expectItems(inventory.slice(9, 18))
  await page.goBack()
  await page.waitForURL((url) => url.searchParams.get('page') !== '2')
  await expectItems(inventory.slice(0, 9))
  await page.goForward()
  await expectItems(inventory.slice(9, 18))

  await page.getByRole('complementary', { name: 'Filtros do catálogo' }).getByRole('button', { name: /^Arte digital/ }).click()
  await page.waitForURL((url) => url.searchParams.get('category') === 'art' && url.searchParams.get('page') === '1')
  await expectItems(inventory.filter((nft) => nft.category === 'art'))
  assert.equal(await pagination.count(), 0)

  const priced = inventory.filter((nft) => Number(nft.priceEth) <= 2)
  await page.goto(`${base}/?maxPrice=2&sort=newest&page=1&scenario=normal`)
  await expectItems(priced.slice(0, 9))
  assert.equal(await pagination.getByRole('button', { name: /Ir para a página/ }).count(), Math.ceil(priced.length / 9))
  await pagination.getByRole('button', { name: 'Próxima página', exact: true }).click()
  await page.waitForURL((url) => url.searchParams.get('page') === '2')
  await expectItems(priced.slice(9, 18))
  assert.equal(new URL(page.url()).searchParams.get('maxPrice'), '2')

  await page.getByRole('button', { name: 'Pesquisar no mercado' }).click()
  const search = page.getByRole('searchbox', { name: 'Buscar NFTs pelo nome' })
  await search.fill('Neon')
  await search.press('Enter')
  await page.waitForURL((url) => url.searchParams.get('q') === 'Neon' && url.searchParams.get('page') === '1')
  assert.equal(new URL(page.url()).searchParams.get('maxPrice'), '2')
  await expectItems(priced.filter((nft) => nft.name.toLowerCase().includes('neon')))

  await page.goto(base)
  await expectItems(inventory.slice(0, 9))
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`)
    const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox()
    assert.equal(first.y, second.y, 'Mobile must retain two columns')
    assert(second.x > first.x)
  }
  console.log('PASS nine-item pagination, three desktop rows, unique NFTs, page totals, refresh/history, filter reset, price filtering, header search and mobile layout')
} finally {
  await browser.close()
}
