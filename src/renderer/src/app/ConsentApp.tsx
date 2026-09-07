function getMode(): 'initial' | 'view' {
  return new URLSearchParams(window.location.search).get('mode') === 'view' ? 'view' : 'initial'
}

const POINTS = [
  'このアプリはインターネット通信を一切行いません。入力した内容はすべてお使いのパソコン内(%APPDATA%\\メモアプリ)にのみ保存され、外部に送信されることはありません。',
  '画面の最前面に表示する機能は、一般的な付箋・メモアプリと同じ仕組みを使っており、特別なシステム権限は必要としません。',
  '「PC起動時に自動的に起動する」機能は初期状態ではOFFです。設定画面でご自身がONにしない限り有効になりません。',
  'キーボードショートカット(既定: Ctrl+Alt+M)は、指定した特定のキーの組み合わせを検知するためだけに使われます。それ以外のキー入力を記録・送信することはありません。',
  '本ソフトウェアは無保証で提供されます。ご利用によって生じたいかなる損害についても、作者は責任を負いかねます。'
]

export function ConsentApp(): React.JSX.Element {
  const mode = getMode()

  const onPrimaryClick = (): void => {
    if (mode === 'initial') {
      window.consentApi.accept()
    } else {
      window.consentApi.close()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: '游ゴシック, sans-serif',
        fontSize: 13,
        color: '#333'
      }}
    >
      <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>ご利用にあたって</h2>
        <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
          {POINTS.map((point, i) => (
            <li key={i} style={{ marginBottom: 12 }}>
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', textAlign: 'right' }}>
        <button
          onClick={onPrimaryClick}
          style={{
            padding: '8px 20px',
            fontSize: 13,
            background: '#4a90d9',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {mode === 'initial' ? '同意して始める' : '閉じる'}
        </button>
      </div>
    </div>
  )
}
