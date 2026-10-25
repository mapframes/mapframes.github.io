/* Exploded view of the frame: slider + button set how far apart the parts are, drag turns it, a part can be picked */
(function(){
const view=document.getElementById('xv'); if(!view)return;
const stage=document.getElementById('xv-stage'), range=document.getElementById('xv-e'), go=document.getElementById('xv-go');
const tags=[...view.querySelectorAll('.xt')], legend=[...document.querySelectorAll('#xv-legend button')];
const layers=Object.fromEntries([...stage.querySelectorAll('.xl')].map(l=>[l.dataset.part,l]));
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let e=0, ry=52, rx=-12, raf=0, focus='', lock='';
let W=1,H=1;
function size(){W=view.clientWidth;H=view.clientHeight;zoom();place()}
/* zoom out while the parts move apart, so everything stays in the picture */
function zoom(){view.style.setProperty('--u',Math.min(W/(300+270*e),H/(395+75*e)).toFixed(4)+'px')}
function set(v){e=Math.max(0,Math.min(1,v));view.style.setProperty('--e',e.toFixed(4));zoom();range.value=Math.round(e*100);
  go.textContent=e>.5?'Put it together':'Take it apart';place()}
function turn(){stage.style.setProperty('--ry',ry+'deg');stage.style.setProperty('--rx',rx+'deg');place()}
function place(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const v=view.getBoundingClientRect();
  const op=Math.max(0,Math.min(1,(e-.3)/.35));
  tags.forEach(t=>{const a=layers[t.dataset.part].querySelector('.an');if(!a)return;const r=a.getBoundingClientRect();
    t.style.transform=`translate(${(r.left-v.left).toFixed(1)}px,${(r.top-v.top).toFixed(1)}px)`;t.style.opacity=op;t.style.pointerEvents=op>.5?'auto':'none'})})}
function anim(to,ms=1100){if(RM){set(to);return}const from=e,t0=performance.now();
  const step=t=>{const k=Math.min(1,(t-t0)/ms),q=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;set(from+(to-from)*q);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
function pick(p){focus=p;view.dataset.focus=p||'';if(!p)delete view.dataset.focus;
  Object.entries(layers).forEach(([k,l])=>l.classList.toggle('on',k===p));
  tags.forEach(t=>t.classList.toggle('on',t.dataset.part===p));
  legend.forEach(b=>{b.setAttribute('aria-pressed',b.dataset.part===lock);b.classList.toggle('on',b.dataset.part===p)})}
legend.forEach(b=>{
  b.addEventListener('mouseenter',()=>pick(b.dataset.part));
  b.addEventListener('mouseleave',()=>pick(lock));
  b.addEventListener('focus',()=>pick(b.dataset.part));
  b.addEventListener('blur',()=>pick(lock));
  b.addEventListener('click',()=>{lock=lock===b.dataset.part?'':b.dataset.part;if(lock&&e<.5)anim(1);pick(lock)})});
tags.forEach(t=>{t.addEventListener('mouseenter',()=>pick(t.dataset.part));t.addEventListener('mouseleave',()=>pick(lock));
  t.addEventListener('click',ev=>{ev.stopPropagation();lock=lock===t.dataset.part?'':t.dataset.part;pick(lock)})});
range.addEventListener('input',()=>set(range.value/100));
go.addEventListener('click',()=>anim(e>.5?0:1));
/* drag to turn; vertical swipes still scroll the page (touch-action: pan-y) */
let drag=null;
view.addEventListener('pointerdown',ev=>{if(ev.target.closest('.xt'))return;drag={x:ev.clientX,y:ev.clientY,ry,rx,moved:false};view.setPointerCapture(ev.pointerId)});
view.addEventListener('pointermove',ev=>{if(!drag)return;const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
  ry=Math.max(-70,Math.min(70,drag.ry+dx*.35));rx=Math.max(-40,Math.min(25,drag.rx-dy*.25));turn()});
const end=()=>{if(drag&&!drag.moved){lock='';pick('')}drag=null};
view.addEventListener('pointerup',end);view.addEventListener('pointercancel',()=>{drag=null});

/* map picker: swaps poster, relief and numbers; the rest of the frame is the same for every map */
const DATA=document.getElementById('xv-data'), picks=[...document.querySelectorAll('.xv-pick button')];
if(DATA&&picks.length){
  const MAPS=Object.fromEntries(JSON.parse(DATA.textContent).map(m=>[m.slug,m]));
  const poster=stage.querySelector('.po img'), rl=[...stage.querySelectorAll('.rl')], an=layers.relief.querySelector('.an');
  const reliefTxt=document.querySelector('#xv-legend [data-part="relief"] span span');
  const pre=poster.getAttribute('src').replace(/[^/]+$/,'');
  function setMap(slug,push){const m=MAPS[slug];if(!m)return;
    poster.src=pre+m.slug+'-poster.webp';
    rl.forEach((im,i)=>{im.src=pre+m.slug+(i===rl.length-1?'-relief':'-thumb')+'.webp';
      im.style.cssText=`--x:${m.x};--y:${m.y};--w:${m.w};--h:${m.h};--zz:${(m.rz*i/(rl.length-1)).toFixed(2)}`});
    an.style.cssText=`--x:${(m.x+m.w*.5).toFixed(2)};--y:${(m.y+m.h*.04).toFixed(2)}`;
    reliefTxt.textContent=m.txt;
    view.setAttribute('aria-label','Exploded view of the framed '+m.name+' relief');
    picks.forEach(b=>b.setAttribute('aria-pressed',b.dataset.map===slug));
    if(push)history.replaceState(null,'','#'+slug);
    document.title='What is in the frame ('+m.name+') – Mapframes';place()}
  picks.forEach(b=>b.addEventListener('click',()=>setMap(b.dataset.map,true)));
  const h=location.hash.slice(1);if(MAPS[h]&&h!==picks.find(b=>b.getAttribute('aria-pressed')==='true').dataset.map)setMap(h,false);
}
new ResizeObserver(size).observe(view);
turn();set(0);
/* take it apart once, the first time the frame comes into view */
if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)){io.disconnect();setTimeout(()=>{if(e===0)anim(1,1500)},250)}},{threshold:.55});io.observe(view)}
})();
