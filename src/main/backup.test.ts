import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC } from '../shared/ipc'
import { encodeBackup } from './backupFormat'
import type { Note } from '../shared/types'

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown) => Promise<unknown>>(),
  showSaveDialog: vi.fn(), showOpenDialog: vi.fn(), showMessageBox: vi.fn(),
  readFile: vi.fn(), stat: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), unlink: vi.fn(),
  getAllNotes: vi.fn(), importBackupNotes: vi.fn(),
}))
vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: () => ({}) },
  dialog: { showSaveDialog: mocks.showSaveDialog, showOpenDialog: mocks.showOpenDialog, showMessageBox: mocks.showMessageBox },
  ipcMain: { handle: (name: string, handler: (event: unknown) => Promise<unknown>) => mocks.handlers.set(name, handler) }
}))
vi.mock('fs/promises', () => ({ readFile: mocks.readFile, stat: mocks.stat, writeFile: mocks.writeFile, rename: mocks.rename, unlink: mocks.unlink }))
vi.mock('./dataStore', () => ({ getAllNotes: mocks.getAllNotes }))
vi.mock('./windowManager', () => ({ importBackupNotes: mocks.importBackupNotes }))
import { registerBackupHandlers } from './backup'
const note: Note = {
  id: 'old', type: 'text', content: '大事なメモ', items: null,
  position: { x: 0, y: 0, monitorId: 'display' }, size: { width: 220, height: 160 },
  color: '#FFF6C2', fontSize: 14, zIndex: 1, minimized: false, updatedAt: ''
}
const call = (name: string): Promise<unknown> => mocks.handlers.get(name)!({ sender: {} })
beforeEach(() => {
  vi.resetAllMocks()
  registerBackupHandlers()
  mocks.getAllNotes.mockReturnValue([note])
  mocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/backup.json' })
  mocks.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/backup.json'] })
  mocks.showMessageBox.mockResolvedValue({ response: 0 })
  mocks.stat.mockResolvedValue({ size: 100 })
  mocks.readFile.mockResolvedValue(encodeBackup([note]))
  mocks.writeFile.mockResolvedValue(undefined)
  mocks.rename.mockResolvedValue(undefined)
  mocks.unlink.mockResolvedValue(undefined)
})
describe('backup file operations', () => {
  it('replaces the chosen backup only after a complete temporary write', async () => {
    expect(await call(IPC.BACKUP_EXPORT)).toMatchObject({ ok: true })
    expect(mocks.writeFile.mock.calls[0][0]).toMatch(/^\/backup.json\..+\.tmp$/)
    expect(mocks.rename).toHaveBeenCalledWith(mocks.writeFile.mock.calls[0][0], '/backup.json')
  })
  it('does not replace an existing backup when writing fails', async () => {
    mocks.writeFile.mockRejectedValue(new Error('disk full'))
    expect(await call(IPC.BACKUP_EXPORT)).toMatchObject({ ok: false })
    expect(mocks.rename).not.toHaveBeenCalled()
    expect(mocks.unlink).toHaveBeenCalled()
    // The operation lock must also be released after failure.
    mocks.writeFile.mockResolvedValue(undefined)
    expect(await call(IPC.BACKUP_EXPORT)).toMatchObject({ ok: true })
  })
  it('does not write or import when the file dialog is canceled', async () => {
    mocks.showSaveDialog.mockResolvedValue({ canceled: true })
    mocks.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    await call(IPC.BACKUP_EXPORT)
    await call(IPC.BACKUP_IMPORT)
    expect(mocks.writeFile).not.toHaveBeenCalled()
    expect(mocks.importBackupNotes).not.toHaveBeenCalled()
  })
  it('validates the entire file before confirming and adding notes', async () => {
    await call(IPC.BACKUP_IMPORT)
    expect(mocks.showMessageBox).toHaveBeenCalled()
    expect(mocks.importBackupNotes).toHaveBeenCalledWith([expect.objectContaining({ content: '大事なメモ' })])
  })
  it('does not change notes when the file is invalid or confirmation is canceled', async () => {
    mocks.readFile.mockResolvedValue('{broken')
    expect(await call(IPC.BACKUP_IMPORT)).toMatchObject({ ok: false })
    expect(mocks.showMessageBox).not.toHaveBeenCalled()
    mocks.readFile.mockResolvedValue(encodeBackup([note]))
    mocks.showMessageBox.mockResolvedValue({ response: 1 })
    await call(IPC.BACKUP_IMPORT)
    expect(mocks.importBackupNotes).not.toHaveBeenCalled()
  })
})
