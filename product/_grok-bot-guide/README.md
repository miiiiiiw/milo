# GrokBot 學習導航：原始檔與更新手冊

頁面：`product/grok-bot-guide.html`（網址 https://miiiiiiw.github.io/milo/product/grok-bot-guide）
這個資料夾以 `_` 開頭，不會出現在 milo 導覽頁，但 repo 是公開的。

## 檔案

| 檔案 | 用途 | 誰改 |
|---|---|---|
| `content.json` | 全部資料：文章、主題、學習路線、頁面文案 | Grok Bot 產出，Claude 覆蓋進來 |
| `template.html` | 版面、樣式與互動程式，資料欄位用 `{{…}}` 佔位 | 只有改版面時才動 |
| `build.mjs` | 驗證資料後，把 content.json 填進 template，產生 `../grok-bot-guide.html` | 不需要動 |
| `validate.mjs` | 依交接規格檢查資料，並和上一版比對 | 規格變更時才動 |
| `changes/YYYY-MM-DD.md` | 每次更新的變更說明（Grok Bot 的 changes.md） | 每次新增一份 |

**不要直接編輯 `../grok-bot-guide.html`**，它每次都會被 build 覆蓋。

資料格式與分工見專案文件「grokbot-guide/交接規格.md」。

## 已定案的規則

- 文章持續累積，不刪除；下架改 `status`（`unavailable`／`excluded`）。
- 每卷依「收藏 → 轉推 → 讚 → post_id」排序，預設顯示前 `display_per_topic` 篇，其餘可展開。
- **選集**＝各卷前 N 篇的聯集。作者排行、首頁統計、總覽閱讀進度都以選集計算；展開的篇目不列入作者排行。
- 學習路線固定四段（立基、接通、自動、成事），由 `stages` 定義。
- 讀者的已讀記錄存在瀏覽器 localStorage（`grokbot-nav-read`），以 `post_id` 對應，所以 `post_id` 永不更改。
- 頁面的 `<meta name="date">` 會跟著 `dataset.updated_at` 更新。
- `added_at` 是「首次收錄日」，不確定就是 `null`；遷移日另記在 `dataset.migrated_at`。已知的 `added_at` 不可修改，`null` 可以補上。
- 文案中會變動的數字用自動數字（如 `{per_topic}`、`{topics_zh}`），由 build 依資料填入，不寫死。

## 自動交件流程（主要）

Grok Bot 把 `content.json`、`changes.md` 推到私人 repo `miiiiiiw/grokbot-inbox` 的 `milo/grok-bot-guide/`。
milo 的 `.github/workflows/grokbot-inbox.yml` 負責處理。**主要觸發方式是手動**：使用者說「資料更新了」時，Claude 執行 `gh workflow run grokbot-inbox.yml`。每小時第 17 分的排程只是備援，GitHub 常延遲數小時，不要依賴它：

1. 用 `GROKBOT_INBOX_TOKEN`（只能讀收件匣）取得資料；與 main 相同就跳過。
2. 以 main 為底建立分支 `grokbot/grok-bot-guide`，放入資料與 `changes/YYYY-MM-DD.md`。
3. `inbox-report.mjs` 驗證並與 main 的上一版比對；通過才執行 `build.mjs` 產生頁面。
4. 強制推送分支，開或更新 PR，報告寫在 PR 說明。未通過時 PR 為草稿、標題以 ✗ 開頭。
5. 使用者合併＝發布；合併後 manifest workflow 會自動更新頁面清單。

收件匣的 `README.md`（推送說明）與 `SPEC.md`（交接規格）由 Claude 維護。

## 手動更新流程（備用，Claude 執行）

收到 Grok Bot 的 `content.json` 與 `changes.md` 後：

1. **同步 repo**：`git pull --rebase origin main`。
2. **保留上一版**：`git show HEAD:product/_grok-bot-guide/content.json > /tmp/prev.json`。
3. **覆蓋資料**：新的 `content.json` 放進本資料夾；`changes.md` 存成 `changes/YYYY-MM-DD.md`。
4. **驗證**：`node product/_grok-bot-guide/validate.mjs product/_grok-bot-guide/content.json /tmp/prev.json`
   - 有「錯誤」就停止，把錯誤清單交回 Grok Bot 修正，不要自己改資料。
   - 「警告」不擋發布，但要在回報中列出。
   - 把輸出的 `diff`（新增、狀態、主題、難度、標題、帳號變更）和 changes.md 對照，不一致就回報。
5. **產生頁面**：`node product/_grok-bot-guide/build.mjs`。
6. **預覽**：在本機開頁面，用桌機（1440）與手機（390）寬度截圖，至少看總覽、一個單卷、作者排行；確認沒有橫向捲動、主控台沒有錯誤。截圖給使用者確認。
7. **發布**：使用者確認後，commit 訊息用「更新：GrokBot 學習導航資料（YYYY-MM-DD）」，`git fetch && git rebase origin/main` 再 push。不 commit 本機產生的 `manifest.json`。
8. **回報**：約 2 分鐘後確認網站已更新，回報短網址、選集篇數／收錄位置／作者數、警告與 changes.md 的落差。

## 驗收清單

- [ ] validate 無錯誤
- [ ] diff 與 changes.md 一致
- [ ] 首頁統計（主題數、每卷篇數、不同文章、收錄位置）與 build 輸出一致
- [ ] 各卷排序正確，第一名有「本卷首選」
- [ ] 超過 N 篇的卷有「展開其餘」按鈕，展開後排名接續
- [ ] 作者排行人數與 build 輸出的作者數一致
- [ ] 抽查 3 篇文章連結與作者連結
- [ ] 語言、進度、難度篩選與學習路線正常
- [ ] 桌機與手機截圖已給使用者確認

## 改版面時

改 `template.html` 後同樣執行 build。CSS 與互動程式都在 template 裡；資料相關的文字一律從 content.json 來，不要寫死在 template。
