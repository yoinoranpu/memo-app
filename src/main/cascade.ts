import type { Size } from '../shared/types'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface WorkArea {
  x: number
  y: number
  width: number
  height: number
}

const GRID_STEP = 24
const CASCADE_OFFSET = 30
const MARGIN = 16

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function fitsInWorkArea(rect: Rect, workArea: WorkArea): boolean {
  return (
    rect.x >= workArea.x + MARGIN &&
    rect.y >= workArea.y + MARGIN &&
    rect.x + rect.width <= workArea.x + workArea.width - MARGIN &&
    rect.y + rect.height <= workArea.y + workArea.height - MARGIN
  )
}

/**
 * Finds a non-overlapping spot for a new note on the given monitor's work area.
 * Falls back to a diagonal cascade offset from the last note when the area is full,
 * wrapping back near the work area origin before running off-screen.
 */
export function findCascadePosition(
  workArea: WorkArea,
  size: Size,
  existing: Rect[],
  lastCreated: Rect | null
): { x: number; y: number } {
  for (let y = workArea.y + MARGIN; y + size.height <= workArea.y + workArea.height - MARGIN; y += GRID_STEP) {
    for (let x = workArea.x + MARGIN; x + size.width <= workArea.x + workArea.width - MARGIN; x += GRID_STEP) {
      const candidate: Rect = { x, y, width: size.width, height: size.height }
      if (!existing.some((r) => overlaps(candidate, r))) {
        return { x, y }
      }
    }
  }

  const base = lastCreated ?? { x: workArea.x + MARGIN, y: workArea.y + MARGIN, width: size.width, height: size.height }
  let candidate: Rect = {
    x: base.x + CASCADE_OFFSET,
    y: base.y + CASCADE_OFFSET,
    width: size.width,
    height: size.height
  }
  if (!fitsInWorkArea(candidate, workArea)) {
    candidate = { x: workArea.x + MARGIN, y: workArea.y + MARGIN, width: size.width, height: size.height }
  }
  return { x: candidate.x, y: candidate.y }
}
