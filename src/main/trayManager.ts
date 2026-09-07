import { app, Menu, Tray, nativeImage, type NativeImage } from 'electron'
import { openSettingsWindow } from './settingsWindow'
import { createNote } from './windowManager'
import { loadIcon } from './icons'

let tray: Tray | null = null

export function createTray(): void {
  const icon = loadIcon('tray_icon', 16)
  tray = new Tray(icon ?? loadIconFallback())
  tray.setToolTip('メモアプリ')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '新しいテキストメモ', icon: loadIcon('icon_new_text'), click: () => createNote('text') },
      { label: '新しいチェックリストメモ', icon: loadIcon('icon_new_checklist'), click: () => createNote('checklist') },
      { type: 'separator' },
      { label: '設定', icon: loadIcon('icon_settings'), click: () => openSettingsWindow() },
      { type: 'separator' },
      { label: '終了', icon: loadIcon('icon_exit'), click: () => app.quit() }
    ])
  )
  tray.on('double-click', () => createNote('text'))
}

function loadIconFallback(): NativeImage {
  // 1x1 transparent pixel, used only if tray_icon.png is somehow missing entirely.
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  )
}
