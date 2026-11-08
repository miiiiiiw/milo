// 依「交接規格」檢查 content.json。
// 用法：node validate.mjs content.json [上一版.json]
// 有錯誤時結束碼為 1；警告不擋發布，但要在回報中說明。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const LANGS = ["zh", "en", "ja"];
const LEVELS = ["入門", "中階", "進階"];
const STATUSES = ["active", "unavailable", "excluded"];
const isInt = (n) => Number.isInteger(n) && n >= 0;
const isISO = (s) => typeof s === "string" && !Number.isNaN(Date.parse(s)) && /T\d{2}:\d{2}/.test(s);
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const nonEmpty = (s) => typeof s === "string" && s.trim().length > 0;
// 文案中可用的自動數字（由 build 依資料計算後填入）
export const TOKENS = ["topics", "topics_zh", "per_topic", "active", "unique", "placements", "authors", "pool_total", "pool_zh", "pool_en", "pool_ja"];
export const TEXT_FIELDS = ["intro", "dedupe_note", "sort_note", "author_note"];

export function validate(c, prev) {
  const errors = [], warnings = [], summary = {};
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

  if (c.schema_version !== 1) err(`schema_version 應為 1，收到 ${c.schema_version}`);
  const ds = c.dataset || {};
  for (const k of ["title", "subtitle", "intro", "dedupe_note", "sort_note", "author_note"])
    if (!nonEmpty(ds[k])) err(`dataset.${k} 缺少或為空`);
  if (!isISO(ds.updated_at)) err("dataset.updated_at 需為含時間與時區的 ISO 8601");
  if (!Number.isInteger(ds.display_per_topic) || ds.display_per_topic < 1) err("dataset.display_per_topic 需為正整數");
  if (!Array.isArray(ds.sources) || !ds.sources.length || !ds.sources.every(nonEmpty)) err("dataset.sources 需為非空字串陣列");
  if (!(ds.migrated_at === undefined || isDate(ds.migrated_at))) err("dataset.migrated_at 需為 YYYY-MM-DD");
  const texts = [...TEXT_FIELDS.map((k) => [k, ds[k]]), ...(ds.sources || []).map((t, i) => [`sources[${i}]`, t])];
  for (const [k, t] of texts) {
    if (typeof t !== "string") continue;
    for (const m of t.matchAll(/\{(\w+)\}/g)) if (!TOKENS.includes(m[1])) err(`dataset.${k} 有未定義的自動數字 {${m[1]}}，可用：${TOKENS.join("、")}`);
    if (/各\s*\d+\s*篇|每[類卷主題]+\s*\d+\s*篇|Top\s*\d+|\d+\s*位作者|\d+\s*篇不同文章|\d+\s*個(主題)?收錄位置/.test(t)) warn(`dataset.${k} 似乎寫死了會變動的數字，建議改用 {per_topic}、{unique}、{authors} 等自動數字`);
  }
  for (const k of ["total", "zh", "en", "ja"]) if (ds.candidate_pool && ds.candidate_pool[k] !== undefined && !isInt(ds.candidate_pool[k])) err(`dataset.candidate_pool.${k} 需為非負整數`);

  // 主題與學習路線
  const topics = Array.isArray(c.topics) ? c.topics : (err("topics 需為陣列"), []);
  const tids = new Set();
  topics.forEach((t, i) => {
    if (!/^[a-z0-9-]+$/.test(t.id || "")) err(`topics[${i}].id 只能用小寫英文、數字與 -：${t.id}`);
    if (tids.has(t.id)) err(`主題 id 重複：${t.id}`);
    tids.add(t.id);
    if (!nonEmpty(t.name)) err(`主題 ${t.id} 缺少 name`);
    if (!nonEmpty(t.goal)) err(`主題 ${t.id} 缺少 goal`);
    if (!(t.caveat === null || nonEmpty(t.caveat))) err(`主題 ${t.id} 的 caveat 需為字串或 null`);
  });
  if (topics.length > 16) err("主題最多 16 個（卷號只準備到拾陸）");
  const inStage = {};
  (c.stages || []).forEach((s, i) => {
    if (!nonEmpty(s.label) || !nonEmpty(s.name)) err(`stages[${i}] 缺少 label 或 name`);
    (s.topics || []).forEach((id) => {
      if (!tids.has(id)) err(`stages[${i}] 指到不存在的主題：${id}`);
      inStage[id] = (inStage[id] || 0) + 1;
    });
  });
  for (const id of tids) if (inStage[id] !== 1) err(`主題 ${id} 應恰好出現在一個 stage，實際 ${inStage[id] || 0} 次`);
  const order = (c.stages || []).flatMap((s) => s.topics || []);
  if (order.join() !== topics.map((t) => t.id).join()) warn("stages 的主題順序與 topics 陣列順序不同，學習路線會以 stages 分段、以 topics 編卷號");

  // 文章
  const arts = Array.isArray(c.articles) ? c.articles : (err("articles 需為陣列"), []);
  const ids = new Set();
  arts.forEach((a, i) => {
    const at = `articles[${i}]（${a.post_id}）`;
    if (typeof a.post_id !== "string" || !/^\d{5,25}$/.test(a.post_id)) err(`${at} post_id 必須是純數字的「字串」`);
    if (ids.has(a.post_id)) err(`${at} post_id 重複`);
    ids.add(a.post_id);
    if (!nonEmpty(a.title)) err(`${at} 缺少 title`);
    if (!/^[A-Za-z0-9_]{1,15}$/.test(a.author?.handle || "")) err(`${at} author.handle 不是有效的 X 帳號（不含 @）`);
    if (!LANGS.includes(a.lang)) err(`${at} lang 需為 ${LANGS.join("／")}`);
    if (!LEVELS.includes(a.level)) err(`${at} level 需為 ${LEVELS.join("／")}`);
    if (!Array.isArray(a.topics) || a.topics.length < 1 || a.topics.length > 4) err(`${at} topics 需有 1–4 個`);
    else {
      if (a.topics.length === 4) warn(`${at} 跨 4 個主題，請確認每個主題都是實質涵蓋`);
      if (new Set(a.topics).size !== a.topics.length) err(`${at} topics 有重複`);
      a.topics.forEach((t) => { if (!tids.has(t)) err(`${at} 指到不存在的主題：${t}`); });
    }
    const m = a.metrics || {};
    for (const k of ["bookmarks", "retweets", "likes"]) if (!isInt(m[k])) err(`${at} metrics.${k} 需為非負整數`);
    if (!(m.captured_at === null || isISO(m.captured_at))) err(`${at} metrics.captured_at 需為 ISO 8601 或 null`);
    if (!(a.added_at === null || isDate(a.added_at))) err(`${at} added_at 需為 YYYY-MM-DD 或 null（不確定）`);
    if (!STATUSES.includes(a.status)) err(`${at} status 需為 ${STATUSES.join("／")}`);
    if (a.status === "excluded" && !nonEmpty(a.note)) warn(`${at} 被 excluded 但 note 沒寫原因`);
  });

  // 各卷篇數
  const N = ds.display_per_topic;
  const active = arts.filter((a) => a.status === "active");
  const perTopic = {};
  topics.forEach((t) => { perTopic[t.id] = active.filter((a) => a.topics?.includes(t.id)).length; });
  for (const [id, n] of Object.entries(perTopic)) if (n < N) warn(`主題 ${id} 只有 ${n} 篇 active，少於每卷 ${N} 篇，請確認 changes.md 有說明`);
  const noCapture = active.filter((a) => !a.metrics?.captured_at).length;
  if (noCapture) warn(`${noCapture} 篇 active 文章沒有 metrics.captured_at`);

  // 選集統計（與網頁相同算法）
  const cmp = (a, b) => b.metrics.bookmarks - a.metrics.bookmarks || b.metrics.retweets - a.metrics.retweets || b.metrics.likes - a.metrics.likes || a.post_id.localeCompare(b.post_id);
  const shown = new Set(), placements = [];
  if (!errors.length) topics.forEach((t) => {
    const top = active.filter((a) => a.topics.includes(t.id)).sort(cmp).slice(0, N);
    placements.push(top.length);
    top.forEach((a) => shown.add(a.post_id));
  });
  const authors = new Set(active.filter((a) => shown.has(a.post_id)).map((a) => a.author.handle.toLowerCase()));
  Object.assign(summary, {
    articles_total: arts.length, active: active.length,
    unavailable: arts.filter((a) => a.status === "unavailable").length,
    excluded: arts.filter((a) => a.status === "excluded").length,
    per_topic_active: perTopic,
    selection_unique: shown.size, selection_placements: placements.reduce((s, n) => s + n, 0),
    selection_authors: authors.size,
  });

  // 與上一版比對
  if (prev) {
    const before = new Map((prev.articles || []).map((a) => [a.post_id, a]));
    const now = new Map(arts.map((a) => [a.post_id, a]));
    const missing = [...before.keys()].filter((id) => !now.has(id));
    if (missing.length) err(`上一版有、這版消失的文章（只能改 status，不能刪除）：${missing.join(", ")}`);
    const diff = { added: [], status: [], topics: [], level: [], title: [], handle: [], added_at_backfilled: [] };
    for (const [id, a] of now) {
      const p = before.get(id);
      if (!p) { diff.added.push(id); if (!a.added_at) warn(`新文章 ${id} 沒有 added_at，新收錄的文章應填當天日期`); continue; }
      if (p.added_at !== null && p.added_at !== undefined && p.added_at !== a.added_at) err(`${id} 的 added_at 被改動（${p.added_at} → ${a.added_at}）；已知的收錄日期不可修改`);
      if ((p.added_at === null || p.added_at === undefined) && a.added_at) diff.added_at_backfilled.push(`${id}: ${a.added_at}`);
      if (p.status !== a.status) diff.status.push(`${id}: ${p.status} → ${a.status}`);
      if ((p.topics || []).join() !== (a.topics || []).join()) diff.topics.push(`${id}: ${p.topics} → ${a.topics}`);
      if (p.level !== a.level) diff.level.push(`${id}: ${p.level} → ${a.level}`);
      if (p.title !== a.title) diff.title.push(id);
      if (p.author?.handle !== a.author?.handle) diff.handle.push(`${id}: ${p.author?.handle} → ${a.author?.handle}`);
    }
    const prevIds = new Set((prev.topics || []).map((t) => t.id));
    for (const id of prevIds) if (!tids.has(id)) warn(`主題 ${id} 在這版被移除或改名，讀者的閱讀進度不受影響，但請確認是刻意的`);
    summary.diff = diff;
  }
  return { errors, warnings, summary };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file = "content.json", prevFile] = process.argv.slice(2);
  const load = (f) => JSON.parse(readFileSync(f, "utf8"));
  const { errors, warnings, summary } = validate(load(file), prevFile ? load(prevFile) : null);
  console.log(JSON.stringify(summary, null, 2));
  warnings.forEach((w) => console.log("警告：" + w));
  errors.forEach((e) => console.log("錯誤：" + e));
  console.log(errors.length ? `\n✗ ${errors.length} 個錯誤，不可發布` : `\n✓ 通過（${warnings.length} 個警告）`);
  process.exit(errors.length ? 1 : 0);
}
