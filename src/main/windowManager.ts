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
import { minimizeAnchor, restoreAnchor, clampRectToWorkArea } from './minimizeAnchor'
import { showUndoToast, closeUndoToast } from './toastWindow'
import { IPC, type ResizeEdge } from '../shared/ipc'
import { MIN_SIZE, type Note } from '../shared/types'

const MOVE_PERSIST_DEBOUNCE_MS = 300
const MINIMIZED_SIZE = { width: 48, height: 48 }

interface DragState {
  startCursorX: number
  startCursorY: number
  startWinX: number
  startWinY: number
  width: number
  height: number
}

interface PendingWrite {
  position: { x: number; y: number; monitorId: string }
  size?: { width: number; height: number }
}

interface TrackedWindow {
  win: BrowserWindow
  moveTimer: NodeJS.Timeout | null
  suppressPersist: boolean
  pendingWrite: PendingWrite | null
  flushPendingWrite: () => void
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

  const tracked: TrackedWindow = {
    win,
    moveTimer: null,
    suppressPersist: false,
    pendingWrite: null,
    flushPendingWrite: () => {
      if (tracked.moveTimer) {
        clearTimeout(tracked.moveTimer)
        tracked.moveTimer = null
      }
      if (!tracked.pendingWrite) return
      const payload = tracked.pendingWrite
      tracked.pendingWrite = null
      updateNoteInStore(note.id, payload)
    }
  }
  windows.set(note.id, tracked)

  const persistBounds = (): void => {
    // minimizeToggle already writes the authoritative position/size to the
    // store itself, synchronously, in the same call that resizes the window —
    // it sets suppressPersist around that call so this generic move/resize
    // listener (meant for user-driven dragging/resizing) never also fires for
    // it. Without this, a quick peek-then-reminimize could still race: this
    // listener would schedule its own debounced write right as minimizeToggle
    // was mid-transition, occasionally saving a stale mix of the two.
    if (tracked.suppressPersist) return
    // Snapshot everything synchronously, right when the move/resize event
    // actually fires, and keep it in tracked.pendingWrite immediately — only
    // the store WRITE itself is debounced (see flushPendingWrite). This way,
    // if minimizeToggle runs before the debounce fires, it can flush this
    // pending value on the spot instead of discarding it and falling back to
    // a stale stored position (e.g. dragging a note, then immediately
    // minimizing it within the 300ms debounce window).
    const [x, y] = win.getPosition()
    const existing = getAllNotes().find((n) => n.id === note.id)
    if (!existing) return
    const position = { x, y, monitorId: monitorIdAt(x, y) }
    // Position is always persisted (a minimized chip can still be dragged
    // around), but size is only persisted when not minimized — the tiny
    // minimized chip size must never overwrite the note's real size.
    if (existing.minimized) {
      tracked.pendingWrite = { position }
    } else {
      const [width, height] = win.getSize()
      tracked.pendingWrite = { position, size: { width, height } }
    }

    if (tracked.moveTimer) clearTimeout(tracked.moveTimer)
    tracked.moveTimer = setTimeout(tracked.flushPendingWrite, MOVE_PERSIST_DEBOUNCE_MS)
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
  return clampRectToWorkArea({ x, y, width, height }, display.workArea)
}

export function minimizeToggle(noteId: string): void {
  const tracked = windows.get(noteId)
  if (!tracked) return
  // Apply any debounced drag/resize write immediately rather than discarding
  // it — e.g. dragging a note and then minimizing it right away, within the
  // 300ms debounce window, must not fall back to the position from before
  // that drag.
  tracked.flushPendingWrite()
  const note = getAllNotes().find((n) => n.id === noteId)
  if (!note) return
  // Position/size are driven from the store (the app's own record of "where
  // this note is"), never re-read from win.getBounds() here. Windows doesn't
  // always finish applying a setBounds() synchronously — re-querying the
  // live rect right after a previous toggle can catch it mid-update, which
  // was the real source of the drift on quick minimize/restore cycles even
  // after the race-condition fix. Trusting our own last-written value instead
  // makes each toggle fully independent of what the OS reports back.
  if (!note.minimized) {
    tracked.win.setResizable(false)
    // The window's minimum size constraint (MIN_SIZE, ~150x100) otherwise
    // silently clamps setSize below it, so it has to be relaxed first.
    tracked.win.setMinimumSize(MINIMIZED_SIZE.width, MINIMIZED_SIZE.height)
    // Anchor to the top-right corner (where the minimize button sits), so
    // the note visually collapses into the button. Safe from the earlier
    // drift bug now: that was caused by the restore-time edge clamp being
    // written back as the note's real position (see below), not by which
    // corner is used as the anchor.
    const { x, y } = minimizeAnchor(note.position, note.size, MINIMIZED_SIZE)
    tracked.suppressPersist = true
    tracked.win.setBounds({ x, y, width: MINIMIZED_SIZE.width, height: MINIMIZED_SIZE.height })
    setImmediate(() => {
      tracked.suppressPersist = false
    })
    const updated = updateNoteInStore(noteId, {
      minimized: true,
      position: { x, y, monitorId: monitorIdAt(x, y) }
    })
    if (updated) pushNoteUpdate(updated)
  } else {
    const restore = note.size
    tracked.win.setMinimumSize(MIN_SIZE.width, MIN_SIZE.height)
    const grown = restoreAnchor(note.position, restore, MINIMIZED_SIZE)
    const clamped = clampToWorkArea(grown.x, grown.y, restore.width, restore.height)
    tracked.suppressPersist = true
    tracked.win.setBounds({ x: clamped.x, y: clamped.y, width: restore.width, height: restore.height })
    setImmediate(() => {
      tracked.suppressPersist = false
    })
    tracked.win.setResizable(true)
    // Persist `grown` (the exact inverse of the minimize anchor math) — NOT
    // `clamped`. Leaving the store untouched entirely was itself a bug: the
    // next minimize would then anchor off the *previous* chip position
    // instead of the note's actual current position, compounding the
    // top-right offset further right on every cycle. Persisting `clamped`
    // instead would have the earlier bug back (an edge-triggered nudge
    // becoming permanent). `grown` is the one value that's both correct now
    // and exactly reversible on the next minimize.
    const updated = updateNoteInStore(noteId, {
      minimized: false,
      position: { x: grown.x, y: grown.y, monitorId: monitorIdAt(grown.x, grown.y) }
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
