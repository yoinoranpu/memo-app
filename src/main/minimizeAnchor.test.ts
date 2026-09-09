import { describe, expect, it } from 'vitest'
import { clampRectToWorkArea, minimizeAnchor, restoreAnchor } from './minimizeAnchor'

const chipSize = { width: 48, height: 48 }
const workArea = { x: 0, y: 0, width: 1920, height: 1080 }

describe('minimizeAnchor / restoreAnchor', () => {
  it('anchors the chip to the full note\'s top-right corner', () => {
    const chip = minimizeAnchor({ x: 100, y: 100 }, { width: 220, height: 160 }, chipSize)
    expect(chip).toEqual({ x: 272, y: 100 })
  })

  it('is the exact inverse of minimizeAnchor with no drag in between', () => {
    const fullPosition = { x: 100, y: 100 }
    const fullSize = { width: 220, height: 160 }
    const chip = minimizeAnchor(fullPosition, fullSize, chipSize)
    const restored = restoreAnchor(chip, fullSize, chipSize)
    expect(restored).toEqual(fullPosition)
  })

  it('never drifts across many repeated minimize/restore cycles', () => {
    let position = { x: 300, y: 250 }
    const size = { width: 220, height: 160 }
    for (let i = 0; i < 50; i++) {
      const chip = minimizeAnchor(position, size, chipSize)
      position = restoreAnchor(chip, size, chipSize)
    }
    expect(position).toEqual({ x: 300, y: 250 })
  })

  it('does not compound when restore persists the un-clamped position', () => {
    // Regression test for the bug where restore failed to persist any
    // position at all: the next minimize then anchored off the *previous*
    // chip position, shifting further right on every single cycle.
    let position = { x: 100, y: 100 }
    const size = { width: 220, height: 160 }
    const xsAfterEachMinimize: number[] = []
    for (let i = 0; i < 5; i++) {
      const chip = minimizeAnchor(position, size, chipSize)
      xsAfterEachMinimize.push(chip.x)
      position = restoreAnchor(chip, size, chipSize)
    }
    expect(new Set(xsAfterEachMinimize).size).toBe(1)
  })
})

describe('clampRectToWorkArea', () => {
  it('leaves a rect that already fits untouched', () => {
    const clamped = clampRectToWorkArea({ x: 100, y: 100, width: 220, height: 160 }, workArea)
    expect(clamped).toEqual({ x: 100, y: 100 })
  })

  it('pulls a rect back onto the right/bottom edge when it overflows', () => {
    const clamped = clampRectToWorkArea({ x: 1850, y: 1050, width: 220, height: 160 }, workArea)
    expect(clamped).toEqual({ x: 1700, y: 920 })
  })

  it('pulls a rect back onto the left/top edge when it starts off-screen', () => {
    const clamped = clampRectToWorkArea({ x: -50, y: -20, width: 220, height: 160 }, workArea)
    expect(clamped).toEqual({ x: 0, y: 0 })
  })
})
