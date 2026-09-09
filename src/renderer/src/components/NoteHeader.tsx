import { usePressHoldDrag } from '../hooks/usePressHoldDrag'

interface Props {
  noteId: string
}

// The familiar "grab the title bar to move a window" pattern: this thin strip
// is the only drag target on the note, so content below it never has to
// disambiguate a drag from a text selection — clicking there is always just
// editing. No hold delay is needed here since there's nothing to select.
export function NoteHeader({ noteId }: Props): React.JSX.Element {
  const { onMouseDown } = usePressHoldDrag(noteId, window.noteApi, { protectTextSelection: false })

  return (
    <div className="note-header" onMouseDown={onMouseDown}>
      <button
        className="minimize-button"
        title="最小化(クリックで元に戻す)"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => window.noteApi.minimizeToggle(noteId)}
      >
        −
      </button>
    </div>
  )
}
