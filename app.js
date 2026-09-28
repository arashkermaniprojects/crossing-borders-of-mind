(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

/* ---------- theme ---------- */
const root=document.documentElement;
const savedTheme=store.get('cb-theme'); if(savedTheme) root.setAttribute('data-theme',savedTheme);
$('#themeBtn').addEventListener('click',()=>{
  const dark=root.getAttribute('data-theme')==='dark'||(!root.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches);
  const next=dark?'light':'dark'; root.setAttribute('data-theme',next); store.set('cb-theme',next);
});

/* ---------- chapters ---------- */
const chapters=$$('.chapter'), tabs=$$('.tab');
function show(id,{scroll=true,focus=null}={}){
  const i=Math.max(0,chapters.findIndex(c=>c.id===id));
  chapters.forEach((c,j)=>c.hidden=j!==i);
  tabs.forEach((t,j)=>t.setAttribute('aria-selected',j===i?'true':'false'));
  const pg=$('#pager'); pg.innerHTML='';
  const mk=(k,lab)=>{const c=chapters[k];if(!c)return document.createElement('span');const b=document.createElement('button');b.type='button';
    b.innerHTML=`<small>${lab}</small>${c.querySelector('h2').textContent}`;b.onclick=()=>show(c.id);return b;};
  pg.append(mk(i-1,'← Previous'),mk(i+1,'Next →'));
  try{history.replaceState(null,'','#'+chapters[i].id)}catch(e){}
  store.set('cb-chapter',chapters[i].id);
  observeAnims(chapters[i]);
  if(focus){const el=document.getElementById(focus);if(el){el.scrollIntoView({block:'start'});return;}}
  if(scroll) window.scrollTo({top:0});
}
tabs.forEach(t=>t.addEventListener('click',()=>{stopTour();show(t.dataset.id)}));
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute('href').slice(1);
  const ch=chapters.find(c=>c.id===id||c.querySelector('#'+CSS.escape(id)));if(ch){e.preventDefault();show(ch.id,{focus:ch.id===id?null:id});}});

/* ---------- animations ---------- */
const io=('IntersectionObserver' in window)?new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('on');io.unobserve(en.target);}}),{threshold:.3}):null;
function observeAnims(scope){$$('.anim',scope).forEach(a=>{if(!a.classList.contains('on')){io?io.observe(a):a.classList.add('on')}})}
function replay(a){a.classList.remove('on');void a.getBoundingClientRect();requestAnimationFrame(()=>requestAnimationFrame(()=>a.classList.add('on')));}
document.addEventListener('click',e=>{
  const r=e.target.closest('.replay'); if(r){replay(r.closest('.anim'));return;}
  const s=e.target.closest('.seg-b'); if(s){const f=s.closest('.anim');f.dataset.mode=s.dataset.mode;$$('.seg-b',f).forEach(b=>b.classList.toggle('on',b===s));}
});

/* ---------- lightbox ---------- */
const lb=$('#lightbox'), lbImg=$('#lbImg'), lbCap=$('#lbCap');
document.addEventListener('click',e=>{const z=e.target.closest('.zoom');if(!z)return;const img=z.querySelector('img'),cap=z.parentElement.querySelector('figcaption');
  lbImg.src=img.src;lbImg.alt=img.alt;lbCap.innerHTML=cap?cap.innerHTML:'';lb.hidden=false;$('#lbClose').focus();});
function closeLB(){lb.hidden=true;lbImg.removeAttribute('src');}
$('#lbClose').addEventListener('click',closeLB);
lb.addEventListener('click',e=>{if(e.target===lb)closeLB();});

/* ---------- narration tours ---------- */
const TOURS=JSON.parse($('#tours').textContent);
const bar=$('#tourbar'),tbTitle=$('#tbTitle'),tbCount=$('#tbCount'),tbCap=$('#tbCap'),tbDots=$('#tbDots'),tbPlay=$('#tbPlay'),tbRate=$('#tbRate');
let T=null,si=0,playing=false,audio=new Audio(),rate=1,token=0,focusEl=null;
const synth=window.speechSynthesis||null;
function pickVoice(){if(!synth)return null;const vs=synth.getVoices();return vs.find(v=>/Google US English/.test(v.name))||vs.find(v=>v.lang==='en-US')||vs[0]||null;}
function setFocus(el){if(focusEl)focusEl.classList.remove('tour-focus');focusEl=el;if(el){el.classList.add('tour-focus');
  el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  $$('.anim',el).forEach(a=>{if(!a.classList.contains('on'))a.classList.add('on');else replay(a);});}}
function renderDots(){tbDots.innerHTML='';T.forEach((s,j)=>{const b=document.createElement('button');b.type='button';b.title=s.title;b.setAttribute('aria-label',`Stop ${j+1}: ${s.title}`);
  b.className=j<si?'done':j===si?'cur':'';b.onclick=()=>go(j);tbDots.appendChild(b);});}
function stopSound(){token++;audio.pause();if(synth)synth.cancel();}
function speak(){
  const st=T[si],my=token;
  audio.src=st.audio; audio.playbackRate=rate;
  audio.onended=()=>{if(my===token)advance();};
  audio.play().catch(()=>{ // fallback: browser voice
    if(!synth){tbCap.textContent=st.text+' (audio unavailable)';return;}
    const u=new SpeechSynthesisUtterance(st.text);const v=pickVoice();if(v)u.voice=v;u.rate=rate;u.onend=()=>{if(my===token)advance();};synth.speak(u);
  });
}
function go(j){
  if(!T)return; si=Math.max(0,Math.min(T.length-1,j)); stopSound();
  const st=T[si]; tbTitle.textContent=st.title; tbCount.textContent=`${si+1} / ${T.length}`; tbCap.textContent=st.text; renderDots();
  setFocus(document.getElementById(st.target));
  if(playing) speak();
}
function advance(){if(si<T.length-1)go(si+1);else{playing=false;tbPlay.textContent='▶';tbPlay.setAttribute('aria-label','Play');setFocus(null);}}
function startTour(id){T=TOURS[id];if(!T)return;bar.hidden=false;playing=true;tbPlay.textContent='⏸';tbPlay.setAttribute('aria-label','Pause');go(0);}
function stopTour(){if(!T)return;stopSound();playing=false;T=null;bar.hidden=true;setFocus(null);}
tbPlay.addEventListener('click',()=>{if(!T)return;playing=!playing;tbPlay.textContent=playing?'⏸':'▶';tbPlay.setAttribute('aria-label',playing?'Pause':'Play');
  if(playing){if(audio.src&&audio.currentTime>0&&!audio.ended){audio.play()}else speak();}else{audio.pause();if(synth)synth.cancel();}});
$('#tbPrev').addEventListener('click',()=>go(si-1));
$('#tbNext').addEventListener('click',()=>go(si+1));
$('#tbStop').addEventListener('click',stopTour);
tbRate.addEventListener('change',()=>{rate=parseFloat(tbRate.value);audio.playbackRate=rate;});
document.addEventListener('click',e=>{const b=e.target.closest('.playbtn');if(b)startTour(b.dataset.tour);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!lb.hidden)closeLB();else stopTour();}});

/* ---------- start ---------- */
const h=(location.hash||'').slice(1);
const ok=id=>chapters.some(c=>c.id===id)||document.getElementById(id);
const startId=h&&ok(h)?h:(store.get('cb-chapter')||chapters[0].id);
const ch=chapters.find(c=>c.id===startId||c.querySelector('#'+CSS.escape(startId)))||chapters[0];
show(ch.id,{scroll:false,focus:ch.id===startId?null:startId});
})();
