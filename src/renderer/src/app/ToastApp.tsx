function getDeletedNoteId(): string | null {
  return new URLSearchParams(window.location.search).get('deletedNoteId')
}

export function ToastApp(): React.JSX.Element {
  const deletedNoteId = getDeletedNoteId()

  const onUndo = (): void => {
    if (!deletedNoteId) return
    window.toastApi.undo(deletedNoteId).then(() => window.toastApi.close())
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '0 14px',
        background: 'rgba(40,40,40,0.92)',
        color: '#fff',
        borderRadius: 8,
        fontFamily: '游ゴシック, sans-serif',
        fontSize: 13
      }}
    >
      <span>削除しました</span>
      <button
        onClick={onUndo}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#8ecbff',
          cursor: 'pointer',
          fontSize: 13,
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        <img
          src="appicon://icon_undo"
          alt=""
          style={{ width: 14, height: 14 }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        元に戻す
      </button>
    </div>
  )
}
