# 宮縮計時（family/contraction-timer.html）情境測試
# 用 Playwright 假時鐘模擬真實使用流程，不必真的等時間。
# 執行：pip install playwright && playwright install chromium && python3 scripts/test-contraction-timer.py
import json, sys, subprocess, time, os
from datetime import datetime
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = 'http://localhost:8766/family/contraction-timer.html'
KEY = 'milo-contraction-v1'
T0 = datetime(2026, 11, 14, 20, 0, 0)
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))

def new_page(b, ua=None, share=True):
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, user_agent=ua, permissions=['clipboard-read', 'clipboard-write'])
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=T0)
    shared = []
    pg.expose_function('__shared', lambda t: shared.append(t))
    init = "window.__nav=[];"
    if share:
        init += "navigator.share = async (d) => { window.__shared(d.text); };"
    else:
        init += "delete Navigator.prototype.share; navigator.share = undefined;"
    pg.add_init_script(init)
    pg.goto(URL)
    return ctx, pg, errs, shared

def contraction(pg, dur_s, gap_after_s):
    pg.click('#mainBtn'); pg.clock.run_for(dur_s * 1000)
    pg.click('#mainBtn'); pg.clock.run_for(gap_after_s * 1000)

def stored(pg): return pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")
def text(pg, sel): return pg.locator(sel).inner_text()

with sync_playwright() as p:
    b = p.chromium.launch()

    # 1. 初次開啟
    ctx, pg, errs, _ = new_page(b)
    check('1 初次開啟：狀態為「還沒有紀錄」', '還沒有紀錄' in text(pg, '#statusTitle'))
    check('1 初次開啟：一般瀏覽器不顯示 LINE 提醒', pg.locator('#inapp').is_hidden())

    # 2. 一次完整宮縮
    pg.click('#mainBtn'); pg.clock.run_for(3300)
    check('2 按下開始：進入宮縮中（綠色、呼吸引導）', pg.locator('#stage.active').count() == 1 and '吸氣' in text(pg, '#cue'))
    check('2 計時器在跑', '0:03' in text(pg, '#btnL1'), text(pg, '#btnL1'))
    pg.clock.run_for(1700)
    check('2 第 5 秒切換成吐氣', '吐氣' in text(pg, '#cue'), text(pg, '#cue'))
    pg.clock.run_for(50000)
    pg.click('#mainBtn'); pg.clock.run_for(500)
    s = stored(pg)
    check('2 結束後存入 1 筆，持續約 55 秒', len(s['list']) == 1 and abs((s['list'][0]['end'] - s['list'][0]['start']) / 1000 - 55) < 1)
    check('2 結束後顯示鼓勵的話', len(text(pg, '#cue')) > 3, text(pg, '#cue'))
    check('2 紀錄列表出現「第一次」', '第一次' in text(pg, '#log'))

    # 3. 誤觸：不到 5 秒不記錄
    pg.click('#mainBtn'); pg.clock.run_for(2000); pg.click('#mainBtn'); pg.clock.run_for(300)
    check('3 不到 5 秒不記錄', len(stored(pg)['list']) == 1)
    check('3 跳出提示', 'show' in pg.get_attribute('#toast', 'class'))

    # 4. 忘了按結束
    pg.click('#mainBtn'); pg.clock.run_for(3 * 60000 + 2000)
    check('4 超過 3 分鐘出現「忘了按結束」', pg.locator('#forgot.show').count() == 1)
    pg.click('#cancelBtn'); pg.clock.run_for(300)
    check('4 取消後不記錄、回到待機', len(stored(pg)['list']) == 1 and pg.locator('#stage.active').count() == 0)

    # 5. 重新整理後資料還在
    pg.reload(); pg.clock.run_for(500)
    check('5 重新整理後紀錄仍在', '第一次' in text(pg, '#log') and len(stored(pg)['list']) == 1)

    # 6. 宮縮中重新整理，計時要延續
    pg.click('#mainBtn'); pg.clock.run_for(20000); pg.reload(); pg.clock.run_for(1000)
    check('6 宮縮中重新整理，計時延續', pg.locator('#stage.active').count() == 1 and '0:2' in text(pg, '#btnL1'), text(pg, '#btnL1'))
    pg.click('#cancelBtn') if pg.locator('#forgot.show').count() else None
    pg.evaluate("S.active=null;store.save()"); ctx.close()

    # 7. 狀態從觀察 → 準備 → 出發（門檻 10 分）
    ctx, pg, errs, shared = new_page(b)
    contraction(pg, 50, 15 * 60)   # 第 1 次後隔 15 分
    contraction(pg, 50, 12 * 60)
    st1 = text(pg, '#statusTitle')
    contraction(pg, 50, 9 * 60)
    st2 = text(pg, '#statusTitle')
    check('7 間隔 15 分：尚未進入出發', '出發' not in st1, st1)
    contraction(pg, 50, 9 * 60); contraction(pg, 50, 8 * 60)
    st3 = text(pg, '#statusTitle')
    check('7 連續 1 次 ≤10 分：準備中', '越來越近' in st2, st2)
    pg.click('#mainBtn'); pg.clock.run_for(50000); pg.click('#mainBtn'); pg.clock.run_for(500)
    st4 = text(pg, '#statusTitle')
    check('7 連續 3 次 ≤10 分：可以準備出發了', '出發' in st4, st4)
    check('7 出發狀態顯示「打給產房」與「通知家人」', pg.locator('.go-actions').is_visible())
    check('7 打給產房連結含分機停頓', pg.get_attribute('.go-actions a', 'href') == 'tel:0233932211,105')

    # 8. 傳給家人
    pg.locator('.go-actions .share-btn').click(); pg.clock.run_for(300)
    msg = shared[-1] if shared else ''
    check('8 通知家人：叫出分享並帶入文字', bool(msg))
    check('8 訊息含狀態、平均間隔、持續、近一小時、最近時間',
          all(k in msg for k in ['宮縮紀錄｜', '準備出發', '平均間隔', '分鐘', '每次持續', '近一小時', '最近：']), msg)
    check('8 訊息精簡（≤ 10 行）', msg.count('\n') <= 10, f'{msg.count(chr(10))+1} 行')
    pg.click('#mainBtn'); pg.clock.run_for(10000)
    pg.locator('#log ~ .row-btns .share-btn').click(); pg.clock.run_for(300)
    check('8 宮縮中傳送會註明「此刻正在宮縮中」', '此刻正在宮縮中' in (shared[-1] if shared else ''), shared[-1] if shared else '')
    pg.click('#mainBtn'); pg.clock.run_for(500)

    # 9. 很久沒宮縮 → 回到觀察
    pg.clock.fast_forward(45 * 60000); pg.evaluate("renderStatus()")
    check('9 45 分鐘沒有宮縮：回到休息觀察', '休息' in text(pg, '#statusTitle'), text(pg, '#statusTitle'))

    # 10. 調整門檻
    n_before = text(pg, '#thVal')
    for _ in range(15): pg.click('#minus')
    lo = text(pg, '#thVal')
    for _ in range(30): pg.click('#plus')
    hi = text(pg, '#thVal')
    pg.reload(); pg.clock.run_for(300)
    check('10 門檻下限 3 分、上限 20 分', lo == '3 分' and hi == '20 分', f'{lo} / {hi}')
    check('10 門檻重新整理後仍保留', text(pg, '#thVal') == '20 分')
    for _ in range(10): pg.click('#minus')

    # 11. 刪除與復原
    n = len(stored(pg)['list'])
    pg.locator('#log button[data-i]').first.click(); pg.clock.run_for(300)
    check('11 刪除一筆', len(stored(pg)['list']) == n - 1)
    pg.click('#toastAct'); pg.clock.run_for(300)
    check('11 按「復原」後回來', len(stored(pg)['list']) == n)

    # 12. 複製完整紀錄
    pg.click('#copyBtn'); pg.clock.run_for(300)
    clip = pg.evaluate("navigator.clipboard.readText()")
    check('12 複製完整紀錄到剪貼簿', '宮縮紀錄' in clip and '持續' in clip, clip[:60])

    # 13. 清除全部（含取消）
    pg.click('#clearBtn'); pg.click('#sheetNo')
    check('13 清除時按「先不要」不會刪', len(stored(pg)['list']) == n)
    pg.click('#clearBtn'); pg.click('#sheetYes'); pg.clock.run_for(300)
    check('13 確定清除後歸零', len(stored(pg)['list']) == 0 and '還沒有紀錄' in text(pg, '#statusTitle'))
    pg.locator('#log ~ .row-btns .share-btn').click(); pg.clock.run_for(300)
    check('13 沒有紀錄時按傳送只提示、不分享', '還沒有紀錄' in text(pg, '#toastMsg'))

    # 14. 待產包勾選與夜間模式保留
    pg.locator('#check input').nth(1).check()
    pg.click('#themeBtn'); pg.reload(); pg.clock.run_for(300)
    check('14 待產包勾選重新整理後保留', pg.locator('#check input').nth(1).is_checked())
    check('14 夜間模式重新整理後保留', pg.evaluate("document.documentElement.dataset.theme") == 'night')
    check('14 全程沒有 JavaScript 錯誤', not errs, '; '.join(errs))
    ctx.close()

    # 15. 不支援系統分享時改開 LINE 分享
    ctx, pg, errs, _ = new_page(b, share=False)
    contraction(pg, 40, 60)
    nav = []
    pg.route('https://line.me/**', lambda r: (nav.append(r.request.url), r.fulfill(body='ok')))
    pg.locator('#log ~ .row-btns .share-btn').click(); pg.wait_for_timeout(800)
    check('15 不支援分享選單時改開 LINE 分享網址', nav and nav[0].startswith('https://line.me/R/share?text='), nav[0][:60] if nav else '')
    ctx.close()

    # 16. LINE 內建瀏覽器
    ctx, pg, errs, _ = new_page(b, ua='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari Line/15.1.0')
    check('16 LINE 內開啟顯示提醒', pg.locator('#inapp').is_visible())
    check('16 「用瀏覽器開啟」帶 openExternalBrowser=1', 'openExternalBrowser=1' in pg.get_attribute('#openExt', 'href'))
    check('16 手機寬度沒有橫向捲動', pg.evaluate("document.documentElement.scrollWidth") <= 390)
    ctx.close()

    # 17. 忘了按結束 → 記為約 1 分鐘
    ctx, pg, errs, shared = new_page(b)
    pg.click('#mainBtn'); pg.clock.run_for(4 * 60000)
    pg.click('#oneMinBtn'); pg.clock.run_for(300)
    s = stored(pg)
    check('17 忘了按結束：「記為約 1 分鐘」保留開始時間、持續 60 秒', len(s['list']) == 1 and s['list'][0]['end'] - s['list'][0]['start'] == 60000 and s['active'] is None)
    check('17 間隔說明文字有出現', '開始」算到這一次「開始' in pg.locator('#barsBox + .note').inner_text())
    ctx.close()

    # 18. 第二胎快速進展：連續 2 次 ≤ 5 分直接出發
    ctx, pg, errs, shared = new_page(b)
    contraction(pg, 45, 12 * 60); contraction(pg, 45, 4 * 60)
    mid = text(pg, '#statusTitle')
    contraction(pg, 45, 3 * 60 + 30); pg.click('#mainBtn'); pg.clock.run_for(45000); pg.click('#mainBtn'); pg.clock.run_for(300)
    st = text(pg, '#statusTitle')
    check('18 只有 1 次 ≤ 5 分：還不到出發', '出發' not in mid, mid)
    check('18 連續 2 次 ≤ 5 分：請直接出發', st == '請直接出發', st)
    pg.locator('.go-actions .share-btn').click(); pg.clock.run_for(300)
    check('18 分享文字註明快速進展', '連續 2 次間隔在 5 分鐘內' in (shared[-1] if shared else ''), shared[-1] if shared else '')

    # 19. 出發狀態下，隔很久才又開始 → 狀態要降回來
    pg.clock.run_for(12 * 60000); pg.click('#mainBtn'); pg.clock.run_for(1000)
    st = text(pg, '#statusTitle')
    check('19 距上次 12 分鐘才又宮縮：不再顯示出發', '出發' not in st, st)
    pg.click('#mainBtn'); pg.clock.run_for(300); ctx.close()

    # 20. 分段：昨晚的假宮縮與今天分開
    ctx, pg, errs, shared = new_page(b)
    for _ in range(4): contraction(pg, 90, 6 * 60)       # 昨晚：每次 90 秒、間隔約 6 分
    pg.clock.fast_forward(3 * 3600000); pg.clock.run_for(300)                       # 停了 3 小時
    check('20 停了 3 小時：狀態回到休息', '休息' in text(pg, '#statusTitle'), text(pg, '#statusTitle'))
    check('20 久沒宮縮時「距離上次」改用小時顯示', '小時' in text(pg, '#since'), text(pg, '#since'))
    pg.click('#mainBtn'); pg.clock.run_for(1000)
    check('20 新的一段第一次宮縮中：顯示「新的一段開始了」', text(pg, '#statusTitle') == '新的一段開始了', text(pg, '#statusTitle'))
    pg.clock.run_for(39000); pg.click('#mainBtn'); pg.clock.run_for(8 * 60000)
    contraction(pg, 40, 60)
    check('20 平均持續只算新的一段（約 40 秒）', '40' in text(pg, '#sAvgDur'), text(pg, '#sAvgDur'))
    check('20 平均間隔只算新的一段（約 8 分）', text(pg, '#sAvgGap').startswith('8'), text(pg, '#sAvgGap'))
    check('20 紀錄列表出現「上一段」分隔線與「新的一段」標記', pg.locator('#log li.sep').count() == 1 and '新的一段' in text(pg, '#log'))
    check('20 舊紀錄仍保留', len(stored(pg)['list']) == 6)
    pg.click('#copyBtn'); pg.clock.run_for(300)
    clip = pg.evaluate("navigator.clipboard.readText()")
    check('20 複製只包含目前這一段', '這一段共 2 次' in clip, clip[:80])
    pg.locator('#log ~ .row-btns .share-btn').click(); pg.clock.run_for(300)
    check('20 分享的「最近」只列新的一段', (shared[-1] if shared else '').split('最近：')[-1].count('・') == 1, shared[-1] if shared else '')
    check('20 全程沒有 JavaScript 錯誤', not errs, '; '.join(errs))
    ctx.close()
    b.close()

srv.terminate()
ok = sum(r[1] for r in results)
for name, passed, detail in results:
    print(('✅' if passed else '❌'), name, ('' if passed else f'→ {detail}'))
print(f'\n通過 {ok}/{len(results)}')
sys.exit(0 if ok == len(results) else 1)
