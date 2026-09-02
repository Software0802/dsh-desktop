import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { StringDecoder } from 'node:string_decoder'
import type { PiRpcEvent, PiStatus, PromptResult } from './shared/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

class PiRpcClient {
  private process: ChildProcessWithoutNullStreams | null = null
  private buffer = ''
  private requestNumber = 0
  private statusValue: PiStatus = { state: 'offline' }
  private readonly pending = new Map<string, {
    readonly resolve: (result: PromptResult) => void
  }>()
  private readonly decoder = new StringDecoder('utf8')
  private onEvent: ((event: PiRpcEvent) => void) | null = null

  setEventHandler(handler: (event: PiRpcEvent) => void): void {
    this.onEvent = handler
  }

  status(): PiStatus {
    return this.statusValue
  }

  async prompt(message: string): Promise<PromptResult> {
    if (message.trim() === '') return { accepted: false, error: 'Enter a message first.' }
    try {
      await this.start()
    } catch (error) {
      return { accepted: false, error: error instanceof Error ? error.message : String(error) }
    }

    const id = `pi-desktop-${++this.requestNumber}`
    return new Promise<PromptResult>((resolve) => {
      this.pending.set(id, { resolve })
      try {
        this.write({ id, type: 'prompt', message })
      } catch (error) {
        this.pending.delete(id)
        resolve({ accepted: false, error: error instanceof Error ? error.message : String(error) })
        return
      }
      setTimeout(() => {
        const request = this.pending.get(id)
        if (request === undefined) return
        this.pending.delete(id)
        request.resolve({ accepted: false, error: 'Pi did not accept the prompt in time.' })
      }, 30_000)
    })
  }

  private async start(): Promise<void> {
    if (this.process !== null) return
    const command = process.env.PI_DESKTOP_PI_BIN ?? (process.platform === 'win32' ? 'pi.cmd' : 'pi')
    this.statusValue = { state: 'starting', detail: `Starting ${command} --mode rpc` }
    const child = spawn(command, ['--mode', 'rpc'], {
      cwd: process.env.PI_DESKTOP_CWD ?? process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.process = child
    child.stdout.on('data', (chunk: Buffer) => { this.read(chunk) })
    child.stderr.on('data', (chunk: Buffer) => {
      const detail = chunk.toString('utf8').trim()
      if (detail.length > 0) this.statusValue = { state: 'error', detail }
    })
    child.on('error', (error) => {
      this.statusValue = { state: 'error', detail: `Pi could not start: ${error.message}` }
      this.process = null
      for (const request of this.pending.values()) request.resolve({ accepted: false, error: error.message })
      this.pending.clear()
    })
    child.on('exit', (code, signal) => {
      if (this.process !== child) return
      this.process = null
      const detail = `Pi exited${code === null ? ` with ${signal ?? 'no signal'}` : ` with code ${code}`}.`
      this.statusValue = {
        state: 'offline',
        detail,
      }
      for (const request of this.pending.values()) request.resolve({ accepted: false, error: detail })
      this.pending.clear()
    })
  }

  private read(chunk: Buffer): void {
    this.buffer += this.decoder.write(chunk)
    while (true) {
      const newline = this.buffer.indexOf('\n')
      if (newline < 0) break
      let line = this.buffer.slice(0, newline)
      this.buffer = this.buffer.slice(newline + 1)
      if (line.endsWith('\r')) line = line.slice(0, -1)
      if (line.trim() === '') continue
      let value: unknown
      try {
        value = JSON.parse(line)
      } catch {
        continue
      }
      if (value === null || typeof value !== 'object') continue
      const event = value as PiRpcEvent
      this.statusValue = { state: 'ready' }
      if (event.type === 'response' && typeof event.id === 'string') {
        const request = this.pending.get(event.id)
        if (request === undefined) continue
        this.pending.delete(event.id)
        request.resolve({
          accepted: event.success === true,
          error: typeof event.error === 'string' ? event.error : undefined,
        })
        continue
      }
      this.onEvent?.(event)
    }
  }

  private write(command: Record<string, unknown>): void {
    if (this.process === null || !this.process.stdin.writable) {
      throw new Error('Pi is not running.')
    }
    this.process.stdin.write(`${JSON.stringify(command)}\n`)
  }
}

const PRODUCT_NAME = 'deepseek'

let mainWindow: BrowserWindow | null = null
const pi = new PiRpcClient()

function revealWindow(window: BrowserWindow): void {
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#151517',
    title: PRODUCT_NAME,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#151517', symbolColor: '#f9fafb', height: 36 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.js'),
    },
  })
  void mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'))
  mainWindow.once('ready-to-show', () => {
    if (mainWindow !== null) revealWindow(mainWindow)
  })
  mainWindow.on('closed', () => { mainWindow = null })
}

pi.setEventHandler((event) => { mainWindow?.webContents.send('pi:event', event) })

ipcMain.handle('pi:status', () => pi.status())
ipcMain.handle('pi:prompt', (_event, message: unknown) => {
  if (typeof message !== 'string') return { accepted: false, error: 'Prompt must be text.' }
  return pi.prompt(message)
})
ipcMain.handle('market:open', (_event, url: unknown) => {
  if (typeof url !== 'string' || !url.startsWith('https://')) return false
  void shell.openExternal(url)
  return true
})

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow !== null) revealWindow(mainWindow)
  })
  app.setName(PRODUCT_NAME)
  if (process.platform === 'win32') app.setAppUserModelId('pi-desktop')
  void app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
