import { useEffect, useState } from 'react'
import type { Settings } from '@shared/types'

function acceleratorFromEvent(e: KeyboardEvent): string | null {
  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta']
  if (modifierKeys.includes(e.key)) return null
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Super')
  if (parts.length === 0) return null
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
  parts.push(key)
  return parts.join('+')
}

export function SettingsApp(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [backupBusy, setBackupBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    window.settingsApi.get().then(setSettings)
  }, [])

  useEffect(() => {
    if (!recording) return
    const onKeyDown = (e: KeyboardEvent): void => {
      e.preventDefault()
      const accelerator = acceleratorFromEvent(e)
      if (!accelerator) return
      setRecording(false)
      save({ shortcutToggleAll: accelerator })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [recording])

  const save = (patch: Partial<Settings>): void => {
    window.settingsApi.update(patch).then((result) => {
      setSettings(result.settings)
      setMessage(result.ok ? '保存しました' : result.error ?? '保存に失敗しました')
      setTimeout(() => setMessage(null), 3000)
    })
  }

  const backup = async (mode: 'export' | 'import'): Promise<void> => {
    setBackupBusy(true)
    try {
      const result = await (mode === 'export' ? window.settingsApi.exportBackup() : window.settingsApi.importBackup())
      setMessage(result.message)
    } catch { setMessage('バックアップ操作に失敗しました。もう一度お試しください。') }
    finally { setBackupBusy(false) }
  }

  if (!settings) return <div style={{ padding: 16 }}>読み込み中...</div>

  return (
    <div style={{ padding: 16, fontFamily: '游ゴシック, sans-serif', fontSize: 13 }}>
      <h2 style={{ fontSize: 15, margin: '0 0 16px' }}>設定</h2>

      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 6 }}>全メモ表示/非表示のショートカット</div>
        <button
          onClick={() => setRecording(true)}
          style={{ padding: '6px 12px', minWidth: 160 }}
        >
          {recording ? 'キーを押してください...' : settings.shortcutToggleAll}
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.autoLaunch}
            onChange={(e) => save({ autoLaunch: e.target.checked })}
          />
          PC起動時に自動的に起動する
        </label>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => window.settingsApi.openDisclosure()} style={{ padding: '6px 12px' }}>
          このアプリについて(データの扱い・免責事項)
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13 }}>メモのバックアップ</h3>
        <button disabled={backupBusy} onClick={() => backup('export')}>書き出し</button>{' '}
        <button disabled={backupBusy} onClick={() => backup('import')}>読み込み</button>
        <p>読み込みは今あるメモを残して追加します。バックアップにはメモの内容が暗号化されずに保存されます。</p>
      </div>
      {message && <div role="status" style={{ color: '#555' }}>{message}</div>}
    </div>
  )
}
