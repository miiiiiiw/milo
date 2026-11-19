# 影片學習：收件匣同步

頁面資料夾：`watching/`（導覽頁顯示「影片學習」）。這個 `_inbox` 資料夾以 `_` 開頭，不會出現在導覽頁，但 repo 是公開的。

做法和「原文學習」（`reading/_inbox/`）相同，只是來源換成影片譯稿。兩邊各自獨立：各有自己的同步程式、排程、PR 分支，互不影響。

## 流程

```
Grok Bot ──寫入──▶ grokbot-inbox 的 milo/watching/<檔名>.html
                          │  每小時第 38 分（.github/workflows/watching-inbox.yml）
                          ▼
     sync.mjs：檢查 → 補 date、keywords 加「影片學習」、加頁首小標、距頂與暗色 CSS → 寫入 watching/
                          ▼
              分支 grokbot/watching 開或更新 PR，報告寫在 PR 說明
                          ▼
                使用者合併＝發布（manifest workflow 自動更新清單）
```

讀收件匣用 `GROKBOT_INBOX_TOKEN`（唯讀，與原文學習、GrokBot 學習導航共用）。

## 檔案

| 檔案 | 用途 |
|---|---|
| `sync.mjs` | 檢查與轉換。用法：`node watching/_inbox/sync.mjs <收件匣資料夾> <報告.md>`，在 repo 根目錄執行 |
| `sources.json` | 已同步的檔案與其收件匣版本的 sha256；內容相同就略過 |
| `category-map.json` | 檔名 → 分類的對照，補舊頁面或更正交件時標的分類 |
| `rejected.json` | 目前未通過的檔案與原因。有變動時才會產生 PR（草稿、標題以 ✗ 開頭） |

交件規格（給 Grok Bot）在收件匣的 `milo/watching/README.md`，由 Claude 維護；改 `sync.mjs` 的檢查規則時兩邊要一起改。

## 和原文學習的差異

`sync.mjs` 由 `reading/_inbox/sync.mjs` 複製改寫，差異只有：

- **原片連結**：`.meta` 裡要有 https 連結。YouTube、Bilibili、X、Facebook 以外的網址也接受，但報告會提醒確認。
- **時間戳**：逐字稿沒有 `.tc` 時間戳連結時提醒（不擋上線）。
- **禁止內嵌影音**：另外擋 `<video>`、`<audio>`、mermaid；原本的 `<iframe>` 禁令也表示不能嵌入播放器，只放原片連結。
- **檔案大小**：超過 1 MB 提醒（影片頁內嵌畫面多，手機載入慢），超過 5 MB 擋下。
- **暗色模式**：多了 `.tc` 時間戳顏色，以及影片模板圖解用到的顏色（`SVG_MAP` 後段）。

兩邊的 `VERSION` 各自計算。原文學習的暗色規則日後有修正，視需要手動同步過來。

## 規則

- 檔名＝網址：`watching/<檔名>.html` → `https://miiiiiiw.github.io/milo/watching/<檔名>`。
- 新頁面的 `date`＝該檔在收件匣最後一次 commit 的日期（台北時間）；更新既有頁面時保留原日期。
- 收件匣同名檔案更新＝覆蓋網站頁面。刪除不自動化：要下架請手動刪 `watching/<檔名>.html`，並請 Grok Bot 從收件匣移除該檔，否則下次會被當成新檔再放回來。
- **原片標題是繁體中文**（規格 v1.7）：可以沒有 `.en-title`、`<title>` 不帶括號原標題，檢查不會擋。`h1` 直接接 `.meta` 時由 `CSS` 的 `h1+.meta{margin-top:18px}` 補間距（和 `h1` 的 4px 下邊距摺疊後剛好 18px，與 `.en-title` 到 `.meta` 一致）。
- **中文原標題不重複顯示**（2026-11-19）：原標題是中文（簡體或繁體）時，`transform` 的 `dedupeChineseTitle` 會把 `<title>` 結尾的括號原標題和 `<h1>` 後的 `.en-title` 拿掉，避免首頁卡片出現「推薦一本書（推荐一本书）」這種重複。判斷：有漢字、沒有假名與韓文，且和中文標題長度相近（0.6–1.6 倍）、用字重疊 40% 以上，所以「（三集）」這類正常括號不會被誤刪。外文原標題不動。這是同步程式少數會改動標題內容的地方，收件匣原檔不變。h1 直接接 `.meta` 時由 `h1+.meta{margin-top:18px}` 補間距。reading 與 watching 的程式相同，改一邊要記得改另一邊。
- **暗色模式**：同原文學習，讀 `localStorage` 的 `cab:theme` 跟著導覽頁 ◐ 切換。
- **固定色票**：交件規格 v1.5 起，Grok 只能用規格列出的顏色，色票裡的每個顏色在 `SVG_MAP`／`DARK_RULES` 都已有暗色對照。報告出現「⚠️ 暗色模式可能未涵蓋」＝用了色票以外的顏色：
  - 預設請 Grok 改用色票重推。
  - 顏色確實有需要（Grok 在回報中提出用途）時，補 `SVG_MAP`／`DARK_RULES`、`VERSION` +1，並把該色加進收件匣規格的色票表，兩邊保持一致。
- **分頁置頂縮小**：`sync.mjs` 另外注入 `scripts/page-enhance.mjs`（原文學習與影片學習共用）的 CSS 與腳本：分頁按鈕滑到置頂後縮成細列、只顯示英文；縮小時量測位移補回，內容不跳動；置頂時切換分頁會捲到新分頁開頭。改 `page-enhance.mjs` 後兩邊 `VERSION` 都要 +1。

## 分類

- 分類名單在 repo 根目錄 `categories.json`（`build` 工程、`motion` 影像、`design` 設計、`reach` 經營、`mind` 心智），書寫順序＝首頁顯示順序。原文學習和影片學習共用。
- 每頁的分類寫在 `<meta name="category">`，`build-manifest.mjs` 讀進 `manifest.json`，首頁側邊欄在資料夾底下多一層**虛擬**分類資料夾；檔案不搬家，網址不變。分類連結：`#/reading/build`、`#/watching/motion`。
- 同步時的分類來源：`category-map.json`（Claude 維護的「檔名 → 分類」）優先，其次是頁面自己標的 meta。對照表的值有變動時，該頁會重新同步。
- 頁面標了五個以外的值 → 不通過。沒有分類 → 照常上線、放在「未分類」，報告提醒；上架時補進 `category-map.json`。
- 要更正某篇的分類：改 `category-map.json` 後觸發同步即可，不用請 Grok 重推。
