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
// 結構：#milo-rp > .fill（寬度＝進度）> .body（流光本體，往前多延伸一段，用遮罩裁出尾端淡出與五縷流蘇）
// 流蘇就是本體的一部分，顏色與流光會一路延續；波浪擺動由腳本逐格改變遮罩長度（Safari 不會播放遮罩的 CSS 動畫，所以不用 @keyframes）。
// 星芒：通過章節刻度時從前緣迸出 5 顆（約 0.7 秒）；讀完時從頂端分兩波灑下彩帶（手機 40 片、電腦 64 片，約 3～4 秒飄落到底並淡出，只灑一次）；開啟「減少動態效果」時不灑。
// 收尾：最後 4% 的進度裡，流蘇與淡出區由腳本逐漸收回，讀到底時剛好填滿到邊；金色以淡入疊上，不是瞬間換色。
// 捲動時加 .moving：前端變亮、流蘇擺動加快；通過每個章節刻度：刻度點亮成金色並從前緣迸出小星芒；讀過一半：「充能」——整條發光、頂端泛起暖光、兩道亮光接連從起點掃到前緣，抵達時整條強烈亮起、點亮的刻度一起閃，並浮出打氣提示；讀到底加 .done：整條轉金色並浮出提示。
export const PROGRESS_CSS =
  "\n" +
  "/* ── milo 閱讀進度條（收件匣同步自動加入，請勿手改） ── */\n" +
  "#milo-rp{position:fixed;top:0;left:0;right:0;height:5px;z-index:50;pointer-events:none;background:rgba(255,140,90,.14)}\n" +
  "#milo-rp .fill{position:relative;height:100%;width:0;filter:drop-shadow(0 0 4px rgba(255,120,70,.45))}\n" +
  "#milo-rp .body{position:absolute;top:0;bottom:0;left:0;right:-4px;background:linear-gradient(90deg,#ff5f6d,#ff8a4c,#ffc23d,#ff8a4c,#ff5f6d);background-size:200% 100%;animation:milo-rp-flow 3s linear infinite;-webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 22px),rgba(0,0,0,.7) calc(100% - 14px),rgba(0,0,0,.3) calc(100% - 8px),transparent calc(100% - 4px)),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%);mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 22px),rgba(0,0,0,.7) calc(100% - 14px),rgba(0,0,0,.3) calc(100% - 8px),transparent calc(100% - 4px)),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%),linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%);-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:0 0,right 6px top 0px,right 9px top 1px,right 3px top 2px,right 10px top 3px,right 7px top 4px;mask-position:0 0,right 6px top 0px,right 9px top 1px,right 3px top 2px,right 10px top 3px,right 7px top 4px;-webkit-mask-size:100% 100%,12px 1px,9px 1px,15px 1px,8px 1px,11px 1px;mask-size:100% 100%,12px 1px,9px 1px,15px 1px,8px 1px,11px 1px}\n" +
  "#milo-rp .body::after{content:\"\";position:absolute;top:0;right:0;width:72px;height:100%;background:linear-gradient(90deg,rgba(255,244,214,0),rgba(255,244,214,.85) 60%,rgba(255,244,214,.85));opacity:.4;transition:opacity .3s}\n" +
  "#milo-rp.moving .body::after{opacity:1}\n" +
  "@keyframes milo-rp-flow{to{background-position:-200% 0}}\n" +
  "#milo-rp .tick{position:absolute;top:0;width:2px;height:100%;background:rgba(255,255,255,.85);transition:background .4s,box-shadow .4s}\n" +
  "#milo-rp .tick.lit{background:#fff6d8;box-shadow:0 0 5px 1px rgba(255,196,80,.95)}\n" +
  "#milo-rp .sweep{position:absolute;top:0;left:0;width:140px;height:100%;background:linear-gradient(90deg,rgba(255,240,200,0),rgba(255,236,170,.75) 40%,#fff 55%,rgba(255,236,170,.75) 70%,rgba(255,240,200,0));opacity:0;z-index:1}\n" +
  "#milo-rp .fill{transition:filter .4s}\n" +
  "#milo-rp.charging .fill{filter:drop-shadow(0 0 12px rgba(255,170,50,1)) drop-shadow(0 0 3px rgba(255,245,210,1))}\n" +
  "#milo-rp-aura{position:fixed;left:0;right:0;top:0;height:90px;z-index:48;pointer-events:none;background:linear-gradient(180deg,rgba(255,186,80,.42),rgba(255,186,80,.12) 45%,rgba(255,186,80,0));opacity:0}\n" +
  "#milo-rp.charged .body{animation:milo-rp-flow 3s linear infinite,milo-rp-charged 1.2s ease-out 1}\n" +
  "@keyframes milo-rp-charged{0%{filter:brightness(1)}15%{filter:brightness(2) saturate(1.3)}40%{filter:brightness(1.5) saturate(1.15)}100%{filter:brightness(1)}}\n" +
  "#milo-rp.charged .tick.lit{animation:milo-rp-twinkle 1.2s ease-out 1}\n" +
  "@keyframes milo-rp-twinkle{20%{box-shadow:0 0 14px 5px rgba(255,210,100,1);background:#fff}50%{box-shadow:0 0 8px 2px rgba(255,210,100,.9)}}\n" +
  "#milo-rp .body::before{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,#ffc23d,#ffd86b);opacity:0;transition:opacity .6s ease}\n" +
  "#milo-rp.done .body::before{opacity:1}\n" +
  "#milo-rp.done .body{animation:milo-rp-flow 3s linear infinite,milo-rp-done 1.2s ease-out 1}\n" +
  "#milo-rp.done .body::after{opacity:0}\n" +
  "@keyframes milo-rp-done{30%{filter:brightness(1.35)}100%{filter:brightness(1)}}\n" +
  "#milo-rp-toast{position:fixed;top:12px;left:50%;transform:translate(-50%,-8px);z-index:51;font:600 13px/20px 'Saira','PingFang TC',sans-serif;letter-spacing:.5px;color:#7a3b00;background:#fff3d6;border:1px solid #ffd27a;border-radius:999px;padding:4px 14px;box-shadow:0 4px 14px rgba(255,150,50,.25);opacity:0;transition:opacity .35s,transform .35s;pointer-events:none;white-space:nowrap}\n" +
  "#milo-rp-toast.show{opacity:1;transform:translate(-50%,0)}\n" +
  "@media (prefers-color-scheme:dark){:root:not([data-theme=light]) #milo-rp-toast{color:#ffe2ad;background:#3a2a12;border-color:#7a5520}}\n" +
  ":root[data-theme=dark] #milo-rp-toast{color:#ffe2ad;background:#3a2a12;border-color:#7a5520}\n" +
  "@media (prefers-reduced-motion:reduce){#milo-rp .body{animation:none}#milo-rp-toast{transition:none}}\n" +
  "#milo-rp-confetti{position:fixed;inset:0;z-index:49;pointer-events:none;overflow:hidden}\n" +
  "#milo-rp-confetti i{position:absolute;top:-14px;border-radius:1px;will-change:transform,opacity}\n" +
  "#milo-rp-spark{position:fixed;left:0;top:0;width:0;height:0;z-index:52;pointer-events:none}\n" +
  "#milo-rp-spark b{position:absolute;left:0;top:0;font:400 10px/1 sans-serif;margin:-5px 0 0 -5px;text-shadow:0 0 6px rgba(255,190,80,.9);will-change:transform,opacity}\n" +
  "@media print{#milo-rp,#milo-rp-toast,#milo-rp-confetti,#milo-rp-spark,#milo-rp-aura{display:none}}\n";

export const PROGRESS_JS =
  '<script>/* milo 閱讀進度條 */(function(){function init(){' +
  'var bar=document.createElement("div");bar.id="milo-rp";bar.innerHTML=\'<div class="fill"><i class="body"><i class="sweep"></i></i></div>\';' +
  'var toast=document.createElement("div");toast.id="milo-rp-toast";' +
  'document.body.appendChild(bar);document.body.appendChild(toast);var fill=bar.firstChild,done=false,half=false,last=-1,raf=0,mt=0,tt=0,TK=[],lit={};'+
  'function say(s){toast.textContent=s;toast.classList.add("show");clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove("show")},2200)}' +
  'var BD=fill.firstChild,RW=[12,9,15,8,11],S=18,EXT=4,ph=0,lt=0,cf=0,RM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;' +
  'var ST="linear-gradient(90deg,transparent,#000 30%,rgba(0,0,0,.3) 58%,transparent 85%)";' +
  'function shape(){var k=Math.max(0,Math.min(1,(1-cf)/.04));if(k<=0){BD.style.right="0";BD.style.webkitMaskImage=BD.style.maskImage="none";return}' +
  'var s=S*k,x=EXT*k,img="linear-gradient(90deg,#000 0,#000 calc(100% - "+(s+4*k)+"px),rgba(0,0,0,.7) calc(100% - "+(s-4*k)+"px),rgba(0,0,0,.3) calc(100% - "+(x+4*k)+"px),transparent calc(100% - "+x+"px))",sz="100% 100%",ps="0 0";' +
  'for(var i=0;i<5;i++){var w=Math.max(0,Math.min(s,(RW[i]+3*Math.sin(ph+i*1.2))*k));img+=","+ST;sz+=","+w.toFixed(1)+"px 1px";ps+=",right "+(s-w).toFixed(1)+"px top "+i+"px"}' +
  'BD.style.right=(-x)+"px";BD.style.webkitMaskImage=BD.style.maskImage=img;BD.style.webkitMaskSize=BD.style.maskSize=sz;BD.style.webkitMaskPosition=BD.style.maskPosition=ps}' +
  'function wave(ts){var dt=lt?Math.min(.1,(ts-lt)/1000):0;lt=ts;if(!document.hidden){ph+=dt*2*Math.PI/(bar.classList.contains("moving")?.8:1.8);shape()}requestAnimationFrame(wave)}' +
'if(!RM)requestAnimationFrame(wave);' +
  'function confetti(){if(RM||!document.body.animate)return;var c=document.createElement("div");c.id="milo-rp-confetti";document.body.appendChild(c);' +
  'var C=["#ff6f61","#ff9a4c","#ffc23d","#ffe0a3","#ff8a7a"],H=innerHeight,W=innerWidth,n=W<600?40:64;' +
  'for(var i=0;i<n;i++){var e=document.createElement("i"),lg=Math.random()<.25,w=lg?3:4+Math.random()*3,h=lg?14+Math.random()*8:8+Math.random()*6,x=Math.random()*W,dx=(Math.random()-.5)*160,r=Math.random()*360,sp=(Math.random()<.5?-1:1)*(180+Math.random()*360);' +
  'e.style.cssText="left:"+x+"px;width:"+w+"px;height:"+h+"px;background:"+C[i%C.length];c.appendChild(e);' +
  'e.animate([{transform:"translate(0,0) rotate("+r+"deg) rotateX(0deg)",opacity:0},{opacity:1,offset:.08},{transform:"translate("+dx*.6+"px,"+H*.55+"px) rotate("+(r+sp*.6)+"deg) rotateX(360deg)",opacity:1,offset:.55},{transform:"translate("+dx+"px,"+H*1.02+"px) rotate("+(r+sp)+"deg) rotateX(540deg)",opacity:0}],' +
  '{duration:2600+Math.random()*1400,delay:(i%2?500:0)+Math.random()*500,easing:"cubic-bezier(.25,.6,.45,1)",fill:"forwards"})}' +
  'setTimeout(function(){c.remove()},5400)}' +
  'function spark(n,m){n=n||8;m=m||1;if(RM||!document.body.animate)return;var r=fill.getBoundingClientRect(),x=Math.max(16,Math.min(innerWidth-16,r.right)),c=document.createElement("div");c.id="milo-rp-spark";c.style.left=x+"px";c.style.top="3px";document.body.appendChild(c);' +
  'var C=["#ffc23d","#ffe0a3","#ff9a4c","#fff3d6"];for(var i=0;i<n;i++){var e=document.createElement("b"),a=(15+i*150/(n-1)+(Math.random()-.5)*14)*Math.PI/180,d=(34+Math.random()*40)*m,s=(.7+Math.random()*.7)*m;' +
  'e.textContent="✦";e.style.color=C[i%C.length];e.style.fontSize=(8+Math.random()*6)+"px";c.appendChild(e);' +
  'e.animate([{transform:"translate(0,0) scale(.2) rotate(0deg)",opacity:0},{transform:"translate("+Math.cos(a)*d*.55+"px,"+Math.sin(a)*d*.55+"px) scale("+s+") rotate(45deg)",opacity:1,offset:.35},{transform:"translate("+Math.cos(a)*d+"px,"+(Math.sin(a)*d+8)+"px) scale("+s*.5+") rotate(90deg)",opacity:0}],' +
  '{duration:(900+Math.random()*400)*(m<1?.75:1),delay:Math.random()*120,easing:"cubic-bezier(.2,.7,.3,1)",fill:"forwards"})}setTimeout(function(){c.remove()},1800)}' +
  'function sweep(){var sw=BD.firstChild,w=BD.getBoundingClientRect().width;if(RM||!sw.animate){say("過半了，繼續加油 ✦");return}bar.classList.add("charging");' +
  'var K=[{transform:"translateX(-140px)",opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.88},{transform:"translateX("+(w-60)+"px)",opacity:0}];' +
  'sw.animate(K,{duration:1300,easing:"cubic-bezier(.5,0,.2,1)"});var s2=sw.cloneNode();BD.appendChild(s2);s2.animate(K,{duration:1300,delay:220,easing:"cubic-bezier(.5,0,.2,1)"});setTimeout(function(){s2.remove()},1700);' +
  'var au=document.createElement("div");au.id="milo-rp-aura";document.body.appendChild(au);' +
  'au.animate([{opacity:0},{opacity:.45,offset:.5},{opacity:.45,offset:.72},{opacity:1,offset:.8},{opacity:0}],{duration:2700,easing:"ease-out",fill:"forwards"});setTimeout(function(){au.remove()},2800);' +
  'setTimeout(function(){bar.classList.remove("charging");bar.classList.add("charged");say("過半了，繼續加油 ✦");setTimeout(function(){bar.classList.remove("charged")},1250)},1350)}' +
  'function panel(){var ps=document.querySelectorAll(\'[id^="panel-"]\');for(var i=0;i<ps.length;i++){if(ps[i].offsetParent!==null)return ps[i]}return document.querySelector("main")||document.body}' +
  'function len(p){var top=p.getBoundingClientRect().top+scrollY,end=document.documentElement.scrollHeight-innerHeight-top;return Math.max(1,Math.min(p.offsetHeight-innerHeight*.6,end))}' +
  'function ticks(){TK=[];var old=bar.querySelectorAll(".tick");for(var i=0;i<old.length;i++)old[i].remove();var p=panel(),top=p.getBoundingClientRect().top+scrollY,L=len(p),hs=p.querySelectorAll("h2");' +
  'for(var j=0;j<hs.length;j++){var f=(hs[j].getBoundingClientRect().top+scrollY-top)/L;if(f>.02&&f<.98){var t=document.createElement("i");t.className="tick"+(lit[TK.length]?" lit":"");t.style.left=(f*100)+"%";bar.appendChild(t);TK.push({f:f,el:t})}}}' +
  'function upd(){raf=0;var p=panel(),f=Math.min(1,Math.max(0,-p.getBoundingClientRect().top/len(p)));fill.style.width=(f*100)+"%";cf=f;if(RM)shape();' +
  'if(last>=0&&last<.5&&f>=.5&&f<.995&&!half){half=true;sweep()}' +
  'if(f<.45)half=false;' +
  'if(last>=0)for(var q=0;q<TK.length;q++){var tf=TK[q].f;if(!lit[q]&&last<tf&&f>=tf){lit[q]=1;TK[q].el.classList.add("lit");if(Math.abs(tf-.5)>.04&&f<.98)spark(5,.7)}}' +
  'if(f>=.995&&!done){done=true;bar.classList.add("done");say("讀完了，辛苦了 ✦");confetti()}' +
  'else if(f<.97&&done){done=false;bar.classList.remove("done")}last=f}' +
  'function req(){if(!raf)raf=requestAnimationFrame(upd)}' +
  'addEventListener("scroll",function(){req();bar.classList.add("moving");clearTimeout(mt);mt=setTimeout(function(){bar.classList.remove("moving")},500)},{passive:true});' +
  'addEventListener("resize",function(){ticks();req()});addEventListener("load",function(){ticks();req()});' +
  'var rs=document.querySelectorAll(".tab-r");for(var k=0;k<rs.length;k++)rs[k].addEventListener("change",function(){done=false;half=false;last=-1;lit={};bar.classList.remove("done");setTimeout(function(){ticks();upd()},50)});' +
  'ticks();upd()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init()})();</script>';
