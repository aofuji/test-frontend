import { mkdir, readFile } from 'node:fs/promises'
import { preview } from 'vite'
import { runNode } from './run-command.mjs'

await mkdir('reports/lighthouse', { recursive: true })
const server = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false } })
try {
  const url = `${server.resolvedUrls.local[0]}?scenario=normal`
  console.log(`Lighthouse mobile, build de produção com MSW: ${url}`)
  const code = await runNode([
    'node_modules/lighthouse/cli/index.js', url,
    '--form-factor=mobile', '--throttling-method=simulate',
    '--output=html', '--output=json', '--output-path=reports/lighthouse/home',
    '--chrome-flags=--headless', '--quiet',
  ])
  process.exitCode = code
  if (code === 0) {
    const report = JSON.parse(await readFile('reports/lighthouse/home.report.json', 'utf8'))
    if (report.runtimeError) throw new Error(report.runtimeError.message)
    for (const category of Object.values(report.categories)) console.log(`${category.title}: ${Math.round(category.score * 100)}`)
    console.log('Relatórios: reports/lighthouse/home.report.html e home.report.json')
  }
} finally {
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
}
