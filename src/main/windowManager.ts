import { BrowserWindow, screen } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import {
  createNoteDefaults,
  deleteNote as deleteNoteFromStore,
  getAllNotes,
  monitorIdAt,
  restoreNote as restoreNoteInStore,
  saveNote,
  updateNote as updateNoteInStore
} from './dataStore'
import { findCascadePosition, type Rect } from './cascade'
import { showUndoToast, closeUndoToast } from './toastWindow'
import { IPC, type ResizeEdge } from '../shared/ipc'
import { MIN_SIZE, type Note } from '../shared/types'

const MOVE_PERSIST_DEBOUNCE_MS = 300
const MINIMIZED_SIZE = { width: 36, height: 36 }

interface DragState {
  startCursorX: number
  startCursorY: number
  startWinX: number
  startWinY: number
  width: number
  height: number
}

interface TrackedWindow {
  win: BrowserWindow
  restoreSize: { width: number; height: number } | null
  moveTimer: NodeJS.Timeout | null
}

interface ResizeState {
  edge: ResizeEdge
  startCursorX: number
  startCursorY: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
}

const windows = new Map<string, TrackedWindow>()
const dragState = new Map<string, DragState>()
const resizeState = new Map<string, ResizeState>()
let deletedRecently: { note: Note; timer: NodeJS.Timeout } | null = null
let notesVisible = true

function rendererUrl(entry: 'index' | 'settings' | 'toast', query: Record<string, string>): { devUrl?: string; file?: string; query: Record<string, string> } {
  const qs = new URLSearchParams(query).toString()
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const base = process.env['ELECTRON_RENDERER_URL']
    return { devUrl: `${base}/${entry}.html${qs ? `?${qs}` : ''}`, query }
  }
  return { file: join(__dirname, `../renderer/${entry}.html`), query }
}

function createNoteWindow(note: Note): BrowserWindow {
  const win = new BrowserWindow({
    x: note.position.x,
    y: note.position.y,
    width: note.minimized ? MINIMIZED_SIZE.width : note.size.width,
    height: note.minimized ? MINIMIZED_SIZE.height : note.size.height,
    minWidth: note.minimized ? MINIMIZED_SIZE.width : MIN_SIZE.width,
    minHeight: note.minimized ? MINIMIZED_SIZE.height : MIN_SIZE.height,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: !note.minimized,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/note.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver')

  const target = rendererUrl('index', { noteId: note.id })
  if (target.devUrl) {
    win.loadURL(target.devUrl)
  } else if (target.file) {
    win.loadFile(target.file, { query: target.query })
  }

  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.error('[note] did-fail-load', errorCode, errorDescription, validatedURL)
  })
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[note] render-process-gone', details)
  })
  win.once('ready-to-show', () => {
    if (notesVisible) win.show()
  })

  const tracked: TrackedWindow = { win, restoreSize: null, moveTimer: null }
  windows.set(note.id, tracked)

  const persistBounds = (): void => {
    if (tracked.moveTimer) clearTimeout(tracked.moveTimer)
    tracked.moveTimer = setTimeout(() => {
      if (win.isDestroyed()) return
      const [x, y] = win.getPosition()
      const existing = getAllNotes().find((n) => n.id === note.id)
      if (!existing) return
      // Position is always persisted (a minimized chip can still be dragged
      // around), but size is only persisted when not minimized — the 36x36
      // minimized chip size must never overwrite the note's real size.
      if (existing.minimized) {
        updateNoteInStore(note.id, { position: { x, y, monitorId: monitorIdAt(x, y) } })
        return
      }
      const [width, height] = win.getSize()
      updateNoteInStore(note.id, {
        position: { x, y, monitorId: monitorIdAt(x, y) },
        size: { width, height }
      })
    }, MOVE_PERSIST_DEBOUNCE_MS)
  }

  win.on('move', persistBounds)
  win.on('resize', persistBounds)

  win.on('closed', () => {
    windows.delete(note.id)
    dragState.delete(note.id)
    resizeState.delete(note.id)
  })

  return win
}

export function bootstrapFromStore(): void {
  for (const note of getAllNotes()) {
    createNoteWindow(note)
  }
}

export function getNoteWindow(noteId: string): BrowserWindow | undefined {
  return windows.get(noteId)?.win
}

export function pushNoteUpdate(note: Note): void {
  const tracked = windows.get(note.id)
  tracked?.win.webContents.send(IPC.NOTE_DATA_UPDATED, note)
}

function existingRectsOnMonitor(monitorId: string, excludeId?: string): Rect[] {
  return getAllNotes()
    .filter((n) => n.id !== excludeId && n.position.monitorId === monitorId)
    .map((n) => ({ x: n.position.x, y: n.position.y, width: n.size.width, height: n.size.height }))
}

let lastCreatedRect: Rect | null = null

export function createNote(type: Note['type']): Note {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const monitorId = `display-${display.id}`
  const size = { width: 220, height: 160 }
  const pos = findCascadePosition(display.workArea, size, existingRectsOnMonitor(monitorId), lastCreatedRect)
  const note = createNoteDefaults(crypto.randomUUID(), type, pos.x, pos.y)
  saveNote(note)
  lastCreatedRect = { x: pos.x, y: pos.y, width: size.width, height: size.height }
  createNoteWindow(note)
  return note
}

export function deleteNoteWithUndo(noteId: string): void {
  const tracked = windows.get(noteId)
  const removed = deleteNoteFromStore(noteId)
  tracked?.win.close()
  if (!removed) return
  if (deletedRecently) clearTimeout(deletedRecently.timer)
  deletedRecently = {
    note: removed,
    timer: setTimeout(() => {
      deletedRecently = null
    }, 5000)
  }
  showUndoToast(removed.id)
}

export function undoDelete(deletedNoteId: string): Note | undefined {
  if (!deletedRecently || deletedRecently.note.id !== deletedNoteId) return undefined
  const note = deletedRecently.note
  clearTimeout(deletedRecently.timer)
  deletedRecently = null
  restoreNoteInStore(note)
  createNoteWindow(note)
  closeUndoToast()
  return note
}

export function setNoteColor(noteId: string, color: string): void {
  const updated = updateNoteInStore(noteId, { color })
  if (updated) pushNoteUpdate(updated)
}

export function setNoteFontSize(noteId: string, fontSize: number): void {
  const updated = updateNoteInStore(noteId, { fontSize })
  if (updated) pushNoteUpdate(updated)
}

export function sendToBack(noteId: string): void {
  const tracked = windows.get(noteId)
  if (!tracked) return
  // Electron has no native peer z-order API across multiple always-on-top windows;
  // temporarily dropping this window's level approximates "send to back" but may
  // also let regular (non-note) windows cover it, not just other notes.
  tracked.win.setAlwaysOnTop(true, 'normal')
  setTimeout(() => {
    if (!tracked.win.isDestroyed()) tracked.win.setAlwaysOnTop(true, 'screen-saver')
  }, 50)
  const updated = updateNoteInStore(noteId, { zIndex: 0 })
  if (updated) pushNoteUpdate(updated)
}

// Keeps a rect within the work area of whichever display it's mostly on, so
// growing a note back up from its minimized chip never pushes it off-screen.
function clampToWorkArea(x: number, y: number, width: number, height: number): { x: number; y: number } {
  const display = screen.getDisplayNearestPoint({ x: x + width / 2, y: y + height / 2 })
  const wa = display.workArea
  const maxX = wa.x + Math.max(0, wa.width - width)
  const maxY = wa.y + Math.max(0, wa.height - height)
  return {
    x: Math.min(Math.max(x, wa.x), maxX),
    y: Math.min(Math.max(y, wa.y), maxY)
  }
}

export function minimizeToggle(noteId: string): void {
  const tracked = windows.get(noteId)
  if (!tracked) return
  const note = getAllNotes().find((n) => n.id === noteId)
  if (!note) return
  const bounds = tracked.win.getBounds()
  if (!note.minimized) {
    tracked.restoreSize = { ...note.size }
    tracked.win.setResizable(false)
    // The window's minimum size constraint (MIN_SIZE, ~150x100) otherwise
    // silently clamps setSize below it, so it has to be relaxed first.
    tracked.win.setMinimumSize(MINIMIZED_SIZE.width, MINIMIZED_SIZE.height)
    // Top-left stays fixed (only width/height shrink). Anchoring to a corner
    // that then gets clamped on restore (e.g. top-right) causes the position
    // to drift a little further on every minimize/restore cycle once the
    // note is near a screen edge — keeping the anchor fixed at top-left for
    // both directions means a plain cycle never moves the note at all.
    tracked.win.setBounds({ x: bounds.x, y: bounds.y, width: MINIMIZED_SIZE.width, height: MINIMIZED_SIZE.height })
    const updated = updateNoteInStore(noteId, { minimized: true })
    if (updated) pushNoteUpdate(updated)
  } else {
    const restore = tracked.restoreSize ?? note.size
    tracked.win.setMinimumSize(MIN_SIZE.width, MIN_SIZE.height)
    const clamped = clampToWorkArea(bounds.x, bounds.y, restore.width, restore.height)
    tracked.win.setBounds({ x: clamped.x, y: clamped.y, width: restore.width, height: restore.height })
    tracked.win.setResizable(true)
    const updated = updateNoteInStore(noteId, {
      minimized: false,
      size: restore,
      position: { x: clamped.x, y: clamped.y, monitorId: monitorIdAt(clamped.x, clamped.y) }
    })
    if (updated) pushNoteUpdate(updated)
  }
}

export function startDrag(noteId: string, screenX: number, screenY: number): void {
  const tracked = windows.get(noteId)
  if (!tracked) return
  const [startWinX, startWinY] = tracked.win.getPosition()
  const [width, height] = tracked.win.getSize()
  dragState.set(noteId, { startCursorX: screenX, startCursorY: screenY, startWinX, startWinY, width, height })
}

export function moveDrag(noteId: string, screenX: number, screenY: number): void {
  const tracked = windows.get(noteId)
  const state = dragState.get(noteId)
  if (!tracked || !state) return
  const newX = state.startWinX + (screenX - state.startCursorX)
  const newY = state.startWinY + (screenY - state.startCursorY)
  // Pin width/height explicitly on every move via setBounds rather than
  // setPosition: crossing monitors with different DPI scaling can otherwise
  // make Windows silently rescale the window, and the size creeps up further
  // each time the cursor straddles the monitor boundary during one drag.
  tracked.win.setBounds({
    x: Math.round(newX),
    y: Math.round(newY),
    width: state.width,
    height: state.height
  })
}

export function endDrag(noteId: string): void {
  dragState.delete(noteId)
}

// Transparent frameless windows don't get native edge-drag resize hit-testing
// on Windows, so resizing is implemented the same way as dragging: the
// renderer reports raw cursor deltas from a set of edge/corner hotspots and
// main recomputes the bounds directly via setBounds.
export function startResize(noteId: string, edge: ResizeEdge, screenX: number, screenY: number): void {
  const tracked = windows.get(noteId)
  if (!tracked) return
  const bounds = tracked.win.getBounds()
  resizeState.set(noteId, {
    edge,
    startCursorX: screenX,
    startCursorY: screenY,
    startX: bounds.x,
    startY: bounds.y,
    startWidth: bounds.width,
    startHeight: bounds.height
  })
}

export function moveResize(noteId: string, screenX: number, screenY: number): void {
  const tracked = windows.get(noteId)
  const state = resizeState.get(noteId)
  if (!tracked || !state) return

  const dx = screenX - state.startCursorX
  const dy = screenY - state.startCursorY

  let x = state.startX
  let y = state.startY
  let width = state.startWidth
  let height = state.startHeight

  if (state.edge.includes('e')) {
    width = Math.max(MIN_SIZE.width, state.startWidth + dx)
  }
  if (state.edge.includes('s')) {
    height = Math.max(MIN_SIZE.height, state.startHeight + dy)
  }
  if (state.edge.includes('w')) {
    width = Math.max(MIN_SIZE.width, state.startWidth - dx)
    x = state.startX + (state.startWidth - width)
  }
  if (state.edge.includes('n')) {
    height = Math.max(MIN_SIZE.height, state.startHeight - dy)
    y = state.startY + (state.startHeight - height)
  }

  tracked.win.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) })
}

export function endResize(noteId: string): void {
  resizeState.delete(noteId)
}

export function toggleAllVisibility(): void {
  notesVisible = !notesVisible
  for (const { win } of windows.values()) {
    if (notesVisible) win.show()
    else win.hide()
  }
}

export function areNotesVisible(): boolean {
  return notesVisible
}

export function allNoteWindows(): BrowserWindow[] {
  return Array.from(windows.values()).map((t) => t.win)
}
