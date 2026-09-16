# イラスト・アイコンの受け渡し場所

企画書の「10. 必要なイラスト・アイコン一覧」で用意する画像は、すべてこのフォルダに **企画書と同じファイル名のPNG** として置くだけで自動的に反映される（アプリの再起動が必要）。

| ファイル名 | 用途 | 状態 |
|---|---|---|
| `app_icon.png` | exe/インストーラー/タスクバー用アイコン（推奨256x256〜1024x1024） | ✅ 本番画像に差し替え済み |
| `tray_icon.png` | タスクトレイ用アイコン（推奨32x32、自動で16x16にリサイズ） | ✅ 本番画像に差し替え済み |
| `icon_new_text.png` | 詳細メニュー「新しいテキストメモ」 | ✅ 反映済み |
| `icon_new_checklist.png` | 詳細メニュー「新しいチェックリストメモ」 | ✅ 反映済み |
| `icon_send_back.png` | 詳細メニュー「背面に送る」 | ✅ 反映済み |
| `icon_color.png` | 詳細メニュー「色を変更」 | ✅ 反映済み |
| `icon_font_size.png` | 詳細メニュー「文字のサイズ」 | ✅ 反映済み |
| `icon_delete.png` | 詳細メニュー「削除」 | ✅ 反映済み |
| `icon_settings.png` | タスクトレイメニュー「設定」 | ✅ 反映済み |
| `icon_exit.png` | タスクトレイメニュー「終了」 | ✅ 反映済み |
| `icon_undo.png` | 削除トースト通知の「元に戻す」 | ✅ 反映済み |
| `checkbox_unchecked.png` | チェックリスト行の未チェック状態 | ✅ 反映済み |
| `checkbox_checked.png` | チェックリスト行のチェック済み状態 | ✅ 反映済み |
| `icon_type_text.png` | **(新規)** 最小化チップ内の「テキストメモ」種別アイコン | ⏳ 未配置（プロンプトは下記） |
| `icon_type_checklist.png` | **(新規)** 最小化チップ内の「チェックリスト」種別アイコン | ⏳ 未配置（プロンプトは下記） |
| `corner_fold.png` | 付箋の角の装飾（任意） | ⏳ 未配線 |
| `onboarding_illustration.png` | 初回起動時の説明用（任意・優先度低） | ⏳ 未配線 |

まだファイルが無い項目は自動的にアイコン無し（形と色だけ）で表示されるので、一部だけ先に置いても問題ない。`resources/icons/<ファイル名>.png` として保存し、アプリを再起動すれば反映される。

## `icon_type_text` / `icon_type_checklist` について

最小化した時の小さいチップ(丸型＝チェックリスト／角丸四角＝テキスト)の中に表示する、**種類を示すためだけの**アイコン。`icon_new_text` / `icon_new_checklist`(「＋」付き、新規作成ボタン用)とは意味が違うので別ファイルにした。**色つきの背景(付箋の色)の上に小さく表示される**ため、太めのシンプルな形が望ましい。

### AI生成プロンプト

共通スタイル(企画書と同じ): `flat minimalist line icon, single-color stroke, transparent background, rounded corners, simple and legible at 16-24px, modern desktop app UI icon style, vector illustration, no shading, no gradient, no text`

| 名前 | プロンプト |
|---|---|
| `icon_type_text` | `Icon representing a plain text note (no plus sign, no other symbols), a simple page with a few short horizontal lines suggesting text, bold and simple enough to read clearly on a small colored circular or rounded-square badge, [共通スタイル]` |
| `icon_type_checklist` | `Icon representing a checklist note (no plus sign, no other symbols), 2-3 small checkboxes stacked vertically, bold and simple enough to read clearly on a small colored circular or rounded-square badge, [共通スタイル]` |

`[共通スタイル]`の部分は実際に使う際、上の共通スタイル文をそのまま貼り付ける。

## 未配線のもの

`corner_fold` / `onboarding_illustration` は企画書でも優先度低めとされている装飾・任意項目のため保留中。
