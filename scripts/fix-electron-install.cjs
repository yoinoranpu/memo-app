// Works around a reproducible hang in extract-zip's streaming zlib inflate
// under some Node.js versions (observed on Node v24.16.0): the raw (still
// compressed) zip entry stream reads fine, but yauzl's default inflate-piped
// stream never emits 'end' for the 2nd+ deflated entry, so `electron`'s own
// postinstall silently leaves node_modules/electron/dist with only the first
// (stored) file extracted and no electron.exe. This script detects that case
// and re-extracts using a synchronous zlib.inflateRawSync call instead of the
// streaming path, which sidesteps the hang entirely. No-ops if electron.exe
// is already present (the common case on unaffected environments).
const fs = require('fs')
const path = require('path')

if (process.platform !== 'win32') process.exit(0)

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron')
const distDir = path.join(electronDir, 'dist')
const exePath = path.join(distDir, 'electron.exe')

if (fs.existsSync(exePath)) {
  process.exit(0)
}

const { version } = require(path.join(electronDir, 'package.json'))
const zipName = `electron-v${version}-win32-x64.zip`

function findCachedZip(root) {
  if (!fs.existsSync(root)) return null
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.name === zipName) return full
    }
  }
  return null
}

const cacheRoot = process.env.electron_config_cache || path.join(process.env.LOCALAPPDATA || '', 'electron', 'Cache')
const zipPath = findCachedZip(cacheRoot)

if (!zipPath) {
  console.warn(
    `[fix-electron-install] ${zipName} が見つかりませんでした。もう一度 "npm install" を実行してください。`
  )
  process.exit(0)
}

console.log('[fix-electron-install] electron.exe が展開されていないため、キャッシュ済みzipから再展開します...')

const yauzl = require('yauzl')
const zlib = require('zlib')

fs.rmSync(distDir, { recursive: true, force: true })
fs.mkdirSync(distDir, { recursive: true })

yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
  if (err) {
    console.error('[fix-electron-install] zipを開けませんでした:', err)
    process.exit(1)
  }

  const total = zipfile.entryCount
  let done = 0

  zipfile.on('entry', (entry) => {
    const dest = path.join(distDir, entry.fileName)
    if (/\/$/.test(entry.fileName)) {
      fs.mkdirSync(dest, { recursive: true })
      done++
      zipfile.readEntry()
      return
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    zipfile.openReadStream(entry, { decompress: false }, (err2, rawStream) => {
      if (err2) {
        console.error('[fix-electron-install] エントリの読み込みに失敗:', entry.fileName, err2)
        process.exit(1)
      }
      const chunks = []
      rawStream.on('data', (c) => chunks.push(c))
      rawStream.on('error', (e) => {
        console.error('[fix-electron-install] ストリームエラー:', entry.fileName, e)
        process.exit(1)
      })
      rawStream.on('end', () => {
        const raw = Buffer.concat(chunks)
        const data = entry.compressionMethod === 8 ? zlib.inflateRawSync(raw) : raw
        fs.writeFileSync(dest, data)
        done++
        zipfile.readEntry()
      })
    })
  })

  zipfile.on('close', () => {
    fs.writeFileSync(path.join(electronDir, 'path.txt'), 'electron.exe')
    fs.writeFileSync(path.join(distDir, 'version'), `v${version}`)
    if (fs.existsSync(exePath)) {
      console.log(`[fix-electron-install] 完了 (${done}/${total} ファイル展開)`)
    } else {
      console.error('[fix-electron-install] 展開後もelectron.exeが見つかりません。')
      process.exit(1)
    }
  })

  zipfile.readEntry()
})
