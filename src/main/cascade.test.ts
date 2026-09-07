import { describe, expect, it } from 'vitest'
import { findCascadePosition, type Rect } from './cascade'

const workArea = { x: 0, y: 0, width: 400, height: 300 }
const size = { width: 220, height: 160 }

describe('findCascadePosition', () => {
  it('places the first note near the work area origin', () => {
    const pos = findCascadePosition(workArea, size, [], null)
    expect(pos.x).toBeGreaterThanOrEqual(workArea.x)
    expect(pos.y).toBeGreaterThanOrEqual(workArea.y)
    expect(pos.x + size.width).toBeLessThanOrEqual(workArea.width)
    expect(pos.y + size.height).toBeLessThanOrEqual(workArea.height)
  })

  it('avoids overlapping an existing note when there is free space', () => {
    const wideWorkArea = { x: 0, y: 0, width: 700, height: 300 }
    const existing: Rect[] = [{ x: 16, y: 16, width: 220, height: 160 }]
    const pos = findCascadePosition(wideWorkArea, size, existing, null)
    const candidate: Rect = { x: pos.x, y: pos.y, width: size.width, height: size.height }
    const overlaps =
      candidate.x < existing[0].x + existing[0].width &&
      candidate.x + candidate.width > existing[0].x &&
      candidate.y < existing[0].y + existing[0].height &&
      candidate.y + candidate.height > existing[0].y
    expect(overlaps).toBe(false)
  })

  it('falls back to a diagonal cascade offset when no free grid spot remains', () => {
    const crampedWorkArea = { x: 0, y: 0, width: 300, height: 250 }
    const last: Rect = { x: 16, y: 16, width: 220, height: 160 }
    const pos = findCascadePosition(crampedWorkArea, size, [last], last)
    expect(pos.x).toBe(last.x + 30)
    expect(pos.y).toBe(last.y + 30)
  })
})
