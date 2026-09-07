export type NoteType = 'text' | 'checklist'

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export interface Position {
  x: number
  y: number
  monitorId: string
}

export interface Size {
  width: number
  height: number
}

export interface Note {
  id: string
  type: NoteType
  content: string | null
  items: ChecklistItem[] | null
  position: Position
  size: Size
  color: string
  fontSize: number
  zIndex: number
  minimized: boolean
  updatedAt: string
}

export interface Settings {
  shortcutToggleAll: string
  autoLaunch: boolean
  hasAcceptedDisclosure: boolean
}

export interface StoreSchema {
  notes: Note[]
  settings: Settings
}

export const DEFAULT_SIZE: Size = { width: 220, height: 160 }
export const MIN_SIZE: Size = { width: 150, height: 100 }

export const NOTE_COLORS: Record<NoteType, string> = {
  text: '#FFF6C2',
  checklist: '#D8EEFF'
}

export const COLOR_PRESETS = ['#FFF6C2', '#D8EEFF', '#FFD8E4', '#DDF5D8', '#EBE0FF', '#F0F0F0']

export const FONT_SIZES = [12, 14, 18] as const
