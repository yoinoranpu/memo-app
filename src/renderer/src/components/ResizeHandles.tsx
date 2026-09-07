import type { ResizeEdge } from '@shared/ipc'
import { useResizeHandle } from '../hooks/useResizeHandle'

interface Props {
  noteId: string
}

const EDGES: { edge: ResizeEdge; className: string }[] = [
  { edge: 'n', className: 'resize-n' },
  { edge: 's', className: 'resize-s' },
  { edge: 'e', className: 'resize-e' },
  { edge: 'w', className: 'resize-w' },
  { edge: 'ne', className: 'resize-ne' },
  { edge: 'nw', className: 'resize-nw' },
  { edge: 'se', className: 'resize-se' },
  { edge: 'sw', className: 'resize-sw' }
]

function Handle({ noteId, edge, className }: { noteId: string; edge: ResizeEdge; className: string }): React.JSX.Element {
  const { onMouseDown } = useResizeHandle(noteId, edge, window.noteApi)
  return <div className={`resize-handle ${className}`} onMouseDown={onMouseDown} />
}

export function ResizeHandles({ noteId }: Props): React.JSX.Element {
  return (
    <>
      {EDGES.map(({ edge, className }) => (
        <Handle key={edge} noteId={noteId} edge={edge} className={className} />
      ))}
    </>
  )
}
