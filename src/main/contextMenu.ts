import { Menu, type BrowserWindow } from 'electron'
import { COLOR_PRESETS, FONT_SIZES } from '../shared/types'
import { createNote, getNoteWindow, sendToBack, setNoteColor, setNoteFontSize, deleteNoteWithUndo } from './windowManager'
import { loadIcon } from './icons'

const COLOR_LABELS: Record<string, string> = {
  '#FFF6C2': '黄色',
  '#D8EEFF': '水色',
  '#FFD8E4': 'ピンク',
  '#DDF5D8': '緑',
  '#EBE0FF': '紫',
  '#F0F0F0': 'グレー'
}

const FONT_SIZE_LABELS: Record<number, string> = {
  12: '小',
  14: '中',
  18: '大'
}

export function showNoteContextMenu(noteId: string, atWindow: BrowserWindow): void {
  const menu = Menu.buildFromTemplate([
    {
      label: '新しいテキストメモ',
      icon: loadIcon('icon_new_text'),
      click: () => createNote('text')
    },
    {
      label: '新しいチェックリストメモ',
      icon: loadIcon('icon_new_checklist'),
      click: () => createNote('checklist')
    },
    { type: 'separator' },
    {
      label: '背面に送る',
      icon: loadIcon('icon_send_back'),
      click: () => sendToBack(noteId)
    },
    {
      label: '色を変更',
      icon: loadIcon('icon_color'),
      submenu: COLOR_PRESETS.map((color) => ({
        label: COLOR_LABELS[color] ?? color,
        click: () => setNoteColor(noteId, color)
      }))
    },
    {
      label: '文字のサイズ',
      icon: loadIcon('icon_font_size'),
      submenu: FONT_SIZES.map((size) => ({
        label: FONT_SIZE_LABELS[size] ?? String(size),
        click: () => setNoteFontSize(noteId, size)
      }))
    },
    { type: 'separator' },
    {
      label: '削除',
      icon: loadIcon('icon_delete'),
      click: () => deleteNoteWithUndo(noteId)
    }
  ])

  const win = getNoteWindow(noteId) ?? atWindow
  menu.popup({ window: win })
}
