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
import { TABS_CSS, TABS_JS } from "../../scripts/page-enhance.mjs";

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

// 轉換版本：改了 transform（例如配色）就 +1，已同步的頁面下次執行會全部重新套用
const VERSION = 9;

// ── 暗色模式：配色取自 milo 導覽頁（index.html :root 的暗色變數），對應 Grok 翻譯頁模板寫死的顏色 ──
// 規則同導覽頁：預設跟系統；導覽頁 ◐ 切換後寫入 localStorage「cab:theme」，頁面讀取並即時同步。
const D = { paper: "#16150f", card: "#1e1c16", surf: "#26231c", cell: "#2c2921", ink: "#ece6d8", ink2: "#a9a291", ink3: "#8a8373", rule: "#2f2c23", stage: "#0f0e0a", link: "#7db4e6", blue: "#6fb1ec", red: "#ff7a63" };
const DARK_RULES = `
body{background:${D.paper};color:${D.ink}}
main{background:${D.card}}
.en-title,.zh-title,.eg,.eyebrow,figcaption,h2 .en,h3 .en,h4 .en,blockquote .src,.tabs a,.tabs label,.meta,.prompt-lbl,blockquote.q .src,.tweet .tr-lbl{color:${D.ink2}}
.note,footer,.tweet .when,.pair .lbl{color:${D.ink3}}
.code-lab{color:${D.ink2}}
h2,footer{border-color:${D.rule}}
.tabs{background:${D.card};border-color:${D.rule}}
.tabs a,.tabs label{background:${D.surf}}
#r-tl:checked~.tabs .tl,#r-tk:checked~.tabs .tk,.tabs a[aria-selected="true"]{background:#1d9bf0;color:#fff}
.meta,.cta{background:rgba(29,155,240,.10)}
figcaption,.lbl{background:${D.surf}}
.tweet{background:${D.surf};border-color:${D.rule}}
.tweet .tr{border-color:${D.rule}}
code,p code,li code{background:${D.cell}}
pre{background:${D.stage};color:#e6edf3;border:1px solid ${D.rule}}
a{color:${D.link}}
.dg{border-color:rgba(236,230,216,.12)}
img{filter:brightness(.88)}
blockquote{background:rgba(29,155,240,.10);color:${D.ink}}
blockquote.q{background:${D.surf}}
th,td{border-color:${D.rule}}
th{background:rgba(29,155,240,.10)}
.xpost{background:${D.surf};border-color:${D.rule}}
.xpost .who{color:${D.ink2}}
.callout,.callout.pin{background:rgba(29,155,240,.10)}
.callout.warn{background:rgba(201,122,44,.14);border-left-color:#e0a060}
.callout.ok{background:rgba(47,125,74,.18);border-left-color:#5fbf80}
`;
// SVG 圖解的 fill／stroke 屬性（CSS 可覆蓋呈現屬性）
const SVG_MAP = [
  ["#ffffff", D.surf], ["#fff", D.surf], ["#f5f5f5", "#1a1813"], ["#ececec", D.cell],
  ["#2d3142", D.ink], ["#4f5d75", D.ink2], ["#5a6580", D.ink2], ["#1d6fb8", D.blue],
  ["#c43c2c", D.red], ["#b42318", "#ff8a75"],
  ["rgba(45,49,66,0.45)", "rgba(236,230,216,.35)"], ["rgba(45,49,66,0.35)", "rgba(236,230,216,.28)"], ["rgba(45,49,66,0.16)", "rgba(236,230,216,.14)"],
  ["rgba(29,111,184,0.09)", "rgba(111,177,236,.14)"],
];
const svgRules = SVG_MAP.map(([from, to]) => `svg [fill="${from}" i]{fill:${to}}svg [stroke="${from}" i]{stroke:${to}}`).join("");
const scope = (sel, rules) => rules.replace(/(^|\})\s*([^{}]+)\{/g, (_, b, s) => `${b}${s.split(",").map((x) => `${sel} ${x.trim()}`).join(",")}{`);
const DARK_CSS =
  "\n/* ── milo 暗色模式（原文學習收件匣同步自動加入，請勿手改） ── */\n:root{color-scheme:light}\n" +
  `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark}${scope(':root:not([data-theme="light"])', DARK_RULES + svgRules)}}\n` +
  `:root[data-theme="dark"]{color-scheme:dark}${scope(':root[data-theme="dark"]', DARK_RULES + svgRules)}\n`;
// ── 暗色覆蓋檢查：找出 Grok 頁面裡、暗色規則沒處理到的上色樣式與 SVG 顏色（只提醒，不擋上線）──
// 這些顏色在暗色背景上也看得清楚，不必另外處理
const DARK_SAFE = new Set(["#1d9bf0", "#0f1720", "#e6edf3", "#c97a2c", "#2f7d4a"]);
const COVERED_SEL = new Set([
  ...[...DARK_RULES.matchAll(/(?:^|\})\s*([^{}]+)\{/g)].flatMap((m) => m[1].split(",").map((x) => x.trim())),
  ".pt", ".tabs a .s", ".tabs label .s", "h1", "h2", "h3",
]);
const SVG_KNOWN = new Set(SVG_MAP.map(([c]) => c.toLowerCase()).concat(["none", "currentcolor", "transparent"]));
function darkGaps(html) {
  const t = html.replace(/data:[a-z0-9.+\/-]+;base64,[A-Za-z0-9+\/=\s]+/gi, "data:");
  let css = [...t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  css = css.replace(/@media\s+print\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/gi, "");
  const sels = new Set();
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const colors = (body.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) || []).filter((c) => !DARK_SAFE.has(c.toLowerCase()));
    if (!colors.length) continue;
    for (const x of sel.split(",").map((x) => x.trim().replace(/\s+/g, " "))) if (x && !x.startsWith("@") && !COVERED_SEL.has(x)) sels.add(x);
  }
  const svg = new Set();
  for (const [, c] of t.matchAll(/\s(?:fill|stroke)=["']([^"']+)["']/gi)) if (!SVG_KNOWN.has(c.toLowerCase()) && !c.startsWith("url(")) svg.add(c);
  const out = [];
  if (sels.size) out.push(`暗色模式可能未涵蓋的樣式：${[...sels].slice(0, 8).map((x) => "`" + x + "`").join("、")}${sels.size > 8 ? ` 等 ${sels.size} 項` : ""}`);
  if (svg.size) out.push(`暗色模式可能未涵蓋的圖解顏色：${[...svg].slice(0, 8).map((x) => "`" + x + "`").join("、")}`);
  return out;
}

const THEME_JS =
  '<script>/* milo 暗色模式：跟隨導覽頁的明暗切換 */(function(){var r=document.documentElement;function a(){try{var t=JSON.parse(localStorage.getItem("cab:theme"));if(t==="dark"||t==="light")r.dataset.theme=t;else delete r.dataset.theme}catch(e){}}a();addEventListener("storage",function(e){if(e.key==="cab:theme")a()})})();</script>';

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
  // 原文連結：X 貼文最常見，但也接受其他網站的文章（例如官方部落格）；必須寫在 .meta 資訊區
  const metaBlock = (t.match(/<div class=["']meta["'][\s\S]*?<\/div>/i) || [""])[0];
  if (!/href=["']https:\/\/[^"']+["']/i.test(metaBlock)) errors.push("`.meta` 資訊區找不到原文連結（https:// 開頭，X 貼文或原文網頁皆可）");
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
  s = s.slice(0, i) + CSS + DARK_CSS + TABS_CSS + s.slice(i);
  s = s.replace(/<\/head>/i, THEME_JS + TABS_JS + "</head>");
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
  if (sources[slug]?.sha256 === sha && sources[slug]?.v === VERSION) continue; // 已同步過，沒有變動

  const dst = path.join(DST, f);
  const exists = fs.existsSync(dst);
  const tracked = Boolean(sources[slug]);
  const formatOnly = tracked && sources[slug].sha256 === sha; // 內容沒變，只是 transform 版本更新
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
  sources[slug] = { sha256: sha, v: VERSION, synced: taipeiDay(new Date()) };
  changed++;
  const kind = !exists ? "新增" : formatOnly ? "格式重新套用" : "內容更新";
  rows.push(`| ✓ | \`${f}\` | ${title} | ${kind}（${date}） |`);
  for (const g of darkGaps(html)) notes.push(`- \`${f}\`：⚠️ ${g}。請 Claude 補暗色對照表（不影響上線，但暗色模式下可能看不清楚）`);
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
