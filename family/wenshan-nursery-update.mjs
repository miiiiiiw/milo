// 從臺北市「收托現況查詢及候補清冊」API 抓取追蹤目標的當日資料，整理成匿名快照。
// 用法：node family/wenshan-nursery-update.mjs           只印出快照
//       node family/wenshan-nursery-update.mjs --write   寫入 wenshan-nursery.json（同一天重跑會覆蓋當天那筆）
// 只保存候補序號、班別、序位，以及「最晚送托日時是否仍在小寶班年齡」；不保存姓名、身分證字號、生日。
import { readFileSync, writeFileSync } from 'node:fs';

const DATA = new URL('./wenshan-nursery.json', import.meta.url);
const API = 'https://welfare.gov.taipei/Nursery/M7_001_006/';
const CLASS = { '大寶班': 'older', '中寶班': 'middle', '小寶班': 'baby', '未滿2個月': 'under2m' };
const PRIORITY = { '第一序位': 1, '第二序位': 2, '第三序位': 3, '第四序位': 4, '第五序位': 5 };

const data = JSON.parse(readFileSync(DATA, 'utf8'));
const year = data.school_year;
const deadline = new Date(data.child.deadline);

async function call(endpoint, body) {
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
    body: new URLSearchParams(body),
  });
  const json = await res.json();
  if (json.Error) throw new Error(`${endpoint}: ${json.Message}`);
  return json;
}

// 民國生日 YYYMMDD → 西元 Date
const rocDate = s => new Date(Number(s.slice(0, 3)) + 1911, Number(s.slice(3, 5)) - 1, Number(s.slice(5, 7)));

// 最晚送托日時滿 2 足月、未滿 8 足月 = 小寶班年齡
function babyAt(birth) {
  const lo = new Date(deadline); lo.setMonth(lo.getMonth() - 8);
  const hi = new Date(deadline); hi.setMonth(hi.getMonth() - 2);
  return birth > lo && birth <= hi ? 1 : 0;
}

async function snapshot(t) {
  const q = { F_yyy: year, F_class: t.class, F_agency: t.agency };
  const [list, [det], [cls], grad] = await Promise.all(
    ['GetWaitingList', 'GetDetails', 'GetClassData', 'GetGraduateCount'].map(e => call(e, q)));
  const nums = list.map(x => Number(x.display_no.split(':').pop()));
  return {
    seats: { older: cls.type_1_num, middle: cls.type_2_num, baby: cls.type_3_num },
    enrolled: { older: cls.num_01, middle: cls.num_02, baby: cls.num_03 },
    quota: [1, 2, 3, 4, 5].map(i => det[`type_${i}_n`]),
    enrolled_by_priority: [1, 2, 3, 4, 5].map(i => det[`censor_0${i}`]),
    A: list.length,
    M: nums.length ? Math.max(...nums) : null,
    G: grad.find(g => g.type === 'A')?.Count ?? null,
    // [候補序號, 班別, 序位, 最晚送托日時是否小寶班年齡]
    list: list.map((x, i) => [nums[i], CLASS[x.lottery_class.trim()] ?? x.lottery_class.trim(),
      PRIORITY[x.censor_desc.trim()] ?? 0, babyAt(rocDate(x.childbirthday))]),
  };
}

const d = new Date();
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const snap = { date, status: 'ok', school_year: year, source: '官網查詢 API', centers: {} };
for (const t of data.targets) snap.centers[t.key] = await snapshot(t);

if (process.argv.includes('--write')) {
  data.snapshots = data.snapshots.filter(s => s.date !== date).concat(snap);
  data.updated = date;
  // 純數值陣列收成一行，避免名單每筆佔好幾行
  const text = JSON.stringify(data, null, 1).replace(/\[[^[\]{}]*\]/g, m => m.replace(/\s*\n\s*/g, ' ').replace('[ ', '[').replace(/ ]$/, ']'));
  writeFileSync(DATA, text + '\n');
  console.log(`已寫入 ${date} 快照`);
} else {
  console.log(JSON.stringify(snap, null, 1));
}
