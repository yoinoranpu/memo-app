import { nativeImage, type NativeImage } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'

export function iconsDir(): string {
  return is.dev ? join(__dirname, '../../resources/icons') : join(process.resourcesPath, 'icons')
}

/**
 * Loads an icon the user drops into resources/icons/<name>.png. Returns undefined
 * when the file hasn't been supplied yet so callers can omit the icon gracefully
 * instead of showing a broken image.
 */
export function loadIcon(name: string, size = 16): NativeImage | undefined {
  const image = nativeImage.createFromPath(join(iconsDir(), `${name}.png`))
  if (image.isEmpty()) return undefined
  return image.resize({ width: size, height: size })
}
