import { useState } from 'react'
import type { Note } from '@shared/types'
import { usePressHoldDrag } from '../hooks/usePressHoldDrag'

interface Props {
  note: Note
  onContextMenu: (e: React.MouseEvent) => void
}

// Deliberately NOT icon_new_text/icon_new_checklist — those carry a "+" that
// reads as "create new", which is the wrong message for "this is a minimized
// note of this type". These are separate, dedicated type-indicator icons
// (see resources/icons/README.md for the generation prompt); until they're
// supplied, onError below falls back to shape + color only.
const TYPE_ICON: Record<Note['type'], string> = {
  text: 'icon_type_text',
  checklist: 'icon_type_checklist'
}

export function MinimizedChip({ note, onContextMenu }: Props): React.JSX.Element {
  const [iconOk, setIconOk] = useState(true)
  const { onMouseDown } = usePressHoldDrag(note.id, window.noteApi, { protectTextSelection: false })

  return (
    <div
      className={`minimized-chip ${note.type}`}
      style={{ background: note.color }}
      title="クリックで元に戻す(長押しで移動)"
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      onClick={() => window.noteApi.minimizeToggle(note.id)}
    >
      {iconOk && (
        <img
          className="minimized-chip-icon"
          src={`appicon://${TYPE_ICON[note.type]}`}
          alt=""
          draggable={false}
          onError={() => setIconOk(false)}
        />
      )}
    </div>
  )
}
