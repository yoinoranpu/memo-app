import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { Settings } from '../shared/types'
import type { BackupResult, SettingsUpdateResult } from '../shared/ipc'

const settingsApi = {
  exportBackup: (): Promise<BackupResult> => ipcRenderer.invoke(IPC.BACKUP_EXPORT),
  importBackup: (): Promise<BackupResult> => ipcRenderer.invoke(IPC.BACKUP_IMPORT),
  get: (): Promise<Settings> => ipcRenderer.invoke(IPC.SETTINGS_GET),
  update: (patch: Partial<Settings>): Promise<SettingsUpdateResult> =>
    ipcRenderer.invoke(IPC.SETTINGS_UPDATE, patch),
  openDisclosure: (): void => ipcRenderer.send(IPC.SETTINGS_OPEN_DISCLOSURE)
}

contextBridge.exposeInMainWorld('settingsApi', settingsApi)

export type SettingsApi = typeof settingsApi
