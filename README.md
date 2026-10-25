# milo

工作與生活裡的筆記：做過、想過的事。網站：https://miiiiiiw.github.io/milo/

首頁 `index.html` 是導覽頁，會把 repo 裡所有 HTML 依資料夾列成樹狀目錄，點選即可在右側預覽。

## 運作方式

push 任何 `.html` 後，GitHub Action「Build manifest」會執行 `scripts/build-manifest.mjs`，掃描所有 HTML 並更新 `manifest.json`，導覽頁再依這份清單顯示。資料夾結構就是導覽頁的目錄，不需要另外維護。從 push 到網站更新約 1–2 分鐘。

以下檔案是導覽頁機制本身，一般不需要動：

| 檔案 | 用途 |
|---|---|
| `index.html` | 導覽頁 |
| `manifest.json` | 自動產生的頁面清單，不要手動編輯 |
| `scripts/build-manifest.mjs` | 產生 manifest 的腳本 |
| `.github/workflows/manifest.yml` | push 時自動執行上述腳本 |
| `.nojekyll` | 讓 GitHub Pages 直接提供檔案，不要刪 |
| `folders.json` | 資料夾的中文顯示名稱，需要手動編輯（見「命名規則」） |

## 新增頁面

**用 GitHub 網頁：** 進入目標資料夾 → Add file → Upload files → 拖入 HTML → Commit changes。要建立新資料夾時，改用 Add file → Create new file，並在檔名欄輸入 `資料夾名/檔名.html`。

**用 git：** 把檔案放進資料夾後執行 `git add . && git commit -m "新增：標題" && git push`。

**頁面有圖片、CSS、JS 時：** 和 HTML 放在同一個資料夾，並用相對路徑引用（`img/a.png`）。不要用 `/` 開頭的路徑，那會指到 `miiiiiiw.github.io` 而不是 `/milo/`。

## 頁面資訊

在 HTML 的 `<head>` 加入以下標籤，導覽頁就會顯示對應資訊，每一項都可省略：

```html
<title>台灣薪資二十年</title>
<meta name="description" content="實質薪資與物價的長期走勢">
<meta name="keywords" content="infographic, 經濟">
<meta name="date" content="2026-10-12">
```

- **title**：顯示的標題。省略時使用檔名。
- **description**：首頁卡片上的一句話簡介。
- **keywords**：標籤，以逗號分隔，可以被搜尋。
- **date**：用於排序與時間軸，格式為 `YYYY-MM-DD`。省略時依序改用檔名開頭的日期、git 首次加入的日期。14 天內的頁面會顯示橘色圓點。

## 頁首小標

每頁最上方、標題上面那一行小字，所有頁面都依同一個規則：

- **文字**：`分類 · 主題`。分類是頁面所在資料夾在 `folders.json` 裡的中文名稱（如「技術筆記」「產品」「家庭」），主題是幾個字的關鍵詞，中英文都可以。例如 `技術筆記 · Email Authentication`、`家庭 · 公托候補追蹤`。
- **位置**：頁面的第一個元素，緊接在 `<h1>` 之前。距離視窗頂端：桌機 56px，手機（寬度 ≤ 560px）32px。和 `<h1>` 的間距 12px。
- **寫法**：使用 `<p class="eyebrow page-kicker">…</p>`，並把下面這段 CSS 貼在頁面主要 `<style>` 的最後面。顏色沿用頁面自己的次要文字色，不另外指定。

  ```css
  /* ── milo 頁首小標規範（見 README「頁首小標」），請勿個別調整 ── */
  .page-kicker{font-family:var(--mono);font-size:12px;line-height:1.4;font-weight:500;letter-spacing:.14em;text-transform:uppercase;margin:0 0 12px}
  ```

  頁面沒有定義 `--mono` 變數時，把 `var(--mono)` 換成 `ui-monospace, monospace`。

- **距頂位置要逐頁調整**：每頁的外層結構不同，56px／32px 需要透過該頁最外層容器的 `padding-top` 達成。如果外層是 flex 並設了 `gap`，再用負的 `margin-bottom` 把間距補回 12px。完成後在桌機和手機寬度實際量一次。

## 命名規則

網址由「資料夾名/檔名」組成，所以這兩者都用簡短英文。導覽頁上顯示的中文來自頁面的 `<title>` 和 `folders.json`，因此不影響辨識。

- **檔名與資料夾名**：只用小寫英文、數字和 `-`，盡量 1–3 個字。例如 `tech/cloudflare-d1.html`，分享網址就是 `https://miiiiiiw.github.io/milo/tech/cloudflare-d1`。
- **日期**：寫在 `<meta name="date">`，不建議放進檔名，以免網址變長。如果檔名仍以 `YYYYMMDD` 開頭（`20261012-wages.html`），會被當作日期。
- **資料夾的中文名稱**：寫在根目錄的 `folders.json`，鍵是完整的資料夾路徑。沒設定的資料夾直接顯示英文名稱。

  ```json
  {
    "tech": "技術筆記",
    "tech/cloudflare": "Cloudflare"
  }
  ```

- **隱藏**：以 `_` 或 `.` 開頭的檔案或資料夾不會出現在導覽頁，適合放草稿。不過 repo 是公開的，知道網址的人仍然能打開。
- **共用素材**：`assets/`、`scripts/` 資料夾內的 HTML 不會被列出。
- **分享後不要改名**：網址分享出去之後，改檔名或資料夾名會讓舊連結失效。

## 分享連結

在導覽頁打開頁面後按「複製連結」，會得到不含 `.html` 的短網址，例如 `https://miiiiiiw.github.io/milo/tech/cloudflare-d1`。這個網址只會打開頁面本身，不包含導覽頁。

如果想讓對方也看到導覽頁，就分享瀏覽器網址列上的網址，例如 `https://miiiiiiw.github.io/milo/#/tech/cloudflare-d1`。

## 修改、改名、刪除

- **修改**：直接編輯後 push。日期不會跟著改變，需要調整時請修改 `<meta name="date">`。
- **改名或搬移**：在 GitHub 編輯頁面修改檔名或路徑。舊的分享連結會失效。
- **刪除**：開啟檔案 → `⋯` → Delete file。
- **暫時下架**：在檔名前加 `_`。

## 新增後確認

1. 到 [Actions](https://github.com/miiiiiiw/milo/actions) 確認「Build manifest」和「pages build and deployment」都是綠色勾勾。
2. 打開網站並強制重新整理（`Cmd/Ctrl + Shift + R`），確認頁面出現在正確的資料夾。
3. 點進頁面，確認圖片、樣式、互動都正常。
4. 分別用桌機寬度和手機寬度看一次：導覽頁的預覽區要填滿整個視窗高度，頁面本身不能出現橫向捲動。

## 問題排除

| 狀況 | 處理方式 |
|---|---|
| 新頁面沒出現 | 先等 2 分鐘再強制重新整理。接著確認檔名不是 `_`／`.` 開頭、檔案不在 `assets/`／`scripts/` 內，並且是 push 到 `main`。 |
| Build manifest 失敗 | 到 Settings → Actions → General，確認 Workflow permissions 為 Read and write。 |
| 需要手動更新清單 | 到 Actions → Build manifest → Run workflow。自動觸發只在 `.html`、`folders.json` 或腳本變動時發生。 |
| 圖片或 CSS 讀不到 | 改用相對路徑，並檢查大小寫（GitHub Pages 會區分大小寫）。 |
| 預覽框內顯示異常 | 部分功能（全螢幕、攝影機、彈出視窗）在預覽框中會受限，改按右上角「新分頁」開啟。 |
| 整個網站 404 | 到 Settings → Pages，確認來源為 `main` 分支的 `/ (root)`。 |

本機預覽：執行 `node scripts/build-manifest.mjs`，再執行 `python3 -m http.server`，然後開啟 http://localhost:8000 。本機產生的 `manifest.json` 不需要 commit。

## 自訂導覽頁

以下設定都在 `index.html` 中：

- 標題、副標、「新」標記的天數：`<script>` 裡的 `CONFIG`
- 配色：`:root` 區塊（暗色模式另有兩處同名變數，需要一起修改）
- 隱藏規則：`CONFIG.ignore` 必須和 `scripts/build-manifest.mjs` 的 `SKIP_DIRS` 保持一致

導覽頁操作：點左上角 Cabinet 回首頁；手機從螢幕左緣往右滑開啟目錄、在目錄上往左滑關閉。快捷鍵：`/` 搜尋、`F` 專注模式、`Esc` 離開。

## Repo 設定（已完成）

搬到其他 repo 時，需要重新做以下設定：

- Settings → Pages：Deploy from a branch，選 `main` / `(root)`
- Settings → Actions → General → Workflow permissions：Read and write
- Claude GitHub App：授權存取此 repo（讓 Claude 能 push）

## 與 Claude 協作

**交辦新增頁面時請提供：** HTML 檔案或內容、要放的資料夾，以及（選填的）標題、簡介、標籤、日期。

**Claude 每次會做：**
- 使用繁體中文（台灣用語）。
- 補齊上述四個 meta 標籤，並檢查資源是否使用相對路徑。
- 依「頁首小標」設定小標，並量測距頂位置和間距。
- 在本機產生 manifest，確認新頁面有被掃描到。push 之後，再確認網站上已經出現。
- push 前在本機打開導覽頁，用桌機和手機兩種寬度截圖檢查版面（見「新增後確認」第 4 點）。
- commit 訊息以「新增：」「更新：」「刪除：」「維護：」開頭。
- 檔名與資料夾名使用簡短英文。新增資料夾時，在 `folders.json` 加上中文名稱。
- push 後回報分享用的短網址。
- 導覽頁機制有變動時，記錄到「更新紀錄」。

**Claude 不會主動做：** 修改導覽頁的設計或功能、刪除或改名既有頁面、force push。

## 更新紀錄

只記錄導覽頁與維運機制的變更，作品的新增請看 git log。

- 2026-10-20：建立導覽頁與 manifest 自動更新機制，GitHub Pages 上線。
- 2026-10-21：檔名改用簡短英文，新增 `folders.json` 設定資料夾的中文名稱；「複製連結」改為產生不含 `.html` 的短網址。
- 2026-10-25：導覽頁高度改為直接綁定視窗高度（`100dvh`），修正部分瀏覽器在桌機版只撐到內容高度、預覽區下方留白的問題。
- 2026-10-26：文案改為以筆記為主；點 Cabinet 回首頁；手機可從左緣右滑開啟目錄；切換頁面時不再閃白；訂定「頁首小標」規範並套用到既有頁面。
