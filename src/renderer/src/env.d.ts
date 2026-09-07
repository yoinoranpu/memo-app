/// <reference types="vite/client" />

import type { ChecklistItem, Note, Settings } from '@shared/types'
import type { ResizeEdge } from '@shared/ipc'

export interface NoteApi {
  getInitial: (noteId: string) => Promise<Note | undefined>
  updateContent: (noteId: string, content: string) => void
  updateChecklist: (noteId: string, items: ChecklistItem[]) => void
  openContextMenu: (noteId: string) => void
  minimizeToggle: (noteId: string) => void
  dragStart: (noteId: string, screenX: number, screenY: number) => void
  dragMove: (noteId: string, screenX: number, screenY: number) => void
  dragEnd: (noteId: string) => void
  resizeStart: (noteId: string, edge: ResizeEdge, screenX: number, screenY: number) => void
  resizeMove: (noteId: string, edge: ResizeEdge, screenX: number, screenY: number) => void
  resizeEnd: (noteId: string) => void
  onDataUpdated: (callback: (note: Note) => void) => () => void
}

export interface SettingsApi {
  get: () => Promise<Settings>
  update: (patch: Partial<Settings>) => Promise<{ ok: boolean; settings: Settings; error?: string }>
  openDisclosure: () => void
}

export interface ToastApi {
  undo: (deletedNoteId: string) => Promise<Note | undefined>
  close: () => void
}

export interface ConsentApi {
  accept: () => Promise<void>
  close: () => void
}

declare global {
  interface Window {
    noteApi: NoteApi
    settingsApi: SettingsApi
    toastApi: ToastApi
    consentApi: ConsentApi
  }
}
