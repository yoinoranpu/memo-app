import type { ChecklistItem, Note, Settings } from './types'

export const IPC = {
  NOTE_GET_INITIAL: 'note:getInitial',
  NOTE_UPDATE_CONTENT: 'note:updateContent',
  NOTE_UPDATE_CHECKLIST: 'note:updateChecklist',
  NOTE_OPEN_CONTEXT_MENU: 'note:openContextMenu',
  NOTE_MINIMIZE_TOGGLE: 'note:minimizeToggle',
  NOTE_DATA_UPDATED: 'note:dataUpdated',
  WINDOW_DRAG_START: 'window:dragStart',
  WINDOW_DRAG_MOVE: 'window:dragMove',
  WINDOW_DRAG_END: 'window:dragEnd',
  WINDOW_RESIZE_START: 'window:resizeStart',
  WINDOW_RESIZE_MOVE: 'window:resizeMove',
  WINDOW_RESIZE_END: 'window:resizeEnd',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_OPEN_DISCLOSURE: 'settings:openDisclosure',
  TOAST_UNDO: 'toast:undo',
  CONSENT_ACCEPT: 'consent:accept',
  CONSENT_CLOSE: 'consent:close'
} as const

export interface UpdateContentPayload {
  noteId: string
  content: string
}

export interface UpdateChecklistPayload {
  noteId: string
  items: ChecklistItem[]
}

export interface DragPayload {
  noteId: string
  screenX: number
  screenY: number
}

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface ResizePayload {
  noteId: string
  edge: ResizeEdge
  screenX: number
  screenY: number
}

export interface NoteIdPayload {
  noteId: string
}

export interface SettingsUpdateResult {
  ok: boolean
  settings: Settings
  error?: string
}

export interface ToastUndoPayload {
  deletedNoteId: string
}
