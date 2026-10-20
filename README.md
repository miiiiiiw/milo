# milo

info sharing — 放想法、infographic 與各種 HTML 實驗的地方。

🔗 **網站：https://miiiiiiw.github.io/milo/**

首頁 `index.html` 是總控導覽頁：左側用資料夾樹列出 repo 裡所有 HTML，點一下就在右側預覽，也能開新分頁或複製連結分享。

---

## 目錄

1. [運作原理](#1-運作原理)
2. [Repo 結構](#2-repo-結構)
3. [新增一個頁面（SOP）](#3-新增一個頁面sop)
4. [頁面資訊（標題、簡介、標籤、日期）](#4-頁面資訊標題簡介標籤日期)
5. [命名與資料夾規則](#5-命名與資料夾規則)
6. [修改、搬移、刪除頁面](#6-修改搬移刪除頁面)
7. [上線後檢查清單](#7-上線後檢查清單)
8. [常見問題排除](#8-常見問題排除)
9. [自訂導覽頁外觀](#9-自訂導覽頁外觀)
10. [一次性設定（已完成，備查）](#10-一次性設定已完成備查)
11. [與 Claude 協作的約定](#11-與-claude-協作的約定)
12. [更新紀錄](#12-更新紀錄)

---

## 1. 運作原理

```
你 push 一個 .html
      │
      ▼
GitHub Action「Build manifest」自動執行
      │  執行 scripts/build-manifest.mjs
      │  掃描所有 .html → 讀取標題/簡介/標籤/日期
      ▼
產生並自動 commit manifest.json（commit 訊息：chore: update manifest [skip ci]）
      │
      ▼
GitHub Pages 重新部署（約 1–2 分鐘）
      │
      ▼
index.html 讀 manifest.json → 畫出資料夾樹、時間軸、首頁卡片
```

- **資料夾結構 = 導覽頁的樹狀結構**，不用另外維護目錄。
- 如果 `manifest.json` 讀不到，導覽頁會改用 GitHub API 直接抓檔案清單（這時只有檔名，沒有簡介、標籤和日期）。

---

## 2. Repo 結構

```
milo/
├── index.html                  ← 導覽頁（總控頁），不要放作品內容
├── manifest.json               ← 自動產生，⚠️ 不要手動編輯
├── README.md                   ← 本文件
├── .nojekyll                   ← 讓 GitHub Pages 不經過 Jekyll 處理，不要刪
├── scripts/
│   └── build-manifest.mjs      ← 掃描 HTML、產生 manifest 的腳本
├── .github/workflows/
│   └── manifest.yml            ← push 時自動執行上面那支腳本
│
└── （以下是作品，依主題自由建立資料夾）
    ├── infographics/
    │   ├── 經濟/
    │   │   └── 2026-10-12-台灣薪資.html
    │   └── coffee-chain.html
    ├── experiments/
    └── notes/
```

---

## 3. 新增一個頁面（SOP）

### 方法 A：GitHub 網頁上傳（最簡單）

1. 打開 https://github.com/miiiiiiw/milo
2. 進到想放的資料夾（沒有的話，見下方「建立新資料夾」）
3. 點 **Add file → Upload files**，把 HTML 拖進去
4. 下方填寫 commit 訊息（例如 `新增：台灣薪資 infographic`），按 **Commit changes**
5. 等 1–2 分鐘，到網站確認是否出現（見 [第 7 節](#7-上線後檢查清單)）

**建立新資料夾**：在 GitHub 網頁點 **Add file → Create new file**，檔名欄位輸入 `新資料夾名/檔名.html`，打 `/` 就會自動變成資料夾。

### 方法 B：用 git 指令

```bash
git pull
# 把 HTML 放到想要的資料夾
git add .
git commit -m "新增：頁面名稱"
git push
```

### 方法 C：交給 Claude

把 HTML 檔（或想做的內容）丟給 Claude，並說明要放在哪個資料夾。參考 [第 11 節](#11-與-claude-協作的約定)。

### 頁面需要圖片、CSS 或 JS 怎麼辦？

建議**一個作品一個資料夾**，相關檔案都放在一起，HTML 裡用相對路徑引用：

```
infographics/台灣薪資/
├── index.html        ← 導覽頁會列成「台灣薪資/index」，建議另外取有意義的檔名
├── chart.js
└── img/map.png
```

> 💡 比較建議命名成 `infographics/台灣薪資/台灣薪資.html`，在樹狀目錄裡比較好辨認。
> 子資料夾裡的 `index.html` 會被列出，只有 repo 根目錄的 `index.html`（導覽頁本身）不會。
> 名為 `assets/`、`scripts/` 的資料夾裡的 HTML 不會被列出，適合放共用素材。

---

## 4. 頁面資訊（標題、簡介、標籤、日期）

在每個作品 HTML 的 `<head>` 加上以下標籤，導覽頁就會顯示得更完整。**全部都是選填。**

```html
<head>
  <meta charset="utf-8">
  <title>台灣薪資二十年</title>
  <meta name="description" content="實質薪資與物價的長期走勢">
  <meta name="keywords" content="infographic, 經濟">
  <meta name="date" content="2026-10-12">
</head>
```

| 欄位 | 用途 | 沒寫的話 |
|---|---|---|
| `<title>` | 樹狀目錄、卡片上的標題 | 用檔名（去掉日期前綴與 `-` `_`） |
| `description` | 首頁卡片的一句話簡介 | 顯示所在資料夾路徑 |
| `keywords` | 標籤，用半形或全形逗號分隔；可被搜尋 | 不顯示標籤 |
| `date` | 排序、時間軸分組、「新」紅點 | 依序改用：檔名開頭的 `YYYY-MM-DD` → git 第一次加入的時間 → 檔案修改時間 |

- 14 天內新增的頁面，樹狀目錄會出現**橘色小紅點**。
- 首頁「最近放進來的」顯示日期最新的 6 個頁面。

---

## 5. 命名與資料夾規則

| 規則 | 說明 |
|---|---|
| 檔名可用中文 | 例如 `台灣薪資.html`，不過分享連結時網址會被編碼，英文檔名的連結比較短 |
| 日期前綴（建議） | `2026-10-12-台灣薪資.html`，會自動當作日期，標題也會自動去掉前綴 |
| `_` 開頭 = 隱藏 | `_draft.html` 或 `_草稿/` 資料夾不會出現在導覽頁，**但網址知道的人仍能直接打開**（repo 是 public） |
| `.` 開頭 = 隱藏 | 同上 |
| 避免空白 | 用 `-` 或 `_` 取代空白，網址比較乾淨 |
| 副檔名 | `.html` 或 `.htm` 都會被列出 |

**目前的主題資料夾**（新增主題時請更新這張表，方便之後對焦）：

| 資料夾 | 放什麼 |
|---|---|
| _（尚未建立）_ | |

---

## 6. 修改、搬移、刪除頁面

| 動作 | 做法 | 注意 |
|---|---|---|
| 修改內容 | 直接編輯 HTML 後 push | 日期不會變（以第一次加入為準）；想改日期就改 `<meta name="date">` |
| 改名或搬移 | 在 GitHub 網頁編輯檔案時，修改上方的檔名或路徑欄位 | ⚠️ 舊的分享連結會失效 |
| 刪除 | 打開檔案 → 右上角 `⋯` → Delete file | manifest 會自動更新 |
| 暫時下架 | 檔名前面加 `_` | 從導覽頁消失，但網址仍可直接打開 |

> 刪除或改名後如果導覽頁沒更新，見 [第 8 節](#8-常見問題排除) 的「手動重跑 manifest」。

---

## 7. 上線後檢查清單

每次新增或修改頁面後：

- [ ] 到 [Actions 分頁](https://github.com/miiiiiiw/milo/actions) 確認 **Build manifest** 是綠色勾勾 ✅
- [ ] 確認 repo 多了一個 `chore: update manifest [skip ci]` 的 commit
- [ ] 到 [Actions 分頁](https://github.com/miiiiiiw/milo/actions) 確認 **pages build and deployment** 也是綠色勾勾
- [ ] 打開 https://miiiiiiw.github.io/milo/ （必要時按 `Cmd/Ctrl + Shift + R` 強制重新整理），確認頁面出現在正確的資料夾
- [ ] 點進去確認圖片、樣式、互動都正常（相對路徑是否正確）
- [ ] 手機寬度看一下，確認版面沒有跑掉

---

## 8. 常見問題排除

**Q：push 了但導覽頁沒出現新頁面**
1. 等 2 分鐘後強制重新整理（`Cmd/Ctrl + Shift + R`）
2. 檢查 [Actions](https://github.com/miiiiiiw/milo/actions)：
   - **Build manifest 紅色 ❌** → 點進去看錯誤。最常見的原因是權限：Settings → Actions → General → Workflow permissions 要選 **Read and write**
   - **Build manifest 沒有執行** → 確認檔案副檔名是 `.html`，而且 push 到 `main` 分支
3. 確認檔名或資料夾不是 `_` 或 `.` 開頭，也不在 `assets/`、`scripts/` 裡

**Q：手動重跑 manifest**
到 [Actions → Build manifest](https://github.com/miiiiiiw/milo/actions/workflows/manifest.yml) → 右側 **Run workflow** → Run。
（只有 `.html`／`.htm` 或 `scripts/build-manifest.mjs` 有變動時才會自動觸發，新增、修改、刪除、改名都算。其他情況，或自動執行失敗時，就手動跑。）

**Q：頁面裡的圖片或 CSS 讀不到**
- 用相對路徑（`img/a.png`、`./style.css`），不要用 `/img/a.png`（開頭的 `/` 會指向 `miiiiiiw.github.io` 根目錄，而不是 `/milo/`）
- GitHub Pages 有區分大小寫：`Image.PNG` ≠ `image.png`

**Q：標題、日期、標籤顯示不對**
- 確認 `<meta>` 寫在 `<head>` 裡，而且在檔案的前 20,000 個字元內
- `date` 格式必須是 `YYYY-MM-DD`

**Q：網站整個打不開（404）**
到 Settings → Pages 確認 Source 是 **Deploy from a branch / main / (root)**。

**Q：某個作品在預覽框裡怪怪的，但開新分頁正常**
有些頁面（例如需要全螢幕、攝影機、彈出視窗）在 iframe 裡會受限制，用右上角 **新分頁** 開啟即可。

**Q：在本機預覽**
```bash
node scripts/build-manifest.mjs   # 產生 manifest.json
python3 -m http.server            # 打開 http://localhost:8000
```
> 本機產生的 `manifest.json` 不需要 commit，push 後 Action 會重新產生。

---

## 9. 自訂導覽頁外觀

都在 `index.html` 裡修改：

| 想改什麼 | 位置 |
|---|---|
| 大標題、小標、副標 | 檔案下方 `<script>` 裡的 `CONFIG` 物件：`title`、`kicker`、`subtitle` |
| 「新」紅點的天數 | `CONFIG.newDays`（預設 14） |
| 配色（亮色／暗色） | 檔案上方 `:root{ ... }`，暗色在 `@media (prefers-color-scheme: dark)` 和 `[data-theme="dark"]` 兩處 |
| 字型 | `<head>` 裡的 Google Fonts 連結 + `:root` 的 `--serif` `--sans` `--mono` |
| 首頁大標語 | 搜尋 `一個放<i>想法</i>的抽屜` |
| 不想被列出的路徑 | `CONFIG.ignore`（前端）＋ `scripts/build-manifest.mjs` 的 `SKIP_DIRS`（兩邊要一致） |

**導覽頁功能速查**：`/` 搜尋 · `F` 專注模式（全螢幕預覽）· `Esc` 離開 · 右上 ◐ 切換明暗 · 「資料夾／時間軸」切換檢視

---

## 10. 一次性設定（已完成，備查）

| 項目 | 設定值 | 位置 |
|---|---|---|
| GitHub Pages | Deploy from a branch → `main` / `(root)` | Settings → Pages |
| Workflow 權限 | Read and write permissions | Settings → Actions → General |
| Claude GitHub App | 已安裝，授權 `milo` repo | https://github.com/settings/installations |

如果重新建立 repo，或把這套導覽頁搬到別的 repo，需要把上面三項重新設定一次。

---

## 11. 與 Claude 協作的約定

之後請 Claude 處理這個 repo 時，以這一節為準，減少來回確認。

### 請 Claude 新增頁面時，告訴它

1. **HTML 檔案**（附件）或**想做的內容**
2. **放在哪個資料夾**（沒指定時，Claude 會依 [第 5 節](#5-命名與資料夾規則) 的主題表挑最接近的，或提議新資料夾）
3. （選填）標題、一句話簡介、標籤、日期

### Claude 會固定執行的動作

- [ ] 用繁體中文（台灣用語）撰寫所有文字與 commit 訊息
- [ ] 確認或補上 `<title>`、`description`、`keywords`、`date` 四個 meta
- [ ] 檢查資源路徑是否為相對路徑
- [ ] 本機執行 `node scripts/build-manifest.mjs`，確認新頁面有被掃到
- [ ] commit 訊息格式：`新增：<標題>`／`更新：<標題>`／`刪除：<標題>`／`維護：<說明>`
- [ ] push 到 `main` 後，確認網站上已出現
- [ ] 新增了主題資料夾的話，同步更新 [第 5 節的主題表](#5-命名與資料夾規則)
- [ ] 在 [第 12 節](#12-更新紀錄) 記錄導覽頁本身的結構性變更（一般新增作品不需要記錄）

### Claude 不會做的事（除非明確要求）

- 不修改 `index.html` 的設計與功能
- 不手動編輯 `manifest.json`
- 不刪除、不改名既有頁面（避免分享連結失效）
- 不使用 force push

---

## 12. 更新紀錄

只記錄**導覽頁或維運機制本身**的變更；一般新增作品請看 git log。

| 日期 | 變更 |
|---|---|
| 2026-10-20 | 建立導覽頁（資料夾樹＋時間軸＋預覽）、manifest 自動產生機制、GitHub Pages 上線 |
| 2026-10-20 | 新增本 README 維運手冊 |
