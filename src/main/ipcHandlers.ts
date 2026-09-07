import { BrowserWindow, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import { IPC } from '../shared/ipc'
import type { DragPayload, NoteIdPayload, ResizePayload, ToastUndoPayload, UpdateChecklistPayload, UpdateContentPayload } from '../shared/ipc'
import { getNote, getSettings, updateNote, updateSettings } from './dataStore'
import { showNoteContextMenu } from './contextMenu'
import { endDrag, endResize, minimizeToggle, moveDrag, moveResize, startDrag, startResize, undoDelete } from './windowManager'
import { registerToggleShortcut } from './shortcutManager'
import { setAutoLaunch } from './autoLaunch'
import { openConsentWindow } from './consentWindow'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.NOTE_GET_INITIAL, (_e: IpcMainInvokeEvent, { noteId }: NoteIdPayload) => getNote(noteId))

  ipcMain.on(IPC.NOTE_UPDATE_CONTENT, (_e: IpcMainEvent, { noteId, content }: UpdateContentPayload) => {
    updateNote(noteId, { content })
  })

  ipcMain.on(IPC.NOTE_UPDATE_CHECKLIST, (_e: IpcMainEvent, { noteId, items }: UpdateChecklistPayload) => {
    updateNote(noteId, { items })
  })

  ipcMain.on(IPC.NOTE_OPEN_CONTEXT_MENU, (e: IpcMainEvent, { noteId }: NoteIdPayload) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) showNoteContextMenu(noteId, win)
  })

  ipcMain.on(IPC.NOTE_MINIMIZE_TOGGLE, (_e: IpcMainEvent, { noteId }: NoteIdPayload) => {
    minimizeToggle(noteId)
  })

  ipcMain.on(IPC.WINDOW_DRAG_START, (_e: IpcMainEvent, { noteId, screenX, screenY }: DragPayload) => {
    startDrag(noteId, screenX, screenY)
  })

  ipcMain.on(IPC.WINDOW_DRAG_MOVE, (_e: IpcMainEvent, { noteId, screenX, screenY }: DragPayload) => {
    moveDrag(noteId, screenX, screenY)
  })

  ipcMain.on(IPC.WINDOW_DRAG_END, (_e: IpcMainEvent, { noteId }: NoteIdPayload) => {
    endDrag(noteId)
  })

  ipcMain.on(IPC.WINDOW_RESIZE_START, (_e: IpcMainEvent, { noteId, edge, screenX, screenY }: ResizePayload) => {
    startResize(noteId, edge, screenX, screenY)
  })

  ipcMain.on(IPC.WINDOW_RESIZE_MOVE, (_e: IpcMainEvent, { noteId, screenX, screenY }: ResizePayload) => {
    moveResize(noteId, screenX, screenY)
  })

  ipcMain.on(IPC.WINDOW_RESIZE_END, (_e: IpcMainEvent, { noteId }: NoteIdPayload) => {
    endResize(noteId)
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => getSettings())

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_e: IpcMainInvokeEvent, patch: Partial<import('../shared/types').Settings>) => {
    if (patch.shortcutToggleAll) {
      const ok = registerToggleShortcut(patch.shortcutToggleAll)
      if (!ok) {
        return { ok: false, settings: getSettings(), error: 'このショートカットは登録できませんでした（他アプリと競合している可能性があります）' }
      }
    }
    if (typeof patch.autoLaunch === 'boolean') {
      setAutoLaunch(patch.autoLaunch)
    }
    const settings = updateSettings(patch)
    return { ok: true, settings }
  })

  ipcMain.handle(IPC.TOAST_UNDO, (_e: IpcMainInvokeEvent, { deletedNoteId }: ToastUndoPayload) => undoDelete(deletedNoteId))

  ipcMain.on(IPC.SETTINGS_OPEN_DISCLOSURE, () => {
    openConsentWindow('view')
  })
}
