import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

export function setAutoLaunch(enabled: boolean): void {
  if (is.dev) return
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath
  })
}

export function isAutoLaunchEnabled(): boolean {
  if (is.dev) return false
  return app.getLoginItemSettings().openAtLogin
}
