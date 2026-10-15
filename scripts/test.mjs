import { readdir } from 'node:fs/promises'
import { createServer } from 'vite'
import { runNode } from './run-command.mjs'

const filters = process.argv.slice(2)
const files = (await readdir('tests')).filter((file) => /(?:\.test|-browser)\.mjs$/.test(file))
  .filter((file) => !filters.length || filters.some((filter) => file.includes(filter))).sort()
if (!files.length) throw new Error('Nenhuma suíte encontrada. Informe parte do nome de um arquivo em tests/.')

// All existing browser suites share one isolated, automatically allocated local server.
process.env.VITE_ENABLE_MOCKS = 'true'
let server
const failed = []
try {
  const browserTests = files.some((file) => file.endsWith('-browser.mjs'))
  let base = process.env.TEST_BASE_URL
  if (browserTests && !base) {
    server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: true, open: false, watch: { ignored: ['**/reports/**'] } } })
    await server.listen()
    base = server.resolvedUrls.local[0].replace(/\/$/, '')
    console.log(`Playwright + MSW: ${base}`)
  }
  const env = { ...process.env }
  for (const prefix of ['AUTH', 'CART', 'CATALOG', 'CHECKOUT', 'HOME', 'NFT', 'PROFILE', 'REALTIME', 'WALLETS']) {
    if (base) env[`${prefix}_TEST_URL`] = base
  }
  for (const file of files) {
    console.log(`\nRunning tests/${file}`)
    const code = await runNode([`tests/${file}`], { env })
    if (code !== 0) failed.push(file)
  }
} finally {
  await server?.close()
}
console.log(`\n${files.length - failed.length}/${files.length} suítes passaram.`)
if (failed.length) {
  console.error(`Falharam: ${failed.join(', ')}`)
  process.exitCode = 1
}
