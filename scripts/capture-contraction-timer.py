# 宮縮計時（family/contraction-timer.html）實際畫面截圖與呼吸短片
#
# 用固定的假資料拍攝，輸出到 tech/img/，給「宮縮計時的功能與設計圖解」使用。
# 介面改了之後重新執行一次，就能重拍全部素材。
#
# 需要：pip install playwright pillow && playwright install chromium；ffmpeg（含 libx264）
# 執行：python3 scripts/capture-contraction-timer.py
#   連不到 Google Fonts 時，可以先 npm i @fontsource/noto-sans-tc @fontsource/noto-serif-tc，再加上
#   --local-fonts <node_modules/@fontsource 的路徑>，改從本機載入同一套字體。
import argparse, json, os, shutil, subprocess, sys, tempfile, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'tech' / 'img'
PREFIX = 'contraction-timer'
KEY = 'milo-contraction-v1'
TZ = timezone(timedelta(hours=8))
W, H, SCALE = 390, 844, 2
FPS, LOOP_S = 30, 10

ap = argparse.ArgumentParser()
ap.add_argument('--local-fonts', help='node_modules/@fontsource 的路徑')
args = ap.parse_args()

# ── 假資料：某天凌晨的產程（不含任何真實紀錄）──
DAY = datetime(2026, 11, 20, tzinfo=TZ)
def at(h, m, s=0, day=0): return int((DAY + timedelta(days=day, hours=h, minutes=m, seconds=s)).timestamp() * 1000)
def c(start, dur): return {'start': start, 'end': start + dur * 1000}

EARLY = [c(at(1, 50, 12), 38), c(at(2, 12, 40), 42), c(at(2, 31, 5), 45)]                 # 間隔 22、18 分 → 觀察中
LATER = EARLY + [c(at(2, 48, 20), 52), c(at(2, 58, 2), 55), c(at(3, 7, 15), 61), c(at(3, 15, 40), 58)]   # 連續 3 次 ≤ 10 分 → 可以出發
YESTERDAY = [c(at(21, 2, 10, -1), 35), c(at(21, 17, 45, -1), 40), c(at(21, 35, 30, -1), 37)]   # 前一晚的假宮縮（另一段）
PREP = EARLY + [c(at(2, 48, 20), 52), c(at(2, 58, 2), 55)]                                  # 第一次 ≤ 10 分 → 準備中
FAST = PREP + [c(at(3, 7, 15), 61), c(at(3, 11, 40), 58), c(at(3, 15, 50), 63)]                # 連續 2 次 ≤ 5 分 → 請直接出發
ARCHIVE = [{'at': at(22, 40, 0, -2), 'list': [c(at(22, 1, 0, -2), 30), c(at(22, 14, 0, -2), 34), c(at(22, 26, 0, -2), 31), c(at(22, 33, 0, -2), 36)]}]

def state(lst, active=None, archive=None):
    return {'list': lst, 'active': active, 'threshold': 10, 'theme': 'day', 'bag': {'id': True, 'nhi': True, 'book': True},
            'sound': True, 'archive': archive or []}

# ── 本機伺服器與字體 ──
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=ROOT,
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
line = srv.stdout.readline()
PORT = int(line.split('port ')[1].split(' ')[0])
URL = f'http://127.0.0.1:{PORT}/family/contraction-timer.html'

FONT_CSS = None
if args.local_fonts:
    base = Path(args.local_fonts)
    parts = []
    for pkg, weights in [('noto-sans-tc', [400, 500, 700]), ('noto-serif-tc', [500, 700])]:
        for w in weights:
            css = (base / pkg / f'{w}.css').read_text()
            parts.append(css.replace('url(./files/', f'url(https://fonts.local/{pkg}/files/'))
    FONT_CSS = '\n'.join(parts)

def route_fonts(ctx):
    if not FONT_CSS: return
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body=FONT_CSS, content_type='text/css'))
    def serve(r):
        rel = r.request.url.split('https://fonts.local/')[1]
        r.fulfill(body=(Path(args.local_fonts) / rel).read_bytes(), content_type='font/woff2')
    ctx.route('https://fonts.local/**', serve)

# ── 工具 ──
def open_page(b, data, now_ms):
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=SCALE, locale='zh-TW',
                        timezone_id='Asia/Taipei', color_scheme='light', reduced_motion='no-preference')
    route_fonts(ctx)
    ctx.add_init_script(f"localStorage.setItem('{KEY}', {json.dumps(json.dumps(data))}); Math.random = () => 0;")
    pg = ctx.new_page()
    pg.clock.install(time=now_ms / 1000)
    pg.clock.pause_at(now_ms / 1000)
    pg.goto(URL)
    pg.clock.run_for(600)
    pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300); pg.evaluate('document.fonts.ready')
    return ctx, pg

def freeze(pg, ms):
    """把所有動畫停在指定時間點（毫秒），截圖才穩定。"""
    pg.evaluate(f"document.getAnimations().forEach(a => {{ a.pause(); if (a.effect && a.effect.getTiming().iterations === Infinity) a.currentTime = {ms}; else a.finish(); }})")

def box(pg, top_sel, bottom_sel=None, pad=12, left_sel=None):
    t = pg.locator(top_sel).first.bounding_box()
    bt = pg.locator(bottom_sel).first.bounding_box() if bottom_sel else t
    lx = pg.locator(left_sel).first.bounding_box() if left_sel else None
    x0 = max(0, (lx['x'] if lx else 0) - (pad if lx else 0))
    x1 = min(W, (lx['x'] + lx['width'] + pad) if lx else W)
    return {'x': x0, 'y': max(0, t['y'] - pad), 'width': x1 - x0, 'height': bt['y'] + bt['height'] + pad - max(0, t['y'] - pad)}

def shot(pg, clip, name):
    tmp = Path(tempfile.mkdtemp()) / 'a.png'
    pg.screenshot(path=str(tmp), clip=clip)
    out = OUT / f'{PREFIX}-{name}.webp'
    Image.open(tmp).convert('RGB').save(out, 'WEBP', quality=82, method=6)
    print(f'  {out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB')
    return out

def scroll_to(pg, sel, offset=40):
    y = pg.locator(sel).first.bounding_box()['y']
    pg.evaluate(f"window.scrollBy(0, {y - offset})")
    pg.clock.run_for(50)

OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()

    def card(pg, sel, name, pad=16):
        scroll_to(pg, sel, 60)
        return shot(pg, box(pg, sel, pad=pad), name)

    print('1 使用旅程：各階段用到的區塊')
    ctx, pg = open_page(b, state(LATER), at(3, 19, 10)); freeze(pg, 3000)
    card(pg, '#bag', '1-1-bag')
    pg.evaluate("document.getElementById('lamaze').open = true"); pg.clock.run_for(100)
    scroll_to(pg, '#lamaze', 60)
    lz = box(pg, '#lamaze', pad=16); lz['height'] = min(lz['height'], 560)   # 只取前幾種呼吸
    shot(pg, lz, '1-1b-lamaze')
    pg.evaluate("document.getElementById('lamaze').open = false"); pg.clock.run_for(100)
    card(pg, 'section.card:has(#barsBox)', '1-3-rhythm')
    card(pg, 'section.clinic', '1-4-clinic')
    card(pg, 'section.symph', '1-5-symphony')
    ctx.close()
    ctx, pg = open_page(b, state(LATER[:-1], active=at(3, 16, 30)), at(3, 16, 53, ))
    freeze(pg, 3500)
    shot(pg, box(pg, '#statusWrap', '#stage', pad=16), '1-2-contracting')
    ctx.close()

    print('2 出發判斷：五種狀態')
    for name, data, now in [('2-1-watch', EARLY, at(2, 37, 30)), ('2-2-prep', PREP, at(3, 1, 0)), ('2-3-go', LATER, at(3, 19, 10)),
                            ('2-4-fast', FAST, at(3, 17, 30)), ('2-5-rest', EARLY, at(3, 20, 0))]:
        ctx, pg = open_page(b, state(data), now); freeze(pg, 3000)
        shot(pg, box(pg, '#statusWrap', pad=16), name)
        ctx.close()

    print('3 按下按鈕：一次操作的前後')
    ctx, pg = open_page(b, state(EARLY), at(2, 37, 30)); freeze(pg, 2000)
    shot(pg, box(pg, '#stage', pad=16), '3-1-idle'); ctx.close()
    ctx, pg = open_page(b, state(EARLY, active=at(2, 40, 0)), at(2, 40, 23)); freeze(pg, 3500)
    shot(pg, box(pg, '#stage', pad=16), '3-2-contracting'); ctx.close()
    ctx, pg = open_page(b, state(EARLY, active=at(2, 40, 0)), at(2, 40, 54))
    pg.locator('#mainBtn').click(force=True); pg.clock.run_for(1200); freeze(pg, 2000)
    shot(pg, box(pg, '#stage', pad=16), '3-3-cheer'); ctx.close()
    ctx, pg = open_page(b, state(EARLY, active=at(2, 40, 0)), at(2, 40, 2))
    st = pg.locator('#stage').bounding_box()
    pg.set_viewport_size({'width': W, 'height': int(st['height'] + 112)})
    pg.evaluate(f"window.scrollTo(0, {st['y'] - 16})")
    pg.evaluate("let n = document.getElementById('stage').nextElementSibling; while (n) { n.style.visibility = 'hidden'; n = n.nextElementSibling; }")   # 只留按鈕區和提示
    pg.locator('#mainBtn').click(force=True); pg.clock.run_for(600); freeze(pg, 2000)
    shot(pg, {'x': 0, 'y': 0, 'width': W, 'height': int(st['height'] + 112)}, '3-4-too-short'); ctx.close()
    ctx, pg = open_page(b, state(LATER, active=at(3, 24, 10)), at(3, 27, 35)); freeze(pg, 3500)
    shot(pg, box(pg, '#stage', pad=16), '3-5-forgot'); ctx.close()

    print('5 紀錄列表與備份')
    ctx, pg = open_page(b, state(YESTERDAY + LATER, archive=ARCHIVE), at(3, 19, 10))
    freeze(pg, 3000)
    log_card = 'section.card:has(#log)'
    scroll_to(pg, log_card)
    shot(pg, box(pg, log_card, pad=16), '5-1-log')
    backup_h2 = 'h2:text("備份紀錄")'
    scroll_to(pg, backup_h2, 80)
    bb = box(pg, backup_h2, '#restoreBtn', pad=20, left_sel='section.card:has(#exportBtn)')
    shot(pg, bb, '5-3-backup')
    ctx.close()
    ctx, pg = open_page(b, state(YESTERDAY + LATER), at(3, 19, 10))
    scroll_to(pg, 'section.card:has(#log)', 8)   # 背景是準備清掉的紀錄
    pg.locator('#clearBtn').click(force=True); pg.clock.run_for(300); freeze(pg, 3000)
    sh = pg.locator('#sheet .card').bounding_box()
    shot(pg, {'x': 0, 'y': max(0, sh['y'] - 200), 'width': W, 'height': H - max(0, sh['y'] - 200)}, '5-2-clear')
    ctx.close()

    print('6 宮縮中的呼吸短片')
    start = at(3, 7, 15) + 62 * 1000 + 8 * 60 * 1000 + 20000      # 宮縮開始時間
    ctx, pg = open_page(b, state(LATER[:-1], active=start), start + 20000 - 600)   # open_page 會再跑 600ms，第一格剛好是開始後第 20 秒＝循環起點
    pg.evaluate("document.getElementById('stage').style.setProperty('--bd', '0s')")
    clip = box(pg, '#statusWrap', '#stage', pad=16)
    pg.evaluate("""() => { window.__seen = new WeakMap(); window.__step = (f, ms) => {
      document.getAnimations().forEach(a => {
        if (!__seen.has(a)) __seen.set(a, { f, base: a.effect.getTiming().iterations === Infinity ? 0 : (a.currentTime || 0) });
        const s = __seen.get(a); a.pause(); a.currentTime = s.base + (f - s.f) * ms;
      });
    }; }""")   # 以函式形式傳入，Playwright 才不會把字串裡的箭頭函式直接呼叫掉
    frames = Path(tempfile.mkdtemp())
    step = 1000 / FPS
    for f in range(FPS * LOOP_S):
        if f: pg.clock.run_for(round(f * step) - round((f - 1) * step))
        pg.evaluate(f'__step({f}, {step})')
        pg.screenshot(path=str(frames / f'f{f:03d}.png'), clip=clip)
        if f == int(3.5 * FPS):
            shutil.copy(frames / f'f{f:03d}.png', frames / 'poster.png')
    poster = OUT / f'{PREFIX}-6-breathing-poster.webp'
    Image.open(frames / 'poster.png').convert('RGB').save(poster, 'WEBP', quality=82, method=6)
    print(f'  {poster.relative_to(ROOT)}  {poster.stat().st_size // 1024} KB')
    video = OUT / f'{PREFIX}-6-breathing.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(frames / 'f%03d.png'),
                    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(video)], check=True)
    print(f'  {video.relative_to(ROOT)}  {video.stat().st_size // 1024} KB')
    shutil.rmtree(frames)
    ctx.close()
    b.close()
srv.terminate()
