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

// Shown once, right after the user accepts the first-launch disclosure.
// People who aren't familiar with PCs (only smartphones) have no reason to
// know "system tray" is a thing or where to look. Note: on Windows 10/11 this
// renders as a plain corner notification, not the classic balloon with an
// arrow pointing at the icon (that visual was dropped years ago) — so the
// text itself has to say where to look rather than relying on it "pointing".
export function showFirstRunBalloon(): void {
  tray?.displayBalloon({
    title: 'メモアプリの使い方',
    content:
      '画面右下、時計のそばにある小さいアイコンを右クリックすると使えます。見当たらない場合は「^」マークをクリックすると出てきます。'
  })
}

function loadIconFallback(): NativeImage {
  // 1x1 transparent pixel, used only if tray_icon.png is somehow missing entirely.
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  )
}
