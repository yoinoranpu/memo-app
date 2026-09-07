import { create } from 'zustand'
import type { Note } from '@shared/types'

interface NoteStoreState {
  note: Note | null
  setNote: (note: Note) => void
  patch: (p: Partial<Note>) => void
}

export const useNoteStore = create<NoteStoreState>((set) => ({
  note: null,
  setNote: (note) => set({ note }),
  patch: (p) => set((s) => (s.note ? { note: { ...s.note, ...p } } : s))
}))
