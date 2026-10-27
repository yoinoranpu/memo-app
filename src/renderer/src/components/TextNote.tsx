import { useEffect, useState } from 'react'
import type { Note } from '@shared/types'

interface Props {
  note: Note
}

export function TextNote({ note }: Props): React.JSX.Element {
  const [content, setContent] = useState(note.content ?? '')

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
        window.noteApi.updateContent(note.id, e.target.value)
      }}
    />
  )
}
