# 原文學習：收件匣同步

頁面資料夾：`reading/`（導覽頁顯示「原文學習」）。這個 `_inbox` 資料夾以 `_` 開頭，不會出現在導覽頁，但 repo 是公開的。

## 流程

```
Grok Bot ──寫入──▶ grokbot-inbox 的 milo/reading/<檔名>.html
                          │  每小時第 23 分（.github/workflows/reading-inbox.yml）
                          ▼
     sync.mjs：檢查 → 補 date、keywords 加「原文學習」、加頁首小標與距頂 CSS → 寫入 reading/
                          ▼
              分支 grokbot/reading 開或更新 PR，報告寫在 PR 說明
                          ▼
                使用者合併＝發布（manifest workflow 自動更新清單）
```

讀收件匣用 `GROKBOT_INBOX_TOKEN`（唯讀，與 GrokBot 學習導航共用）。

## 檔案

| 檔案 | 用途 |
|---|---|
| `sync.mjs` | 檢查與轉換。用法：`node reading/_inbox/sync.mjs <收件匣資料夾> <報告.md>`，在 repo 根目錄執行 |
| `sources.json` | 已同步的檔案與其收件匣版本的 sha256；內容相同就略過，所以收件匣舊檔留著也不會重複處理 |
| `rejected.json` | 目前未通過的檔案與原因。有變動時才會產生 PR（草稿、標題以 ✗ 開頭） |

交件規格（給 Grok Bot）在收件匣的 `milo/reading/README.md`，由 Claude 維護；改 `sync.mjs` 的檢查規則時兩邊要一起改。

## 規則

- 檔名＝網址：`reading/<檔名>.html` → `https://miiiiiiw.github.io/milo/reading/<檔名>`。
- 新頁面的 `date`＝該檔在收件匣最後一次 commit 的日期（台北時間）；更新既有頁面時保留原日期。
- 收件匣同名檔案更新＝覆蓋網站頁面。刪除不自動化：要下架請手動處理（README「修改、改名、刪除」），並請 Grok Bot 從收件匣移除該檔，否則下次會被當成新檔再放回來。
- **暗色模式**：`sync.mjs` 會注入暗色 CSS（配色取自導覽頁 `index.html` 的暗色變數）與一小段腳本，讀 `localStorage` 的 `cab:theme`，跟著導覽頁 ◐ 即時切換；沒有設定時跟隨系統。配色是對應 Grok 模板寫死的顏色（`DARK_RULES`、`SVG_MAP`），Grok 改了模板配色就要補對應。改 transform 時把 `VERSION` +1，所有已同步頁面會重新套用。
- 不允許 `<script>`、`<iframe>`、`<form>`、事件屬性、外部資源；圖片一律 data: URI。頁面在公開網站上，這些限制用來避免 Grok 產出夾帶可執行內容。
- **PR 報告**：每篇標「新增／內容更新／格式重新套用」（最後一種是 `VERSION` 變動造成、內容沒變）。提醒欄的「⚠️ 暗色模式可能未涵蓋」由 `darkGaps()` 產生：Grok 頁面有暗色規則沒處理到的上色樣式或 SVG 顏色時出現，不擋上線；補 `DARK_RULES`／`SVG_MAP` 並把 `VERSION` +1。
- 手動上架（milo-reading-publish skill）仍可使用；之後若收件匣出現同名檔，會覆蓋手動版本並在報告提醒。
