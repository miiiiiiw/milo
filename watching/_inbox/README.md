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
- **暗色模式**：同原文學習，讀 `localStorage` 的 `cab:theme` 跟著導覽頁 ◐ 切換。
- **固定色票**：交件規格 v1.5 起，Grok 只能用規格列出的顏色，色票裡的每個顏色在 `SVG_MAP`／`DARK_RULES` 都已有暗色對照。報告出現「⚠️ 暗色模式可能未涵蓋」＝用了色票以外的顏色：
  - 預設請 Grok 改用色票重推。
  - 顏色確實有需要（Grok 在回報中提出用途）時，補 `SVG_MAP`／`DARK_RULES`、`VERSION` +1，並把該色加進收件匣規格的色票表，兩邊保持一致。
