import { describe, expect, it } from 'vitest'
import { decodeBackup, encodeBackup, MAX_BACKUP_BYTES } from './backupFormat'
import type { Note } from '../shared/types'

const note: Note = {
  id: 'old', type: 'text', content: '日本語のメモ', items: null,
  position: { x: -9999, y: 0, monitorId: 'old-pc' }, size: { width: 220, height: 160 },
  color: '#FFF6C2', fontSize: 14, zIndex: 2, minimized: false, updatedAt: ''
}
describe('portable backups', () => {
  it('round-trips text without machine-specific IDs or positions', () => {
    const text = encodeBackup([note])
    expect(text).not.toContain('old-pc')
    expect(decodeBackup(text)).toEqual([{ type: 'text', content: note.content, items: null, color: note.color, fontSize: 14 }])
  })
  it('preserves checklist text and checks but generates fresh row IDs', () => {
    const result = decodeBackup(encodeBackup([{ ...note, type: 'checklist', content: null, items: [{ id: 'old', text: '牛乳', checked: true }] }]))
    expect(result[0].items?.[0]).toMatchObject({ text: '牛乳', checked: true })
    expect(result[0].items?.[0].id).not.toBe('old')
  })
  it('rejects invalid formats, versions, styles, oversized files and partial invalid data', () => {
    for (const value of [null, { format: 'memo-app-backup', version: 2, notes: [] },
      { format: 'memo-app-backup', version: 1, notes: [{ type: 'text', content: '', color: 'url(https://example.org)', fontSize: 14 }] },
      { format: 'memo-app-backup', version: 1, notes: [JSON.parse(encodeBackup([note])).notes[0], {}] },
      { format: 'memo-app-backup', version: 1, notes: Array(201).fill({}) }]) {
      expect(() => decodeBackup(JSON.stringify(value))).toThrow()
    }
    expect(() => decodeBackup(' '.repeat(MAX_BACKUP_BYTES + 1))).toThrow()
  })
})
