// 由 content.json + template.html 產生 product/grok-bot-guide.html（單一檔案、資料內嵌）。
// 用法（在 repo 根目錄）：node product/_grok-bot-guide/build.mjs [--out 路徑]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outArg = process.argv.indexOf("--out");
const out = outArg > -1 ? process.argv[outArg + 1] : join(here, "..", "grok-bot-guide.html");

const content = JSON.parse(readFileSync(join(here, "content.json"), "utf8"));
const { errors, warnings, summary } = validate(content);
if (errors.length) {
  errors.forEach((e) => console.error("錯誤：" + e));
  console.error("✗ content.json 未通過驗證，沒有產生頁面");
  process.exit(1);
}
warnings.forEach((w) => console.warn("警告：" + w));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ds = content.dataset;
const tz = new Date(ds.updated_at);
const updated = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(tz);

const values = {
  title: esc(ds.title),
  subtitle: esc(ds.subtitle),
  intro: esc(ds.intro),
  dedupe_note: esc(ds.dedupe_note),
  sort_note: esc(ds.sort_note),
  author_note: esc(ds.author_note),
  sources: ds.sources.map((p) => `      <li>${esc(p)}</li>`).join("\n"),
  updated: esc(updated),
  stage_names: "「" + content.stages.map((s) => esc(s.name)).join("、") + "」",
  st_topics: String(content.topics.length),
  st_per: String(ds.display_per_topic),
  st_unique: String(summary.selection_unique),
  st_places: String(summary.selection_placements),
  // 內嵌 JSON：跳脫 < 以免 </script> 提早結束
  content_json: JSON.stringify(content).replace(/</g, "\\u003c"),
};

let html = readFileSync(join(here, "template.html"), "utf8");
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in values)) throw new Error(`template 有未定義的欄位 {{${k}}}`);
  return values[k];
});
// milo 的 <meta name="date"> 跟著資料日期走
html = html.replace(/<meta name="date" content="[^"]*">/, `<meta name="date" content="${updated.slice(0, 10)}">`);
writeFileSync(out, html);
console.log(`✓ 已產生 ${out}`);
console.log(`  選集 ${summary.selection_unique} 篇、${summary.selection_placements} 個收錄位置、${summary.selection_authors} 位作者；資料庫共 ${summary.articles_total} 篇（active ${summary.active}）`);
