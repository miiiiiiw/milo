// 原文學習（reading/）與影片學習（watching/）共用的頁面增強，由兩邊的 _inbox/sync.mjs 在轉換時注入。
// 改這裡之後，兩邊 sync.mjs 的 VERSION 都要 +1，所有頁面才會重新套用。

// ── 分頁按鈕置頂縮小 ──
// 原位：維持 Grok 模板的大按鈕（中文＋英文小字）。
// 往下滑到置頂後：加上 .stuck，縮成一條細列、只顯示英文（Translation／Takeaways）。
// 縮小時量測位移、用 margin-bottom 補回，內容不會跳動；置頂狀態下切換分頁，會捲到新分頁開頭。
export const TABS_CSS =
  "\n/* ── milo 分頁置頂縮小（收件匣同步自動加入，請勿手改） ── */\n" +
  ".tabs.stuck{padding:6px 0}\n" +
  ".tabs.stuck label,.tabs.stuck a{font-size:0;padding:8px;min-height:0;border-radius:8px}\n" +
  ".tabs.stuck label .s,.tabs.stuck a .s{font-size:13.5px;font-weight:600;opacity:1;letter-spacing:.02em;line-height:1.3}\n";

export const TABS_JS =
  '<script>/* milo 分頁置頂縮小 */(function(){function init(){var t=document.querySelector(".tabs");' +
  'if(!t||!("IntersectionObserver" in window))return;' +
  'var s=document.createElement("div");s.setAttribute("aria-hidden","true");s.style.cssText="height:1px;margin-top:-1px";' +
  't.parentNode.insertBefore(s,t);var base=parseFloat(getComputedStyle(t).marginBottom)||0;' +
  'function nx(){var p=t.nextElementSibling;while(p&&!p.offsetHeight)p=p.nextElementSibling;return p}' +
  // 縮小後用文件座標量測下方內容的位移（Chrome 的捲動錨定會改 scrollY，所以不能用視窗座標），用 margin-bottom 補回；與下一個元素的 margin 會合併，所以量測修正最多三次
  'function set(on){if(on===t.classList.contains("stuck"))return;var n=nx(),Y=function(){return n.getBoundingClientRect().top+window.pageYOffset},a=n?Y():0;' +
  't.classList.toggle("stuck",on);t.style.marginBottom="";if(!on||!n)return;var m=base;' +
  'for(var i=0;i<3;i++){var d=a-Y();if(Math.abs(d)<.5)break;m+=d;t.style.marginBottom=m+"px"}}' +
  'new IntersectionObserver(function(e){var r=e[0];set(!r.isIntersecting&&r.boundingClientRect.top<0)}).observe(s);' +
  'document.querySelectorAll("input.tab-r").forEach(function(r){r.addEventListener("change",function(){' +
  'if(!t.classList.contains("stuck"))return;var p=nx();' +
  'if(p)window.scrollTo(0,p.getBoundingClientRect().top+window.pageYOffset-t.offsetHeight-base)})})}' +
  'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init()})();</script>';

// ── 字型規範（2026-11-19 與使用者確認；影片學習同日套用）：英數用 Saira、中文用系統黑體；字級用偶數、行高用 4 的倍數 ──
export const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Saira:wght@300;400;600;700&display=swap" rel="stylesheet">';
export const TYPE_CSS =
  "\n/* ── milo 字型規範（原文學習、影片學習共用，收件匣同步自動加入，請勿手改） ── */\n" +
  "body{font-family:'Saira','PingFang TC','Noto Sans TC','Noto Sans CJK TC','Microsoft JhengHei',sans-serif;font-size:16px;line-height:1.75;font-weight:300;letter-spacing:.5px}\n" +
  "strong,b{font-weight:700}\n" +
  "h1{font-size:28px;line-height:36px;font-weight:600}\n" +
  "h2{font-size:22px;line-height:32px;font-weight:600}\n" +
  "h3,h4,.pt h3{font-size:18px;line-height:28px;font-weight:600}\n" +
  ".en-title{font-size:16px;line-height:24px}\n" +
  "h2 .en{font-size:14px;line-height:20px}\n" +
  "h3 .en,h4 .en{font-size:12px;line-height:20px}\n" +
  ".lead,.tk .lead{font-size:16px;line-height:28px;font-weight:400}\n" +
  ".meta,.tn,.orig,.eg,.flow,.zh-note,.fit,.tweet .who,blockquote .src{font-size:14px;line-height:24px}\n" +
  ".tbl{font-size:14px;line-height:22px}\n" +
  "pre{font-size:14px;line-height:22px}\n" +
  "blockquote{line-height:24px}\n" +
  "blockquote p{margin:4px 0}\n" +
  "figcaption{font-size:12px;line-height:18px}\n" +
  ".note,footer,.tweet .when,.emb-note,.zh-note .orig,.code-lab,.tweet .tr-lbl,.tabs label .s{font-size:12px;line-height:20px}\n" +
  "@media (max-width:560px){h1{font-size:24px;line-height:32px}h2{font-size:20px;line-height:28px}}\n";

// ── 閱讀進度條（2026-11-21 與使用者確認）：流光漸層＋章節刻度＋流蘇前緣＋讀完慶祝 ──
// 結構：#milo-rp > .fill（寬度＝進度）> .body（流光本體，尾端淡出）＋ .fringe（流蘇，從本體淡出處長出）
// 捲動時加 .moving：前端變亮、流蘇擺動；讀到底加 .done：整條轉金色並浮出提示。
export const PROGRESS_CSS =
  "\n" +
  "/* ── milo 閱讀進度條（收件匣同步自動加入，請勿手改） ── */\n" +
  "#milo-rp{position:fixed;top:0;left:0;right:0;height:5px;z-index:50;pointer-events:none;background:rgba(255,140,90,.14)}\n" +
  "#milo-rp .fill{position:relative;height:100%;width:0;filter:drop-shadow(0 0 4px rgba(255,120,70,.45))}\n" +
  "#milo-rp .body{position:absolute;inset:0;background:linear-gradient(90deg,#ff5f6d,#ff8a4c,#ffc23d,#ff8a4c,#ff5f6d);background-size:200% 100%;animation:milo-rp-flow 3s linear infinite;-webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 36px),rgba(0,0,0,.7) calc(100% - 22px),rgba(0,0,0,.3) calc(100% - 10px),transparent);mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 36px),rgba(0,0,0,.7) calc(100% - 22px),rgba(0,0,0,.3) calc(100% - 10px),transparent)}\n" +
  "#milo-rp .body::after{content:\"\";position:absolute;top:0;right:0;width:64px;height:100%;background:linear-gradient(90deg,rgba(255,244,214,0),rgba(255,244,214,.9) 55%,rgba(255,244,214,.9));opacity:.45;transition:opacity .3s}\n" +
  "#milo-rp.moving .body::after{opacity:1}\n" +
  "@keyframes milo-rp-flow{to{background-position:-200% 0}}\n" +
  "#milo-rp .fringe{position:absolute;top:0;right:-8px;width:32px;height:100%;opacity:.7;transition:opacity .3s;background:linear-gradient(90deg,rgba(255,210,122,0),#ffd27a 30%,rgba(255,210,122,0.3) 58%,rgba(255,210,122,0) 85%) 0 0px/20px 1px no-repeat,linear-gradient(90deg,rgba(255,195,90,0),#ffc35a 30%,rgba(255,195,90,0.3) 58%,rgba(255,195,90,0) 85%) 0 1px/15px 1px no-repeat,linear-gradient(90deg,rgba(255,227,163,0),#ffe3a3 30%,rgba(255,227,163,0.3) 58%,rgba(255,227,163,0) 85%) 0 2px/24px 1px no-repeat,linear-gradient(90deg,rgba(255,190,85,0),#ffbe55 30%,rgba(255,190,85,0.3) 58%,rgba(255,190,85,0) 85%) 0 3px/13px 1px no-repeat,linear-gradient(90deg,rgba(255,210,122,0),#ffd27a 30%,rgba(255,210,122,0.3) 58%,rgba(255,210,122,0) 85%) 0 4px/18px 1px no-repeat;animation:milo-rp-wave 1.8s ease-in-out infinite}\n" +
  "#milo-rp.moving .fringe{opacity:1;animation-duration:.8s}\n" +
  "@keyframes milo-rp-wave{0%{background-size:20px 1px,20px 1px,27px 1px,11px 1px,13px 1px}25%{background-size:25px 1px,17px 1px,20px 1px,9px 1px,18px 1px}50%{background-size:20px 1px,10px 1px,21px 1px,15px 1px,23px 1px}75%{background-size:15px 1px,13px 1px,28px 1px,17px 1px,18px 1px}100%{background-size:20px 1px,20px 1px,27px 1px,11px 1px,13px 1px}}\n" +
  "#milo-rp .tick{position:absolute;top:0;width:2px;height:100%;background:rgba(255,255,255,.85)}\n" +
  "#milo-rp.done .body{background:linear-gradient(90deg,#ffc23d,#ffd86b);-webkit-mask-image:none;mask-image:none;animation:milo-rp-done 1.2s ease-out 1}\n" +
  "#milo-rp.done .body::after,#milo-rp.done .fringe{opacity:0}\n" +
  "@keyframes milo-rp-done{30%{filter:brightness(1.35)}100%{filter:brightness(1)}}\n" +
  "#milo-rp-toast{position:fixed;top:12px;left:50%;transform:translate(-50%,-8px);z-index:51;font:600 13px/20px 'Saira','PingFang TC',sans-serif;letter-spacing:.5px;color:#7a3b00;background:#fff3d6;border:1px solid #ffd27a;border-radius:999px;padding:4px 14px;box-shadow:0 4px 14px rgba(255,150,50,.25);opacity:0;transition:opacity .35s,transform .35s;pointer-events:none;white-space:nowrap}\n" +
  "#milo-rp-toast.show{opacity:1;transform:translate(-50%,0)}\n" +
  "@media (prefers-color-scheme:dark){:root:not([data-theme=light]) #milo-rp-toast{color:#ffe2ad;background:#3a2a12;border-color:#7a5520}}\n" +
  ":root[data-theme=dark] #milo-rp-toast{color:#ffe2ad;background:#3a2a12;border-color:#7a5520}\n" +
  "@media (prefers-reduced-motion:reduce){#milo-rp .body,#milo-rp .fringe{animation:none}#milo-rp-toast{transition:none}}\n" +
  "@media print{#milo-rp,#milo-rp-toast{display:none}}\n";

export const PROGRESS_JS =
  '<script>/* milo 閱讀進度條 */(function(){function init(){' +
  'var bar=document.createElement("div");bar.id="milo-rp";bar.innerHTML=\'<div class="fill"><i class="body"></i><i class="fringe"></i></div>\';' +
  'var toast=document.createElement("div");toast.id="milo-rp-toast";toast.textContent="讀完了，辛苦了 ✦";' +
  'document.body.appendChild(bar);document.body.appendChild(toast);var fill=bar.firstChild,done=false,raf=0,mt=0;' +
  'function panel(){var ps=document.querySelectorAll(\'[id^="panel-"]\');for(var i=0;i<ps.length;i++){if(ps[i].offsetParent!==null)return ps[i]}return document.querySelector("main")||document.body}' +
  'function len(p){var top=p.getBoundingClientRect().top+scrollY,end=document.documentElement.scrollHeight-innerHeight-top;return Math.max(1,Math.min(p.offsetHeight-innerHeight*.6,end))}' +
  'function ticks(){var old=bar.querySelectorAll(".tick");for(var i=0;i<old.length;i++)old[i].remove();var p=panel(),top=p.getBoundingClientRect().top+scrollY,L=len(p),hs=p.querySelectorAll("h2");' +
  'for(var j=0;j<hs.length;j++){var f=(hs[j].getBoundingClientRect().top+scrollY-top)/L;if(f>.02&&f<.98){var t=document.createElement("i");t.className="tick";t.style.left=(f*100)+"%";bar.appendChild(t)}}}' +
  'function upd(){raf=0;var p=panel(),f=Math.min(1,Math.max(0,-p.getBoundingClientRect().top/len(p)));fill.style.width=(f*100)+"%";' +
  'if(f>=.995&&!done){done=true;bar.classList.add("done");toast.classList.add("show");setTimeout(function(){toast.classList.remove("show")},2200)}' +
  'else if(f<.97&&done){done=false;bar.classList.remove("done")}}' +
  'function req(){if(!raf)raf=requestAnimationFrame(upd)}' +
  'addEventListener("scroll",function(){req();bar.classList.add("moving");clearTimeout(mt);mt=setTimeout(function(){bar.classList.remove("moving")},500)},{passive:true});' +
  'addEventListener("resize",function(){ticks();req()});addEventListener("load",function(){ticks();req()});' +
  'var rs=document.querySelectorAll(".tab-r");for(var k=0;k<rs.length;k++)rs[k].addEventListener("change",function(){done=false;bar.classList.remove("done");setTimeout(function(){ticks();upd()},50)});' +
  'ticks();upd()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init()})();</script>';
