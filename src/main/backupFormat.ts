import type { ChecklistItem, Note } from '../shared/types'

export interface BackupNote {
  type: Note['type']
  content: string | null
  items: ChecklistItem[] | null
  color: string
  fontSize: number
}
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024

export function encodeBackup(notes: Note[]): string {
  return JSON.stringify({
    format: 'memo-app-backup', version: 1,
    notes: notes.map(({ type, content, items, color, fontSize }) => ({ type, content, items, color, fontSize }))
  }, null, 2)
}

export function decodeBackup(text: string): BackupNote[] {
  const fail = (): never => { throw new Error('対応するメモアプリのバックアップではありません。') }
  if (Buffer.byteLength(text, 'utf8') > MAX_BACKUP_BYTES) fail()
  const value = JSON.parse(text)
  if (!value || value.format !== 'memo-app-backup' || value.version !== 1 || !Array.isArray(value.notes) || value.notes.length > 200) fail()
  return value.notes.map((note: unknown) => {
    if (!note || typeof note !== 'object') return fail()
    const n = note as Record<string, unknown>
    if (n.type !== 'text' && n.type !== 'checklist') return fail()
    if (typeof n.color !== 'string' || !/^#[\da-f]{6}$/i.test(n.color)) return fail()
    if (typeof n.fontSize !== 'number' || ![12, 14, 18].includes(n.fontSize)) return fail()
    let content: string | null = null
    let items: ChecklistItem[] | null = null
    if (n.type === 'text') {
      if (typeof n.content !== 'string' || n.content.length > 1_000_000) return fail()
      content = n.content
    } else {
      if (!Array.isArray(n.items) || n.items.length > 1000) return fail()
      items = n.items.map((item: unknown) => {
        if (!item || typeof item !== 'object') return fail()
        const row = item as Record<string, unknown>
        if (typeof row.text !== 'string' || row.text.length > 1_000_000 || typeof row.checked !== 'boolean') return fail()
        return { id: crypto.randomUUID(), text: row.text, checked: row.checked }
      })
    }
    return { type: n.type, content, items, color: n.color, fontSize: n.fontSize }
  })
}
