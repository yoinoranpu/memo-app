import Store from 'electron-store'
import { screen } from 'electron'
import { DEFAULT_SIZE, NOTE_COLORS, type Note, type Settings, type StoreSchema } from '../shared/types'

const DEFAULT_SETTINGS: Settings = {
  shortcutToggleAll: 'Ctrl+Alt+M',
  autoLaunch: false,
  hasAcceptedDisclosure: false
}

// Constructed lazily (on first use, i.e. inside app.whenReady()) rather than at
// module load time, so it picks up app.setName('メモアプリ') from index.ts before
// resolving the userData path — module imports are hoisted ahead of that call.
let storeInstance: Store<StoreSchema> | undefined
function store(): Store<StoreSchema> {
  if (!storeInstance) {
    storeInstance = new Store<StoreSchema>({
      name: 'notes-data',
      defaults: {
        notes: [],
        settings: DEFAULT_SETTINGS
      }
    })
  }
  return storeInstance
}

export function monitorIdAt(x: number, y: number): string {
  const display = screen.getDisplayNearestPoint({ x, y })
  return `display-${display.id}`
}

export function getAllNotes(): Note[] {
  return store().get('notes')
}

export function getNote(noteId: string): Note | undefined {
  return store().get('notes').find((n) => n.id === noteId)
}

export function saveNote(note: Note): void {
  const notes = store().get('notes')
  const index = notes.findIndex((n) => n.id === note.id)
  if (index >= 0) {
    notes[index] = note
  } else {
    notes.push(note)
  }
  store().set('notes', notes)
}

export function updateNote(noteId: string, patch: Partial<Note>): Note | undefined {
  const notes = store().get('notes')
  const index = notes.findIndex((n) => n.id === noteId)
  if (index < 0) return undefined
  const updated: Note = { ...notes[index], ...patch, updatedAt: new Date().toISOString() }
  notes[index] = updated
  store().set('notes', notes)
  return updated
}

export function deleteNote(noteId: string): Note | undefined {
  const notes = store().get('notes')
  const index = notes.findIndex((n) => n.id === noteId)
  if (index < 0) return undefined
  const [removed] = notes.splice(index, 1)
  store().set('notes', notes)
  return removed
}

export function restoreNote(note: Note): void {
  const notes = store().get('notes')
  if (notes.some((n) => n.id === note.id)) return
  notes.push(note)
  store().set('notes', notes)
}

export function getSettings(): Settings {
  return store().get('settings')
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const settings = { ...store().get('settings'), ...patch }
  store().set('settings', settings)
  return settings
}

export function nextZIndex(): number {
  const notes = store().get('notes')
  return notes.reduce((max, n) => Math.max(max, n.zIndex), 0) + 1
}

export function createNoteDefaults(
  id: string,
  type: Note['type'],
  x: number,
  y: number
): Note {
  return {
    id,
    type,
    content: type === 'text' ? '' : null,
    items: type === 'checklist' ? [] : null,
    position: { x, y, monitorId: monitorIdAt(x, y) },
    size: { ...DEFAULT_SIZE },
    color: NOTE_COLORS[type],
    fontSize: 14,
    zIndex: nextZIndex(),
    minimized: false,
    updatedAt: new Date().toISOString()
  }
}
