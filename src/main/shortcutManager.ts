import { globalShortcut } from 'electron'
import { toggleAllVisibility } from './windowManager'

let currentAccelerator: string | null = null

export function registerToggleShortcut(accelerator: string): boolean {
  if (currentAccelerator) {
    globalShortcut.unregister(currentAccelerator)
    currentAccelerator = null
  }
  const ok = globalShortcut.register(accelerator, () => toggleAllVisibility())
  if (ok) currentAccelerator = accelerator
  return ok
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll()
  currentAccelerator = null
}
