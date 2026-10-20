# milo
info sharing

## Cabinet — HTML 作品導覽頁

把任何 `.html` 丟進這個 repo，導覽頁 `index.html` 會自動用資料夾樹列出來，點一下就在右側預覽。

## 第一次設定
1. 把這些檔案放進 repo 根目錄：`index.html`、`scripts/`、`.github/`、`.nojekyll`
2. GitHub → Settings → Pages → Source 選 **Deploy from a branch**，branch 選 `main` / `(root)`
3. GitHub → Settings → Actions → General → Workflow permissions 選 **Read and write**
4. 打開 `https://<你的帳號>.github.io/<repo名>/`

## 之後新增作品
直接把 HTML 放進任意資料夾再 push，Action 會自動更新 `manifest.json`。資料夾結構就是導覽頁的樹狀結構。

可選：在每個 HTML 的 `<head>` 加這些，導覽頁會顯示得更完整：
```html
<title>台灣薪資二十年</title>
<meta name="description" content="實質薪資與物價的長期走勢">
<meta name="keywords" content="infographic, 經濟">
<meta name="date" content="2026-10-12">
```
沒寫也可以：標題用檔名、日期用 git 第一次加入的時間（檔名開頭是 `2026-10-12-` 也會被當成日期）。

## 小規則
- 檔名或資料夾以 `_` 開頭 → 不列出（適合草稿）
- `assets/`、`scripts/` 裡的 HTML 不列出
- 每個作品如果有自己的 CSS/JS/圖片，放在同一個資料夾即可，相對路徑照常運作
- 本機預覽：`node scripts/build-manifest.mjs && python3 -m http.server`

## 自訂
`index.html` 最下方 `CONFIG` 可改標題、副標、幾天內顯示「新」紅點；頂部 `:root` 可改配色。

## 快速鍵
`/` 搜尋 · `F` 專注模式 · `Esc` 離開
