// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Simulate } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '@shared/types'
import { TextNote } from './TextNote'
import { ChecklistNote } from './ChecklistNote'

const note: Note = {
  id: 'note-1', type: 'text', content: '', items: [{ id: 'item-1', text: '', checked: false }],
  position: { x: 0, y: 0, monitorId: 'display-1' }, size: { width: 220, height: 160 },
  color: '#fff', fontSize: 14, zIndex: 1, minimized: false, updatedAt: '',
}
let container: HTMLDivElement
let root: Root
const updateContent = vi.fn()
const updateChecklist = vi.fn()
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Object.defineProperty(window, 'noteApi', { configurable: true, value: { updateContent, updateChecklist } })
  updateContent.mockClear()
  updateChecklist.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
describe('save before the editor is hidden', () => {
  it('submits the final text without advancing time or waiting for unmount', () => {
    act(() => root.render(<TextNote note={note} />))
    const input = container.querySelector('textarea')!
    act(() => { input.value = '最後の文字'; Simulate.change(input) })
    expect(updateContent).toHaveBeenLastCalledWith('note-1', '最後の文字')
    act(() => root.render(null))
    expect(vi.getTimerCount()).toBe(0)
    expect(updateContent).toHaveBeenCalledTimes(1)
  })
  it('submits the final checklist text and toggle immediately', () => {
    act(() => root.render(<ChecklistNote note={{ ...note, type: 'checklist' }} />))
    const input = container.querySelector<HTMLInputElement>('input[type=text]')!
    act(() => { input.value = '買い物'; Simulate.change(input) })
    expect(updateChecklist.mock.lastCall?.[1][0]).toMatchObject({ text: '買い物', checked: false })
    act(() => Simulate.click(container.querySelector('img')!))
    expect(updateChecklist.mock.lastCall?.[1][0]).toMatchObject({ text: '買い物', checked: true })
    act(() => root.render(null))
    expect(vi.getTimerCount()).toBe(0)
  })
})
