import { app } from 'electron'
import path from 'path'
import { spawn, execSync, type ChildProcess } from 'child_process'
import net from 'net'

export const PORT = Number(process.env.ARGUS_PORT) || 9845
export const DEV_URL = `http://localhost:${PORT}`
export const isDev = !app.isPackaged

let nextProcess: ChildProcess | null = null

const isPortInUse = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port)
  })
}

export const waitForServer = (url: string, timeout = 30000): Promise<void> => {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      fetch(url)
        .then((res) => {
          if (res.ok) resolve()
          else if (Date.now() - start > timeout) reject(new Error('Server timeout'))
          else setTimeout(check, 500)
        })
        .catch(() => {
          if (Date.now() - start > timeout) reject(new Error('Server timeout'))
          else setTimeout(check, 500)
        })
    }
    check()
  })
}

export const startNextServer = async (): Promise<void> => {
  const inUse = await isPortInUse(PORT)
  if (inUse) return

  const cwd = isDev ? process.cwd() : path.join(process.resourcesPath, 'app')
  const nextBin = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next')
  const cmd = isDev ? 'npm' : process.execPath
  const args = isDev
    ? ['run', 'dev', '--', '--port', String(PORT)]
    : [nextBin, 'start', '--port', String(PORT)]

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PORT: String(PORT),
    HOSTNAME: '127.0.0.1',
  }

  if (!isDev) {
    env.ELECTRON_RUN_AS_NODE = '1'
    env.ARGUS_DB_PATH = path.join(app.getPath('userData'), 'argus.db')
  }

  nextProcess = spawn(cmd, args, {
    cwd,
    stdio: 'pipe',
    env: env as NodeJS.ProcessEnv,
    shell: process.platform === 'win32',
  })

  nextProcess.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(`[next] ${data.toString()}`)
  })

  nextProcess.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`[next] ${data.toString()}`)
  })

  nextProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`Next.js exited with code ${code}\n`)
    }
    nextProcess = null
  })
}

export const killNextProcess = (): void => {
  if (!nextProcess) return
  if (process.platform === 'win32' && nextProcess.pid) {
    try {
      execSync(`taskkill /pid ${nextProcess.pid} /T /F`, { timeout: 5000, stdio: 'ignore' })
    } catch {
      nextProcess.kill()
    }
  } else {
    nextProcess.kill()
  }
  nextProcess = null
}
