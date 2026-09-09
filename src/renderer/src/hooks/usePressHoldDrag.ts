import { useCallback, useRef } from 'react'

const HOLD_MS = 250
const STILL_THRESHOLD = 6

export interface DragApi {
  dragStart: (noteId: string, screenX: number, screenY: number) => void
  dragMove: (noteId: string, screenX: number, screenY: number) => void
  dragEnd: (noteId: string) => void
}

export interface PressHoldDragOptions {
  /**
   * When true (default), dragging only arms once the hold timer fires AND the
   * cursor stayed roughly in place until then — moving right away (a normal
   * click-drag text selection) never triggers a window move. Needed wherever
   * there's editable/selectable text under the pointer (TextNote, checklist
   * rows). Set to false where there's nothing to select (e.g. the minimized
   * chip) so any press-and-hold reliably becomes a drag even if the cursor
   * drifts a little during the hold.
   */
  protectTextSelection?: boolean
}

type DragPhase = 'idle' | 'pending' | 'dragging'

/**
 * Distinguishes a plain click from a press-and-hold drag (move the window),
 * per the spec: left-click = edit, left-click-and-hold = drag.
 */
export function usePressHoldDrag(
  noteId: string,
  api: DragApi,
  options: PressHoldDragOptions = {}
): { onMouseDown: (e: React.MouseEvent) => void } {
  const protectTextSelection = options.protectTextSelection ?? true
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
      lastMove.current = { x: e.screenX, y: e.screenY }
      if (phase.current === 'pending') {
        if (protectTextSelection) return
        // No text to protect here: arm dragging as soon as the cursor moves,
        // same as a hold — a fast intentional drag shouldn't wait for the timer.
        const dx = e.screenX - startScreen.current.x
        const dy = e.screenY - startScreen.current.y
        if (Math.hypot(dx, dy) <= STILL_THRESHOLD) return
        beginDragging()
      }
      e.preventDefault()
      if (!rafPending.current) {
        rafPending.current = true
        requestAnimationFrame(() => {
          rafPending.current = false
          api.dragMove(noteId, lastMove.current.x, lastMove.current.y)
        })
      }
    },
    [beginDragging, protectTextSelection, api, noteId]
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
      lastMove.current = { x: e.screenX, y: e.screenY }
      clearTimer()
      timer.current = window.setTimeout(() => {
        if (phase.current !== 'pending') return
        if (!protectTextSelection) {
          beginDragging()
          return
        }
        const dx = lastMove.current.x - startScreen.current.x
        const dy = lastMove.current.y - startScreen.current.y
        // Still roughly where the press started → a genuine hold, not a
        // selection drag that happened to still be going after 250ms.
        if (Math.hypot(dx, dy) <= STILL_THRESHOLD) beginDragging()
      }, HOLD_MS)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [beginDragging, protectTextSelection, handleMouseMove, handleMouseUp]
  )

  return { onMouseDown }
}
