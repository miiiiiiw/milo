#!/usr/bin/env node
// 原文學習收件匣同步：把收件匣 milo/reading/ 的 HTML 檢查、套上 milo 規範後放進 reading/。
// 用法：node reading/_inbox/sync.mjs <收件匣資料夾> <報告輸出.md>
//   收件匣資料夾須在 git 工作區內（用 git log 取每個檔案的收件日期）。
// 結束碼：0＝全部通過（或沒有變更）；1＝有檔案未通過；2＝參數或執行錯誤。
// 只在 milo repo 根目錄執行。會寫入 reading/*.html 與 reading/_inbox/sources.json。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const [inboxDir, reportPath] = process.argv.slice(2);
if (!inboxDir || !reportPath) { console.error("用法：node reading/_inbox/sync.mjs <收件匣資料夾> <報告.md>"); process.exit(2); }

const DST = "reading";
const SOURCES = "reading/_inbox/sources.json";
const REJECTED = "reading/_inbox/rejected.json"; // 目前未通過的檔案；內容有變才會產生差異、觸發 PR
const MAX_BYTES = 5 * 1024 * 1024;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+){0,4}$/;
const CATEGORY = "原文學習";

const CSS =
  "\nmain{padding-top:56px}@media (max-width:560px){main{padding-top:32px}}.eyebrow{color:#555}" +
  "\n/* ── milo 頁首小標規範（見 README「頁首小標」），請勿個別調整 ── */\n" +
  ".page-kicker{font-family:ui-monospace, monospace;font-size:12px;line-height:1.4;font-weight:500;letter-spacing:.14em;text-transform:uppercase;margin:0 0 12px}\n";

const sources = fs.existsSync(SOURCES) ? JSON.parse(fs.readFileSync(SOURCES, "utf8")) : {};
const taipeiDay = (d) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(d);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const metaOf = (html, name) => {
  const m = html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["'][^>]*>`, "i"));
  return m ? m[1].trim() : null;
};
const inboxDate = (file) => {
  try {
    const iso = execFileSync("git", ["-C", path.dirname(file), "log", "-1", "--format=%cI", "--", path.basename(file)], { encoding: "utf8" }).trim();
    if (iso) return taipeiDay(new Date(iso));
  } catch {}
  return taipeiDay(new Date());
};

function check(html) {
  const errors = [], warnings = [];
  // 去掉 data: URI 再檢查，避免 base64 內容誤判，也加快速度
  const t = html.replace(/data:[a-z0-9.+\/-]+;base64,[A-Za-z0-9+\/=\s]+/gi, "data:");
  if (!/^\s*<!doctype html>/i.test(t)) errors.push("開頭不是 `<!DOCTYPE html>`");
  if (!/<html[^>]*lang=["']zh-Hant/i.test(t)) warnings.push("`<html>` 沒有 `lang=\"zh-Hant-TW\"`");
  const title = (t.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim();
  if (!title) errors.push("缺少 `<title>`");
  for (const n of ["description", "keywords", "kicker"]) if (!metaOf(t, n)) errors.push(`缺少 \`<meta name="${n}">\``);
  if (!/<body[^>]*>\s*<main[^>]*>\s*<h1[\s>]/i.test(t)) errors.push("`<body>` 後必須緊接 `<main>`，`<main>` 後必須緊接 `<h1>`");
  if (/page-kicker|class=["'][^"']*eyebrow/i.test(t)) errors.push("不要自己加頁首小標（eyebrow／page-kicker），由 milo 自動加");
  if (!/https:\/\/(x|twitter)\.com\/[^"'\s]+\/status\/\d+/i.test(t)) errors.push("找不到原文連結（https://x.com/帳號/status/數字）");
  if ((t.match(/<\/style>/gi) || []).length < 1) errors.push("缺少 `<style>`");
  const banned = [
    [/<script[\s>]/i, "`<script>`"], [/<iframe[\s>]/i, "`<iframe>`"], [/<object[\s>]/i, "`<object>`"],
    [/<embed[\s>]/i, "`<embed>`"], [/<form[\s>]/i, "`<form>`"], [/<base[\s>]/i, "`<base>`"],
    [/<meta[^>]+http-equiv/i, "`<meta http-equiv>`"], [/\son[a-z]+\s*=/i, "`on…=` 事件屬性"],
    [/javascript:/i, "`javascript:` 連結"], [/<link[^>]+rel=["']?stylesheet/i, "外部樣式表 `<link rel=stylesheet>`"],
    [/@import/i, "CSS `@import`"],
  ];
  for (const [re, label] of banned) if (re.test(t)) errors.push(`不允許 ${label}`);
  const ext = [...t.matchAll(/\s(?:src|poster|srcset)=["']([^"']+)["']/gi)].map((m) => m[1]).filter((u) => !u.startsWith("data:"));
  if (ext.length) errors.push(`圖片等資源必須內嵌成 data: URI，不可引用外部或相對路徑（例如 ${ext[0].slice(0, 60)}）`);
  if (/url\(\s*["']?(?!data:|#)[^)"']+/i.test(t)) errors.push("CSS／SVG 的 `url()` 只能用 data: URI 或 `#id`");
  return { errors, warnings, title };
}

function transform(html, { kicker, date }) {
  let s = html;
  if (!metaOf(s, "date")) s = s.replace(/<\/title>/i, `</title><meta name="date" content="${date}">`);
  const kw = metaOf(s, "keywords");
  if (kw && !kw.split(/[,，]/).map((x) => x.trim()).includes(CATEGORY)) {
    s = s.replace(/(<meta\s+name=["']keywords["']\s+content=["'])([^"']*)/i, `$1${CATEGORY}, $2`);
  }
  const i = s.search(/<\/style>/i);
  s = s.slice(0, i) + CSS + s.slice(i);
  s = s.replace(/(<main[^>]*>)\s*(<h1[\s>])/i, `$1\n<p class="eyebrow page-kicker">${CATEGORY} · ${esc(kicker)}</p>$2`);
  return s;
}

const files = fs.existsSync(inboxDir) ? fs.readdirSync(inboxDir).filter((f) => f.endsWith(".html")).sort() : [];
const rows = [], problems = [], notes = [], rejected = {};
let changed = 0, failed = 0;

for (const f of files) {
  const slug = f.replace(/\.html$/, "");
  const src = path.join(inboxDir, f);
  const buf = fs.readFileSync(src);
  const sha = crypto.createHash("sha256").update(buf).digest("hex");
  if (sources[slug]?.sha256 === sha) continue; // 已同步過，沒有變動

  const dst = path.join(DST, f);
  const exists = fs.existsSync(dst);
  const tracked = Boolean(sources[slug]);
  const errs = [];
  if (!SLUG_RE.test(slug)) errs.push("檔名只能用小寫英文、數字和 `-`（最多 5 個字），例如 `addy-agents-manager.html`");
  if (buf.length > MAX_BYTES) errs.push(`檔案 ${(buf.length / 1048576).toFixed(1)} MB，超過 5 MB 上限，請壓縮圖片`);
  const html = buf.toString("utf8");
  const { errors, warnings, title } = check(html);
  errs.push(...errors);

  if (errs.length) {
    failed++;
    rejected[slug] = { sha256: sha, errors: errs };
    problems.push(`### ✗ \`${f}\`\n\n${errs.map((e) => `- ${e}`).join("\n")}`);
    rows.push(`| ✗ | \`${f}\` | ${title || "（無標題）"} | 未通過 |`);
    continue;
  }
  // 更新既有頁面時保留原本的日期，網址與排序不變
  const keepDate = exists ? metaOf(fs.readFileSync(dst, "utf8"), "date") : null;
  const date = keepDate || inboxDate(src);
  fs.writeFileSync(dst, transform(html, { kicker: metaOf(html, "kicker"), date }));
  sources[slug] = { sha256: sha, synced: taipeiDay(new Date()) };
  changed++;
  rows.push(`| ✓ | \`${f}\` | ${title} | ${exists ? "更新" : "新增"}（${date}） |`);
  if (exists && !tracked)
    notes.push(`- \`${f}\`：會覆蓋原本手動上架的同名頁面。`);
  for (const w of warnings) notes.push(`- \`${f}\`：${w}`);
}

fs.writeFileSync(SOURCES, JSON.stringify(sources, null, 2) + "\n");
fs.writeFileSync(REJECTED, JSON.stringify(rejected, null, 2) + "\n");

const out = [];
out.push(`## 原文學習收件匣報告`, "");
if (!rows.length) out.push("收件匣沒有新的或變動的檔案。");
else {
  out.push(`通過 ${changed} 篇，未通過 ${failed} 篇。`, "", "| | 檔案 | 標題 | 結果 |", "|---|---|---|---|", ...rows);
  if (notes.length) out.push("", "**提醒**", "", ...notes);
  if (problems.length) out.push("", "## 未通過的檔案", "", "請 Grok Bot 依收件匣 `milo/reading/README.md` 修正後重新推送；通過的檔案不受影響。", "", problems.join("\n\n"));
}
fs.writeFileSync(reportPath, out.join("\n") + "\n");
console.log(out.join("\n"));
process.exit(failed ? 1 : 0);
