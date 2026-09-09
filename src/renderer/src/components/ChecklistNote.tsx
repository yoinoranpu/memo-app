import { useEffect, useRef, useState } from 'react'
import type { ChecklistItem, Note } from '@shared/types'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import { normalizeChecklist } from '../utils/checklistNormalize'
import { ChecklistItemRow } from './ChecklistItemRow'

interface Props {
  note: Note
}

export function ChecklistNote({ note }: Props): React.JSX.Element {
  const [items, setItems] = useState<ChecklistItem[]>(() => normalizeChecklist(note.items ?? []))
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const debouncedSave = useDebouncedCallback((value: ChecklistItem[]) => {
    window.noteApi.updateChecklist(note.id, value)
  }, 400)

  useEffect(() => {
    setItems(normalizeChecklist(note.items ?? []))
  }, [note.id])

  const applyChange = (updated: ChecklistItem[]): void => {
    const next = normalizeChecklist(updated)
    setItems(next)
    debouncedSave(next)
  }

  const focusNext = (currentId: string): void => {
    const index = items.findIndex((it) => it.id === currentId)
    const next = items[index + 1]
    if (next) inputRefs.current[next.id]?.focus()
  }

  return (
    <div className="checklist-body">
      {items.map((item) => (
        <ChecklistItemRow
          key={item.id}
          item={item}
          fontSize={note.fontSize}
          inputRef={(el) => {
            inputRefs.current[item.id] = el
          }}
          onTextChange={(text) => applyChange(items.map((it) => (it.id === item.id ? { ...it, text } : it)))}
          onToggle={() => applyChange(items.map((it) => (it.id === item.id ? { ...it, checked: !it.checked } : it)))}
          onEnter={() => focusNext(item.id)}
        />
      ))}
    </div>
  )
}
