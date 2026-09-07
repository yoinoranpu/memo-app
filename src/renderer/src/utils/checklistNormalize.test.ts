import { describe, expect, it } from 'vitest'
import { normalizeChecklist } from './checklistNormalize'

describe('normalizeChecklist', () => {
  it('adds a trailing empty item to an empty list', () => {
    const result = normalizeChecklist([])
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('')
    expect(result[0].checked).toBe(false)
  })

  it('does not duplicate the trailing empty item when one already exists', () => {
    const items = [{ id: 'a', text: '牛乳を買う', checked: false }, { id: 'b', text: '', checked: false }]
    const result = normalizeChecklist(items)
    expect(result).toHaveLength(2)
    expect(result[1].text).toBe('')
  })

  it('preserves existing item ids so focus is not lost while typing', () => {
    const items = [{ id: 'a', text: '牛乳を買う', checked: false }]
    const result = normalizeChecklist(items)
    expect(result[0].id).toBe('a')
  })

  it('prunes emptied-out rows other than the trailing one', () => {
    const items = [
      { id: 'a', text: '', checked: false },
      { id: 'b', text: '卵を買う', checked: false }
    ]
    const result = normalizeChecklist(items)
    expect(result.map((it) => it.id)).not.toContain('a')
    expect(result.map((it) => it.text)).toEqual(['卵を買う', ''])
  })
})
