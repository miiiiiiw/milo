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
