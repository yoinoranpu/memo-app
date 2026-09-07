import { useCallback, useRef } from 'react'

const HOLD_MS = 250
const MOVE_THRESHOLD = 4

export interface DragApi {
  dragStart: (noteId: string, screenX: number, screenY: number) => void
  dragMove: (noteId: string, screenX: number, screenY: number) => void
  dragEnd: (noteId: string) => void
}

type DragPhase = 'idle' | 'pending' | 'dragging'

/**
 * Distinguishes a plain click (edit) from a press-and-hold drag (move the window),
 * per the spec: left-click = edit, left-click-and-hold = drag. Movement past a
 * small threshold also arms dragging immediately so fast intentional drags aren't
 * stuck waiting for the hold timer.
 */
export function usePressHoldDrag(noteId: string, api: DragApi): { onMouseDown: (e: React.MouseEvent) => void } {
  const phase = useRef<DragPhase>('idle')
  const startScreen = useRef({ x: 0, y: 0 })
  const timer = useRef<number | null>(null)
  const rafPending = useRef(false)
  const lastMove = useRef({ x: 0, y: 0 })

  const clearTimer = (): void => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  const beginDragging = useCallback(() => {
    phase.current = 'dragging'
    clearTimer()
    window.getSelection()?.removeAllRanges()
    api.dragStart(noteId, startScreen.current.x, startScreen.current.y)
  }, [api, noteId])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (phase.current === 'idle') return
      if (phase.current === 'pending') {
        const dx = e.screenX - startScreen.current.x
        const dy = e.screenY - startScreen.current.y
        if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
          beginDragging()
        } else {
          return
        }
      }
      e.preventDefault()
      lastMove.current = { x: e.screenX, y: e.screenY }
      if (!rafPending.current) {
        rafPending.current = true
        requestAnimationFrame(() => {
          rafPending.current = false
          api.dragMove(noteId, lastMove.current.x, lastMove.current.y)
        })
      }
    },
    [api, noteId, beginDragging]
  )

  const handleMouseUp = useCallback(() => {
    clearTimer()
    if (phase.current === 'dragging') {
      api.dragEnd(noteId)
      // Because dragging moves the whole OS window to follow the cursor
      // (rather than the element moving under a fixed viewport), the cursor
      // ends up right back over the same element at mouseup, so the browser
      // still synthesizes a native 'click' afterwards. Swallow just that one
      // click so a drag never also triggers whatever the click would do
      // (e.g. restoring a minimized note right where it was just dropped).
      const suppressClick = (ce: MouseEvent): void => {
        ce.stopPropagation()
        ce.preventDefault()
      }
      window.addEventListener('click', suppressClick, { capture: true, once: true })
    }
    phase.current = 'idle'
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }, [api, noteId, handleMouseMove])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      phase.current = 'pending'
      startScreen.current = { x: e.screenX, y: e.screenY }
      clearTimer()
      timer.current = window.setTimeout(() => {
        if (phase.current === 'pending') beginDragging()
      }, HOLD_MS)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [beginDragging, handleMouseMove, handleMouseUp]
  )

  return { onMouseDown }
}
