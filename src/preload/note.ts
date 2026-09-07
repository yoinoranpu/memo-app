import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { ResizeEdge } from '../shared/ipc'
import type { ChecklistItem, Note } from '../shared/types'

const noteApi = {
  getInitial: (noteId: string): Promise<Note | undefined> => ipcRenderer.invoke(IPC.NOTE_GET_INITIAL, { noteId }),
  updateContent: (noteId: string, content: string): void =>
    ipcRenderer.send(IPC.NOTE_UPDATE_CONTENT, { noteId, content }),
  updateChecklist: (noteId: string, items: ChecklistItem[]): void =>
    ipcRenderer.send(IPC.NOTE_UPDATE_CHECKLIST, { noteId, items }),
  openContextMenu: (noteId: string): void => ipcRenderer.send(IPC.NOTE_OPEN_CONTEXT_MENU, { noteId }),
  minimizeToggle: (noteId: string): void => ipcRenderer.send(IPC.NOTE_MINIMIZE_TOGGLE, { noteId }),
  dragStart: (noteId: string, screenX: number, screenY: number): void =>
    ipcRenderer.send(IPC.WINDOW_DRAG_START, { noteId, screenX, screenY }),
  dragMove: (noteId: string, screenX: number, screenY: number): void =>
    ipcRenderer.send(IPC.WINDOW_DRAG_MOVE, { noteId, screenX, screenY }),
  dragEnd: (noteId: string): void => ipcRenderer.send(IPC.WINDOW_DRAG_END, { noteId }),
  resizeStart: (noteId: string, edge: ResizeEdge, screenX: number, screenY: number): void =>
    ipcRenderer.send(IPC.WINDOW_RESIZE_START, { noteId, edge, screenX, screenY }),
  resizeMove: (noteId: string, edge: ResizeEdge, screenX: number, screenY: number): void =>
    ipcRenderer.send(IPC.WINDOW_RESIZE_MOVE, { noteId, edge, screenX, screenY }),
  resizeEnd: (noteId: string): void => ipcRenderer.send(IPC.WINDOW_RESIZE_END, { noteId }),
  onDataUpdated: (callback: (note: Note) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, note: Note): void => callback(note)
    ipcRenderer.on(IPC.NOTE_DATA_UPDATED, listener)
    return () => ipcRenderer.removeListener(IPC.NOTE_DATA_UPDATED, listener)
  }
}

contextBridge.exposeInMainWorld('noteApi', noteApi)

export type NoteApi = typeof noteApi
