import { app, BrowserWindow, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import { updateSettings } from './dataStore'

let consentWin: BrowserWindow | null = null

/**
 * mode 'initial': shown on first launch, blocks nothing else in the process
 * but the caller should await the returned promise before bootstrapping
 * notes/shortcuts — it only resolves once the user clicks 同意. Closing the
 * window without agreeing quits the app instead (there's nothing useful to
 * do with an unaccepted note app).
 * mode 'view': reachable any time from Settings, purely informational.
 */
export function openConsentWindow(mode: 'initial' | 'view'): Promise<void> {
  return new Promise((resolve) => {
    if (consentWin && !consentWin.isDestroyed()) {
      consentWin.focus()
      resolve()
      return
    }

    consentWin = new BrowserWindow({
      width: 460,
      height: 520,
      resizable: false,
      title: 'ご利用にあたって',
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/consent.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    const query = `mode=${mode}`
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      consentWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/consent.html?${query}`)
    } else {
      consentWin.loadFile(join(__dirname, '../renderer/consent.html'), { search: query })
    }

    let accepted = false

    const acceptHandler = (): void => {
      accepted = true
      updateSettings({ hasAcceptedDisclosure: true })
      consentWin?.close()
    }
    ipcMain.handleOnce(IPC.CONSENT_ACCEPT, acceptHandler)

    consentWin.on('closed', () => {
      consentWin = null
      ipcMain.removeHandler(IPC.CONSENT_ACCEPT)
      if (mode === 'initial' && !accepted) {
        app.quit()
        return
      }
      resolve()
    })
  })
}
