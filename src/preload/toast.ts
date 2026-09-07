import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { Note } from '../shared/types'

const toastApi = {
  undo: (deletedNoteId: string): Promise<Note | undefined> =>
    ipcRenderer.invoke(IPC.TOAST_UNDO, { deletedNoteId }),
  close: (): void => window.close()
}

contextBridge.exposeInMainWorld('toastApi', toastApi)

export type ToastApi = typeof toastApi
