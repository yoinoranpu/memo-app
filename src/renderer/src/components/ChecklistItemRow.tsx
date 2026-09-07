import { useState } from 'react'
import type { ChecklistItem } from '@shared/types'

interface Props {
  item: ChecklistItem
  fontSize: number
  inputRef: (el: HTMLInputElement | null) => void
  onTextChange: (text: string) => void
  onToggle: () => void
  onEnter: () => void
}

export function ChecklistItemRow({ item, fontSize, inputRef, onTextChange, onToggle, onEnter }: Props): React.JSX.Element {
  const [iconOk, setIconOk] = useState(true)

  return (
    <div className={`checklist-row${item.checked ? ' checked' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
      {iconOk ? (
        <img
          className="checklist-checkbox"
          src={`appicon://${item.checked ? 'checkbox_checked' : 'checkbox_unchecked'}`}
          alt=""
          onClick={onToggle}
          onError={() => setIconOk(false)}
        />
      ) : (
        <input type="checkbox" checked={item.checked} onChange={onToggle} />
      )}
      <input
        ref={inputRef}
        type="text"
        style={{ fontSize }}
        value={item.text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
      />
    </div>
  )
}
