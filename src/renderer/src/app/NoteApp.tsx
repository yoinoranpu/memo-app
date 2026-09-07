import { useEffect } from 'react'
import { useNoteStore } from '../store/noteStore'
import { TextNote } from '../components/TextNote'
import { ChecklistNote } from '../components/ChecklistNote'
import { ResizeHandles } from '../components/ResizeHandles'
import { MinimizedChip } from '../components/MinimizedChip'

function getNoteIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('noteId')
}

export function NoteApp(): React.JSX.Element | null {
  const note = useNoteStore((s) => s.note)
  const setNote = useNoteStore((s) => s.setNote)

  useEffect(() => {
    const noteId = getNoteIdFromUrl()
    if (!noteId) return
    window.noteApi.getInitial(noteId).then((loaded) => {
      if (loaded) setNote(loaded)
    })
    return window.noteApi.onDataUpdated((updated) => {
      if (updated.id === noteId) setNote(updated)
    })
  }, [setNote])

  useEffect(() => {
    if (!note) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') window.noteApi.minimizeToggle(note.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [note])

  if (!note) return null

  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    window.noteApi.openContextMenu(note.id)
  }

  if (note.minimized) {
    // Minimized notes hide their content entirely (not just shrink) — this is
    // meant for "tuck this out of sight so people around me can't read it", so
    // no text/checklist preview is shown, just a tiny colored chip with a type
    // icon. Still draggable (press-and-hold) like a full note.
    return (
      <div className="note-window minimized-window">
        <MinimizedChip note={note} onContextMenu={onContextMenu} />
      </div>
    )
  }

  return (
    <div className="note-window">
      <div className="note-card" style={{ background: note.color }} onContextMenu={onContextMenu}>
        <button
          className="minimize-button"
          title="最小化(クリックで元に戻す)"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => window.noteApi.minimizeToggle(note.id)}
        >
          −
        </button>
        {note.type === 'text' ? <TextNote note={note} /> : <ChecklistNote note={note} />}
      </div>
      <ResizeHandles noteId={note.id} />
    </div>
  )
}
