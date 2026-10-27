import { BrowserWindow, dialog, ipcMain } from 'electron'
import { readFile, stat, writeFile, rename, unlink } from 'fs/promises'
import { IPC, type BackupResult } from '../shared/ipc'
import { getAllNotes } from './dataStore'
import { importBackupNotes } from './windowManager'
import { decodeBackup, encodeBackup, MAX_BACKUP_BYTES } from './backupFormat'

let busy = false
export function registerBackupHandlers(): void {
  for (const [channel, mode] of [[IPC.BACKUP_EXPORT, 'export'], [IPC.BACKUP_IMPORT, 'import']] as const) {
    ipcMain.handle(channel, async (event): Promise<BackupResult> => {
      if (busy) return { ok: false, message: '別のバックアップ操作が終わるまでお待ちください。' }
      const parent = BrowserWindow.fromWebContents(event.sender)
      if (!parent) return { ok: false, message: '設定画面を開き直してください。' }
      busy = true
      try {
        if (mode === 'export') {
          const result = await dialog.showSaveDialog(parent, {
            title: 'メモのバックアップを保存', defaultPath: 'memo-backup.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
          })
          if (result.canceled || !result.filePath) return { ok: true, message: 'キャンセルしました。' }
          const text = encodeBackup(getAllNotes())
          // Only produce files that this version can restore.
          decodeBackup(text)
          const temporaryPath = `${result.filePath}.${crypto.randomUUID()}.tmp`
          try {
            await writeFile(temporaryPath, text, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
            await rename(temporaryPath, result.filePath)
          } finally { await unlink(temporaryPath).catch(() => {}) }
          return { ok: true, message: 'バックアップを保存しました。' }
        }
        const result = await dialog.showOpenDialog(parent, {
          title: 'メモのバックアップを読み込む', properties: ['openFile'],
          filters: [{ name: 'JSON', extensions: ['json'] }]
        })
        if (result.canceled || !result.filePaths[0]) return { ok: true, message: 'キャンセルしました。' }
        if ((await stat(result.filePaths[0])).size > MAX_BACKUP_BYTES) throw new Error('ファイルが大きすぎます。上限は10MBです。')
        const notes = decodeBackup(await readFile(result.filePaths[0], 'utf8'))
        const confirm = await dialog.showMessageBox(parent, {
          type: 'question', buttons: ['追加する', 'キャンセル'], defaultId: 1, cancelId: 1,
          message: `${notes.length}件のメモを追加しますか？`,
          detail: '今あるメモは変更しません。同じファイルを再度読み込むと重複して追加されます。'
        })
        if (confirm.response !== 0) return { ok: true, message: 'キャンセルしました。' }
        importBackupNotes(notes)
        return { ok: true, message: `${notes.length}件のメモを追加しました。` }
      } catch {
        return { ok: false, message: mode === 'export'
          ? 'バックアップを保存できませんでした。保存先の空き容量と権限を確認してください。対応上限は200件・10MBです。'
          : 'バックアップを読み込めませんでした。対応するJSONファイルか確認してください（上限200件・10MB）。' }
      } finally { busy = false }
    })
  }
}
