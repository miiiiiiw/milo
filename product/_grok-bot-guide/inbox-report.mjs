// 收件匣同步用：驗證新資料、與上一版比對，輸出 PR 用的 Markdown 報告。
// 用法：node inbox-report.mjs <新 content.json> <上一版 content.json> > report.md
// 結束碼：0＝通過（可能有警告），1＝有錯誤，不可合併。
import { readFileSync } from "node:fs";
import { validate } from "./validate.mjs";

const [file, prevFile] = process.argv.slice(2);
const load = (f) => JSON.parse(readFileSync(f, "utf8"));
let content, prev = null;
const out = [];
try {
  content = load(file);
} catch (e) {
  console.log("## ✗ 無法讀取 content.json\n\nJSON 格式錯誤，請檢查檔案是否完整：\n\n```\n" + String(e.message).slice(0, 500) + "\n```");
  process.exit(1);
}
try { prev = load(prevFile); } catch { /* 第一次建檔時沒有上一版 */ }

const { errors, warnings, summary } = validate(content, prev);
// 報告只用 post_id 與數字，不貼標題，避免文章標題裡的 @ 觸發 GitHub 通知
const code = (s) => "`" + String(s).replace(/`/g, "'") + "`";
const ids = (xs, max = 40) => xs.length ? xs.slice(0, max).map(code).join("、") + (xs.length > max ? `……等 ${xs.length} 筆` : "") : "無";

out.push(errors.length ? `## ✗ 驗證未通過（${errors.length} 個錯誤）\n\n**不可合併。** 請 Grok Bot 修正後重新推送到收件匣，這個 PR 會自動更新。` : `## ✓ 驗證通過${warnings.length ? `（${warnings.length} 個警告）` : ""}`);

const pv = prev ? (prev.articles || []).filter((a) => a.status === "active").length : null;
out.push(`
### 數字
| 項目 | 上一版 | 這一版 |
|---|---:|---:|
| 資料庫總篇數 | ${prev ? prev.articles.length : "—"} | ${summary.articles_total ?? "—"} |
| active | ${pv ?? "—"} | ${summary.active ?? "—"} |
| 精選（不重複） | | ${summary.selection_unique ?? "—"} |
| 收錄位置 | | ${summary.selection_placements ?? "—"} |
| 精選作者 | | ${summary.selection_authors ?? "—"} |
`);

if (summary.per_topic_active) {
  out.push("### 各卷 active 篇數\n" + Object.entries(summary.per_topic_active).map(([k, v]) => `${code(k)} ${v}`).join("、") + "\n");
}

if (summary.diff) {
  const d = summary.diff;
  out.push(`### 與上一版的差異
- 新增：${d.added.length} 篇　${ids(d.added)}
- 狀態變更：${ids(d.status)}
- 主題變更：${ids(d.topics)}
- 難度變更：${ids(d.level)}
- 標題變更：${ids(d.title)}
- 帳號變更：${ids(d.handle)}
- 補上首次收錄日：${ids(d.added_at_backfilled)}
`);
}

if (errors.length) out.push("### 錯誤\n" + errors.slice(0, 80).map((e) => "- " + e.replace(/@/g, "＠")).join("\n") + (errors.length > 80 ? `\n- ……另有 ${errors.length - 80} 個` : "") + "\n");
if (warnings.length) out.push("### 警告\n" + warnings.slice(0, 40).map((w) => "- " + w.replace(/@/g, "＠")).join("\n") + "\n");

console.log(out.join("\n"));
process.exit(errors.length ? 1 : 0);
