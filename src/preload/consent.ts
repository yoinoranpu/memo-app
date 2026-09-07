import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'

const consentApi = {
  accept: (): Promise<void> => ipcRenderer.invoke(IPC.CONSENT_ACCEPT),
  close: (): void => window.close()
}

contextBridge.exposeInMainWorld('consentApi', consentApi)

export type ConsentApi = typeof consentApi
