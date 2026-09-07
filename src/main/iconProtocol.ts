import { protocol, net } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { iconsDir } from './icons'

/**
 * Serves resources/icons/<name>.png to the renderer as appicon://<name>, so
 * note/toast windows can show the same user-supplied illustrations as the
 * native tray/context menus without bundling them into the Vite build.
 */
export function registerIconProtocol(): void {
  protocol.handle('appicon', (request) => {
    const name = request.url.replace('appicon://', '').replace(/\/+$/, '')
    const filePath = join(iconsDir(), `${name}.png`)
    if (!existsSync(filePath)) {
      return new Response(null, { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
}
