import { BrowserWindow, screen } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'

const TOAST_WIDTH = 280
const TOAST_HEIGHT = 56
const TOAST_MARGIN_BOTTOM = 48
const TOAST_DURATION_MS = 5000

let toastWin: BrowserWindow | null = null
let closeTimer: NodeJS.Timeout | null = null

export function showUndoToast(deletedNoteId: string): void {
  if (toastWin && !toastWin.isDestroyed()) {
    toastWin.close()
  }
  if (closeTimer) clearTimeout(closeTimer)

  const primary = screen.getPrimaryDisplay()
  const x = Math.round(primary.workArea.x + (primary.workArea.width - TOAST_WIDTH) / 2)
  const y = Math.round(primary.workArea.y + primary.workArea.height - TOAST_HEIGHT - TOAST_MARGIN_BOTTOM)

  const win = new BrowserWindow({
    x,
    y,
    width: TOAST_WIDTH,
    height: TOAST_HEIGHT,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/toast.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  toastWin = win

  const query = `deletedNoteId=${encodeURIComponent(deletedNoteId)}`
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/toast.html?${query}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/toast.html'), { search: query })
  }

  win.once('ready-to-show', () => win.show())
  win.on('closed', () => {
    if (toastWin === win) toastWin = null
  })

  closeTimer = setTimeout(() => {
    if (!win.isDestroyed()) win.close()
  }, TOAST_DURATION_MS)
}

export function closeUndoToast(): void {
  if (closeTimer) clearTimeout(closeTimer)
  if (toastWin && !toastWin.isDestroyed()) toastWin.close()
}
