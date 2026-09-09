import { app, globalShortcut, protocol } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { bootstrapFromStore } from './windowManager'
import { registerIpcHandlers } from './ipcHandlers'
import { createTray, showFirstRunBalloon } from './trayManager'
import { registerToggleShortcut } from './shortcutManager'
import { registerIconProtocol } from './iconProtocol'
import { openConsentWindow } from './consentWindow'
import { getSettings } from './dataStore'

app.setName('メモアプリ')

protocol.registerSchemesAsPrivileged([
  { scheme: 'appicon', privileges: { standard: true, supportFetchAPI: true, corsEnabled: true } }
])

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Another launch attempt happened; this app has no single "main window" to
    // focus, so we simply no-op and let the existing instance keep running.
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.memoapp')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerIconProtocol()
    registerIpcHandlers()
    createTray()

    // First launch: block note/shortcut startup on the user accepting the
    // disclosure page (closing it without agreeing quits the app instead).
    if (!getSettings().hasAcceptedDisclosure) {
      await openConsentWindow('initial')
      showFirstRunBalloon()
    }

    bootstrapFromStore()
    registerToggleShortcut(getSettings().shortcutToggleAll)
  })

  app.on('window-all-closed', () => {
    // Note windows can all be closed while the app itself stays running in the
    // tray, since this is a tray-resident utility app, not a document window app.
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}
