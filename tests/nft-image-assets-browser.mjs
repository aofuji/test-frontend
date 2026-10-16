import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { build, createServer, preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const directory = await mkdtemp(join(tmpdir(), 'kurio-nft-assets-'))
const output = join(directory, 'dist')
let server, browser, modules
const report = { checks: [], phases: [], pixels: [] }
try {
  modules = await createServer({ configFile: false, cacheDir: join(directory, 'cache'), resolve: { alias: { '@': `${process.cwd()}/src` } }, server: { middlewareMode: true, ws: false, watch: null } })
  const { getNftImageSrc, restoreNftImageFallback } = await modules.ssrLoadModule('/src/features/nft/model/nft-image-variants.ts')
  const { getNftImage } = await modules.ssrLoadModule('/src/features/nft/model/nft-image.ts')
  const hashes = ['fdf05ca56760689ca83144bb968833ee10c6990567f1d40bc1fb18dc1b812d3f', 'f89056632b86a0935750358d095b0ace424cb049c0f821316f9e81fd2e628545', '18a325b4ea566e3aaa6d982b3ce3de3ccd12468dfce117abac6e6e7bcfef64cc', '13f167d327bc0ba2204968935a3ae536e4036c18528051f5d96b8a62b9f05710']
  const payload = []
  for (let n = 1; n <= 4; n++) {
    const original = `/images/nfts/nft${n}.png`
    const variant = getNftImageSrc(original)
    assert.ok(variant.endsWith(`/nft${n}.lossless.webp`))
    const image = { src: new URL(variant, 'https://kurio.test/').href, ownerDocument: { baseURI: 'https://kurio.test/' } }
    assert.equal(restoreNftImageFallback(image, original), true)
    assert.equal(image.src, original)
    assert.equal(restoreNftImageFallback(image, original), false, 'PNG failure must not loop')
    const png = await readFile(`public${original}`)
    assert.equal(createHash('sha256').update(png).digest('hex'), hashes[n - 1], 'original PNG must remain unchanged')
    const webp = await readFile(`src/assets/nfts/nft${n}.lossless.webp`)
    assert.equal(webp.toString('ascii', 0, 4), 'RIFF')
    assert.equal(webp.toString('ascii', 8, 12), 'WEBP')
    const chunks = []
    for (let offset = 12; offset + 8 <= webp.length;) {
      chunks.push(webp.toString('ascii', offset, offset + 4))
      const bytes = webp.readUInt32LE(offset + 4)
      offset += 8 + bytes + bytes % 2
      assert.ok(offset <= webp.length)
    }
    assert.ok(chunks.includes('VP8L'), 'lossless WebP bitstream required')
    assert.equal(chunks.includes('VP8 '), false, 'lossy WebP is prohibited')
    payload.push({ n, png: png.toString('base64'), webp: webp.toString('base64') })
  }
  for (const original of [undefined, '', 'toString', '/unknown.png', '/nft-art/art-detail.svg', '/images/nfts/nft1.png?revision=2', 'https://external.test/images/nfts/nft1.png', 'data:image/png;base64,AA==']) {
    assert.equal(getNftImageSrc(original), original)
    assert.equal(restoreNftImageFallback({ src: 'https://kurio.test/unknown.png', ownerDocument: { baseURI: 'https://kurio.test/' } }, original), false)
  }
  assert.equal(getNftImage('aurora-001'), '/images/nfts/nft1.png', 'cart/checkout resolver contract is unchanged')
  assert.equal(getNftImage('unknown'), '/images/nfts/nft1.png')
  report.checks.push('four mappings, unknown/external URLs, PNG identity, lossless bitstreams and bounded fallback')
  await modules.close(); modules = undefined
  process.env.NODE_ENV = 'production'
  await build({ logLevel: 'silent', build: { outDir: output, emptyOutDir: true } })
  let fault
  const traffic = []
  server = await preview({ build: { outDir: output }, preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false }, plugins: [{
    name: 'nft-asset-fault-fixture',
    configurePreviewServer(previewServer) {
      previewServer.middlewares.use((request, response, next) => {
        const path = new URL(request.url, 'http://local').pathname
        if (fault && (/\/nft1\.lossless-[^/]+\.webp$/.test(path) || (fault === 'both' && path === '/images/nfts/nft1.png'))) {
          response.statusCode = 404; response.end('Missing test asset'); return
        }
        next()
      })
    },
  }] })
  server.httpServer.prependListener('request', (request, response) => {
    const row = { path: new URL(request.url, 'http://local').pathname, bytes: 0 }
    const write = response.write, end = response.end
    const count = (chunk, encoding) => { if (chunk != null) row.bytes += Buffer.isBuffer(chunk) || ArrayBuffer.isView(chunk) ? chunk.byteLength : Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding : undefined) }
    response.write = function (chunk, ...args) { count(chunk, args[0]); return write.call(this, chunk, ...args) }
    response.end = function (chunk, ...args) { count(chunk, args[0]); return end.call(this, chunk, ...args) }
    response.once('finish', () => { row.status = response.statusCode; traffic.push(row) })
  })
  const base = server.resolvedUrls.local[0]
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  const isImage = row => /\.(png|webp)$/.test(row.path)
  async function healthy(page) {
    await page.waitForFunction(() => [...document.images].filter(image => image.getBoundingClientRect().width > 0).every(image => image.complete && image.naturalWidth > 0))
  }
  async function home(page) {
    await page.locator('#catalogo article').first().waitFor()
    await page.getByText('Atualizacoes em tempo real conectadas.', { exact: true }).waitFor()
    await page.waitForFunction(() => [...document.querySelectorAll('#catalogo .home-catalog-results img')].every(image => image.complete && image.naturalWidth > 0))
  }
  function phase(name, start) { const images = traffic.slice(start).filter(isImage); report.phases.push({ name, images }); return images }
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage(); page.setDefaultTimeout(15000)
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    let start = traffic.length
    await page.goto(base); await home(page)
    const images = phase(`${width}-home-cold`, start)
    assert.equal(images.some(row => row.path.endsWith('.png')), false)
    assert.equal(new Set(images.map(row => row.path)).size, 4)
    assert.equal(images.reduce((n, row) => n + row.bytes, 0), 435634)
    assert.equal(await page.locator('.home-hero-art img').getAttribute('alt'), 'Macaco marrom com oculos verdes e jaqueta universitaria verde, representando Aurora Chain #001')
    assert.equal(await page.locator('#catalogo .home-catalog-results img[loading="lazy"]').count(), 9)
    assert.equal(await page.locator('.home-hero-secondary').getAttribute('aria-hidden'), 'true')
    start = traffic.length
    await page.reload(); await home(page)
    assert.equal(phase(`${width}-home-warm`, start).reduce((n, row) => n + row.bytes, 0), 0)
    start = traffic.length
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await healthy(page)
    assert.equal(phase(`${width}-scroll`, start).reduce((n, row) => n + row.bytes, 0), 0)
    assert.equal(await page.locator('[aria-labelledby="diario-heading"] img[loading="lazy"]').count(), 4)
    assert.equal(await page.locator('[aria-label="Conteúdo complementar"] img').count(), 2)
    start = traffic.length
    await page.locator('a[href^="/nft/aurora-001"]').first().click()
    await page.locator('.nft-main-image img').waitFor(); await page.locator('#nft-collection-items').waitFor(); await healthy(page)
    const detailImages = phase(`${width}-detail`, start)
    assert.equal(detailImages.some(row => row.path.endsWith('.png')), false)
    assert.equal(detailImages.reduce((n, row) => n + row.bytes, 0), 0)
    assert.match(await page.locator('.nft-main-image img').getAttribute('src'), /\/nft1\.lossless-[^/]+\.webp$/)
    for (const src of await page.locator('.nft-gallery img, #nft-collection-items img').evaluateAll(images => images.map(image => image.getAttribute('src')))) assert.match(src, /\.webp$/)
    await page.reload(); await page.locator('.nft-main-image img').waitFor(); await healthy(page)
    const metadata = await page.evaluate(async () => {
      const response = await fetch('/api/nfts/aurora-001')
      if (!response.ok) throw new Error('Unable to inspect unchanged image metadata')
      return response.json()
    })
    assert.equal(metadata.images[0].src, '/images/nfts/nft1.png')
    assert.equal(metadata.images[0].label, 'Vista principal')
    assert.deepEqual(errors, [])
    await context.close()
  }
  for (const mode of ['webp', 'both']) {
    fault = mode
    const context = await browser.newContext(); const page = await context.newPage();page.setDefaultTimeout(15000)
    const start = traffic.length
    await page.goto(new URL('/nft/aurora-001', base).href)
    if (mode === 'webp') {
      await page.locator('.nft-main-image img[src="/images/nfts/nft1.png"]').waitFor(); await healthy(page)
      assert.equal(await page.locator('.nft-main-image img').getAttribute('alt'), 'Macaco marrom com oculos verdes e jaqueta universitaria verde, representando Aurora Chain #001')
    } else {
      await page.getByText('Imagem indisponivel para este NFT.', { exact: true }).waitFor()
      assert.equal(await page.locator('.nft-main-image img').count(), 0)
    }
    const count = traffic.length
    await page.waitForTimeout(300)
    assert.equal(traffic.length, count, 'no repeated fallback requests after settling')
    assert.ok(traffic.slice(start).some(row => /\.webp$/.test(row.path) && row.status === 404))
    assert.ok(traffic.slice(start).some(row => row.path === '/images/nfts/nft1.png'))
    report.checks.push(`${mode}: asset failure uses bounded original PNG fallback and existing gallery error`)
    await context.close()
  }
  fault = undefined
  // Compare codec output in a separate document, never downloading the PNGs in the app's normal path.
  const context = await browser.newContext(); const page = await context.newPage()
  for (const item of payload) {
    const result = await page.evaluate(async item => {
      const decode = (base64, type) => createImageBitmap(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type }))
      const original = await decode(item.png, 'image/png'), variant = await decode(item.webp, 'image/webp')
      const read = (image, background) => {
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (background) { ctx.fillStyle = background;ctx.fillRect(0, 0, canvas.width, canvas.height) }
        ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, canvas.width, canvas.height).data
      }
      const reference = read(original), pixels = read(variant)
      let opaqueDifferences = 0, alphaDifferences = 0
      for (let i = 0; i < reference.length; i++) if (reference[i] !== pixels[i]) {
        if (i % 4 === 3) alphaDifferences++
        else if (reference[i - i % 4 + 3] === 255) opaqueDifferences++
      }
      const composed = []
      for (const background of ['#281914', '#ffffff']) {
        const a = read(original, background), b = read(variant, background); let maximum = 0
        for (let i = 0; i < a.length; i++) maximum = Math.max(maximum, Math.abs(a[i] - b[i]))
        composed.push(maximum)
      }
      const result = { dimensions: [original.width, original.height, variant.width, variant.height], opaqueDifferences, alphaDifferences, composed }
      original.close();variant.close();return result
    }, item)
    const size = item.n === 1 ? 450 : 250
    assert.deepEqual(result.dimensions, [size, size, size, size])
    assert.equal(result.opaqueDifferences, 0); assert.equal(result.alphaDifferences, 0)
    assert.ok(result.composed.every(maximum => maximum <= 1), 'only native alpha rounding within one 8-bit level is accepted')
    report.pixels.push({ nft: item.n, ...result })
  }
  await context.close()
  await writeFile(process.env.NFT_ASSETS_REPORT || join(tmpdir(), 'kurio-nft-assets-last.json'), JSON.stringify(report, null, 2))
  console.log('PASS NFT assets: source mapping, external/unknown URLs, unchanged PNGs, lossless streams and native alpha fidelity')
  console.log('PASS production desktop/mobile: four WebPs / 435634 bytes, cache, scroll, details, recommendations, alt/loading and bounded PNG/error fallback')
} finally {
  await browser?.close(); await modules?.close()
  if (server) await new Promise(resolve => server.httpServer.close(resolve))
  await rm(directory, { recursive: true, force: true })
}
