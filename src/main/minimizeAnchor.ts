// Pure position math for the minimize/restore toggle, kept dependency-free
// (no Electron import) so it can be unit tested directly — this exact logic
// has been the source of two separate real bugs (drift on repeated cycling,
// and a right-ward compounding shift), so it's worth pinning down in tests
// rather than re-deriving it by inspection every time it's touched.

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Where the minimized chip's top-left goes, anchored to the full note's
 * top-right corner (so it visually collapses into the minimize button there).
 */
export function minimizeAnchor(fullPosition: Point, fullSize: Size, chipSize: Size): Point {
  return {
    x: fullPosition.x + (fullSize.width - chipSize.width),
    y: fullPosition.y
  }
}

/**
 * The exact inverse of minimizeAnchor: given the chip's current top-left,
 * what full-size top-left keeps that same top-right corner fixed. This is
 * intentionally the value that should be persisted after a restore (not the
 * screen-clamped one) — it's what makes minimizeAnchor(restoreAnchor(p)) a
 * true no-op round trip regardless of how many times it repeats.
 */
export function restoreAnchor(chipPosition: Point, fullSize: Size, chipSize: Size): Point {
  return {
    x: chipPosition.x - (fullSize.width - chipSize.width),
    y: chipPosition.y
  }
}

/**
 * Nudges a rect to fit inside a work area, for on-screen display only. The
 * minimize/restore toggle must never persist this result as the note's real
 * position — see restoreAnchor's doc comment.
 */
export function clampRectToWorkArea(rect: Rect, workArea: Rect): Point {
  const maxX = workArea.x + Math.max(0, workArea.width - rect.width)
  const maxY = workArea.y + Math.max(0, workArea.height - rect.height)
  return {
    x: Math.min(Math.max(rect.x, workArea.x), maxX),
    y: Math.min(Math.max(rect.y, workArea.y), maxY)
  }
}
