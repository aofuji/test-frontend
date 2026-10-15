import { spawn } from 'node:child_process'

export function runNode(args, { env = process.env, timeout = 180_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit' })
    let interrupted = false
    const interrupt = () => { interrupted = true; child.kill('SIGTERM') }
    process.once('SIGINT', interrupt)
    process.once('SIGTERM', interrupt)
    const timer = setTimeout(() => {
      console.error(`Timeout: node ${args.join(' ')}`)
      child.kill('SIGKILL')
    }, timeout)
    function cleanup() {
      clearTimeout(timer)
      process.removeListener('SIGINT', interrupt)
      process.removeListener('SIGTERM', interrupt)
    }
    child.once('error', (error) => { cleanup(); reject(error) })
    child.once('exit', (code) => {
      cleanup()
      if (interrupted) reject(new Error('Execução interrompida.'))
      else resolve(code ?? 1)
    })
  })
}
