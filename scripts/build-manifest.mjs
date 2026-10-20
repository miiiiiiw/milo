#!/usr/bin/env node
// 掃描 repo 裡所有 .html，產生 manifest.json 給 index.html 讀取。
// 用法：node scripts/build-manifest.mjs
//
// 每個 HTML 可選擇性加入這些 <head> 標籤，導覽頁就會顯示：
//   <title>頁面標題</title>
//   <meta name="description" content="一句話簡介">
//   <meta name="keywords" content="infographic, 經濟, 實驗">   ← 變成標籤
//   <meta name="date" content="2026-10-20">                     ← 覆蓋自動日期
// 都沒寫也沒關係：標題會用檔名，日期會用 git 第一次 commit 的時間。

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SKIP_DIRS = new Set(["node_modules", ".git", ".github", "scripts", "assets"]);
const SKIP_FILES = new Set(["index.html"]); // 只跳過根目錄的 index.html

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name.startsWith("_")) continue; // _draft.html 不會被列出
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(full, out); }
    else if (/\.html?$/i.test(name)) {
      const rel = relative(ROOT, full).split(sep).join("/");
      if (!SKIP_FILES.has(rel)) out.push({ full, rel, mtime: st.mtime });
    }
  }
  return out;
}

const pick = (html, re) => (html.match(re)?.[1] ?? "").trim();
const meta = (html, n) =>
  pick(html, new RegExp(`<meta[^>]+name=["']${n}["'][^>]+content=["']([^"']*)["']`, "i")) ||
  pick(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${n}["']`, "i"));
const decode = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function gitDate(rel) {
  try {
    const out = execSync(`git log --diff-filter=A --follow --format=%aI -- "${rel}"`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim().split("\n").filter(Boolean);
    return out.at(-1) || null; // 最早那次 = 第一次加入
  } catch { return null; }
}

const files = walk(ROOT).map(({ full, rel, mtime }) => {
  const html = readFileSync(full, "utf8").slice(0, 20000);
  // 檔名前綴 YYYYMMDD（例如 20261012-台灣薪資.html）→ 2026-10-12
  const m = rel.split("/").pop().match(/^(\d{4})(\d{2})(\d{2})(?!\d)/);
  const fromName = m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31 ? `${m[1]}-${m[2]}-${m[3]}` : null;
  const date = meta(html, "date") || fromName || gitDate(rel) || mtime.toISOString();
  const kw = meta(html, "keywords");
  return {
    path: rel,
    title: decode(pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i)) || undefined,
    description: decode(meta(html, "description")) || undefined,
    tags: kw ? kw.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
    date
  };
}).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

// folders.json：資料夾的中文顯示名稱，例如 { "tech": "技術筆記" }
let folders = {};
if (existsSync("folders.json")) {
  try { folders = JSON.parse(readFileSync("folders.json", "utf8")); }
  catch (e) { console.error("folders.json 格式錯誤，已略過：" + e.message); }
}

writeFileSync("manifest.json", JSON.stringify({ generated: new Date().toISOString(), folders, files }, null, 2) + "\n");
console.log(`manifest.json: ${files.length} pages`);
