import type { ChecklistItem } from '@shared/types'

/**
 * Ensures the list always ends with exactly one empty trailing item (the
 * "always show a blank line at the bottom" behavior), pruning any other
 * emptied-out rows. Existing item ids are preserved so the row the user is
 * actively typing in never remounts and loses focus.
 */
export function normalizeChecklist(items: ChecklistItem[]): ChecklistItem[] {
  const nonEmpty = items.filter((it) => it.text.trim() !== '')
  return [...nonEmpty, { id: crypto.randomUUID(), text: '', checked: false }]
}
