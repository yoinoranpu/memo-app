import { useCallback, useRef } from 'react'
import type { ResizeEdge } from '@shared/ipc'

export interface ResizeApi {
  resizeStart: (noteId: string, edge: ResizeEdge, screenX: number, screenY: number) => void
  resizeMove: (noteId: string, edge: ResizeEdge, screenX: number, screenY: number) => void
  resizeEnd: (noteId: string) => void
}

export function useResizeHandle(
  noteId: string,
  edge: ResizeEdge,
  api: ResizeApi
): { onMouseDown: (e: React.MouseEvent) => void } {
  const active = useRef(false)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!active.current) return
      api.resizeMove(noteId, edge, e.screenX, e.screenY)
    },
    [api, noteId, edge]
  )

  const handleMouseUp = useCallback(() => {
    if (!active.current) return
    active.current = false
    api.resizeEnd(noteId)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }, [api, noteId, handleMouseMove])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      active.current = true
      api.resizeStart(noteId, edge, e.screenX, e.screenY)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [api, noteId, edge, handleMouseMove, handleMouseUp]
  )

  return { onMouseDown }
}
