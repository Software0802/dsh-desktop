import { contextBridge, ipcRenderer } from 'electron'
import type { PiRpcEvent, PiStatus, PromptResult } from './shared/types.js'

const api = {
  getStatus: (): Promise<PiStatus> => ipcRenderer.invoke('pi:status'),
  prompt: (message: string): Promise<PromptResult> => ipcRenderer.invoke('pi:prompt', message),
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('market:open', url),
  onEvent: (handler: (event: PiRpcEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, value: PiRpcEvent): void => handler(value)
    ipcRenderer.on('pi:event', listener)
    return () => { ipcRenderer.removeListener('pi:event', listener) }
  },
}

contextBridge.exposeInMainWorld('pi', api)

declare global {
  interface Window {
    readonly pi: typeof api
  }
}
