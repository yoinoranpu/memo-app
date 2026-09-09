import { useEffect, useState } from 'react'
import type { Note } from '@shared/types'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'

interface Props {
  note: Note
}

export function TextNote({ note }: Props): React.JSX.Element {
  const [content, setContent] = useState(note.content ?? '')
  const debouncedSave = useDebouncedCallback((value: string) => {
    window.noteApi.updateContent(note.id, value)
  }, 400)

  useEffect(() => {
    setContent(note.content ?? '')
  }, [note.id])

  return (
    <textarea
      className="note-textarea"
      style={{ fontSize: note.fontSize }}
      value={content}
      onChange={(e) => {
        setContent(e.target.value)
        debouncedSave(e.target.value)
      }}
    />
  )
}
