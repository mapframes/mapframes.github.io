(function(){
const D=JSON.parse(document.getElementById('data').textContent);
const C=D.callouts, GN=D.groups;
const $=id=>document.getElementById(id);
const board=$('board'), map=$('map'), tip=$('tip'), list=$('list'), q=$('q'), count=$('count');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let filt='all', sel=-1, mode='explore';

/* markers */
C.forEach((c,i)=>{
  const b=document.createElement('button');
  b.className='mk'+(c.p?'':' x'); b.style.left=c.x+'%'; b.style.top=c.y+'%'; b.style.setProperty('--i',i);
  b.textContent=c.p||''; b.dataset.i=i; c.dot=b; labelDot(i);
  b.addEventListener('mouseenter',()=>{if(mode==='explore')showTip(i)});
  b.addEventListener('mouseleave',()=>{if(sel!==i)tip.style.display='none'});
  b.addEventListener('click',()=>mode==='quiz'?answer(i):pick(i,true));
  map.appendChild(b);
});
/* overlapping markers: push them apart, short leader line + dot on the real spot */
const NS='http://www.w3.org/2000/svg', lead=document.createElementNS(NS,'svg');
lead.setAttribute('class','leads'); lead.setAttribute('aria-hidden','true'); map.appendChild(lead);
function spread(){
  const W=map.clientWidth, H=map.clientHeight; if(!W)return;
  lead.setAttribute('viewBox',`0 0 ${W} ${H}`); lead.innerHTML='';
  const P=C.map(c=>({x:c.x/100*W,y:c.y/100*H,r:c.dot.offsetWidth/2}));
  const gap=Math.max(3,P[0].r*.3), L=Math.max(9,P[0].r*1.1);
  const grp=C.map((c,i)=>i);                       /* union-find: markers that clearly cover each other */
  const f=i=>grp[i]===i?i:(grp[i]=f(grp[i]));
  for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++)
    if(Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y)<(P[i].r+P[j].r)*.8)grp[f(i)]=f(j);
  const G={};C.forEach((c,i)=>(G[f(i)]=G[f(i)]||[]).push(i));
  const D=P.map(q=>({x:q.x,y:q.y})), mv=new Set();
  const clamp=i=>{D[i].x=Math.min(W-P[i].r,Math.max(P[i].r,D[i].x));D[i].y=Math.min(H-P[i].r,Math.max(P[i].r,D[i].y))};
  Object.values(G).forEach(g=>{if(g.length<2)return;
    const cx=g.reduce((a,i)=>a+P[i].x,0)/g.length, cy=g.reduce((a,i)=>a+P[i].y,0)/g.length;
    g.forEach((i,k)=>{let ux=P[i].x-cx, uy=P[i].y-cy, n=Math.hypot(ux,uy);
      if(n<.5){const a=-Math.PI*3/4+2*Math.PI*k/g.length;ux=Math.cos(a);uy=Math.sin(a);n=1}
      ux/=n;uy/=n; const d=P[i].r+L+Math.max(0,P[i].r+gap/2-n), a0=Math.atan2(uy,ux);
      let best=null;                                  /* try the outward direction first, then turn until it is free */
      for(const t of [0,25,-25,50,-50,75,-75,100,-100,130,-130,160,-160]){const a=a0+t*Math.PI/180;
        D[i].x=P[i].x+Math.cos(a)*d; D[i].y=P[i].y+Math.sin(a)*d; clamp(i);
        let cost=Math.abs(t)/400;
        for(let j=0;j<P.length;j++){if(j===i||g.includes(j)&&!mv.has(j))continue;
          const q=mv.has(j)||!g.includes(j)?D[j]:P[j], o=P[i].r+P[j].r+gap-Math.hypot(D[i].x-q.x,D[i].y-q.y); if(o>0)cost+=1+o/P[i].r}
        /* leader must not run under another marker */
        for(let j=0;j<P.length;j++){if(j===i||g.includes(j))continue;const q=D[j],lx=D[i].x-P[i].x,ly=D[i].y-P[i].y,l2=lx*lx+ly*ly||1,
          u=Math.max(0,Math.min(1,((q.x-P[i].x)*lx+(q.y-P[i].y)*ly)/l2)); if(Math.hypot(P[i].x+u*lx-q.x,P[i].y+u*ly-q.y)<P[j].r)cost+=.8}
        if(!best||cost<best.c)best={c:cost,x:D[i].x,y:D[i].y}; if(cost<.01)break}
      D[i].x=best.x; D[i].y=best.y; mv.add(i)})});
  for(let it=0;it<40&&mv.size;it++){let hit=false;   /* moved markers must not land on others */
    mv.forEach(i=>{for(let j=0;j<P.length;j++){if(j===i)continue;
      let vx=D[i].x-D[j].x, vy=D[i].y-D[j].y, n=Math.hypot(vx,vy), need=P[i].r+P[j].r+gap;
      if(n>=need)continue; hit=true; if(n<.01){vx=1;vy=0;n=1}
      const push=(need-n)*(mv.has(j)?.5:1); D[i].x+=vx/n*push; D[i].y+=vy/n*push; clamp(i)}});
    if(!hit)break}
  C.forEach((c,i)=>{c.dx=D[i].x/W*100;c.dy=D[i].y/H*100;c.ld=null;if(!mv.has(i))return;
    const e=document.createElementNS(NS,'g'); e.setAttribute('class','ld'+(c.dot.classList.contains('dim')?' dim':''));
    e.innerHTML=`<line x1="${P[i].x.toFixed(1)}" y1="${P[i].y.toFixed(1)}" x2="${D[i].x.toFixed(1)}" y2="${D[i].y.toFixed(1)}"/><circle cx="${P[i].x.toFixed(1)}" cy="${P[i].y.toFixed(1)}" r="${Math.max(2.2,P[i].r*.22).toFixed(1)}"/>`;
    lead.appendChild(e); c.ld=e});
  C.forEach(c=>{c.dot.style.left=c.dx+'%';c.dot.style.top=c.dy+'%'});
}
spread(); addEventListener('resize',spread); if(document.fonts)document.fonts.ready.then(spread);
function labelDot(i){const c=C[i];c.dot.setAttribute('aria-label',mode==='quiz'?('Marker '+(i+1)):((c.p?c.p+': ':'')+c.n))}
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){map.classList.add('placing');setTimeout(()=>map.classList.remove('placing'),C.length*18+600)}
function showTip(i){const c=C[i];tip.textContent=c.n+(c.a?' ('+c.a+')':'');tip.style.left=c.dx+'%';tip.style.top=c.dy+'%';tip.style.display='block'}

/* explore */
function match(c){const s=q.value.trim().toLowerCase();
  const f=filt==='all'||(filt==='poster'?c.p:c.g===filt);
  return f&&(!s||(c.n+' '+c.a+' '+c.d).toLowerCase().includes(s))}
const ORDER=Object.keys(GN);const SEQ=C.map((c,i)=>i).sort((a,b)=>(ORDER.indexOf(C[a].g)-ORDER.indexOf(C[b].g))||a-b);
function render(){
  list.innerHTML='';let g='',n=0;
  SEQ.forEach(i=>{const c=C[i];const ok=match(c);c.dot.classList.toggle('dim',!ok);if(c.ld)c.ld.classList.toggle('dim',!ok);if(!ok)return;n++;
    if(c.g!==g){g=c.g;const h=document.createElement('h3');h.className='grp';h.textContent=GN[g]||g;list.appendChild(h)}
    const r=document.createElement('div');r.className='row'+(i===sel?' sel':'');r.id='c-'+slug(c.n);r.tabIndex=0;r.setAttribute('role','button');r.setAttribute('aria-expanded',i===sel);
    r.innerHTML=`<span class="num${c.p?'':' x'}" aria-hidden="true">${c.p||''}</span><div><p class="nm">${esc(c.n)}${c.a?`<span class="al">${esc(c.a)}</span>`:''}</p><p class="ds">${esc(c.d)}</p>${c.o?'':'<p class="who">Player name, not shown in the game</p>'}${c.note?`<p class="nt">${esc(c.note)}</p>`:''}</div>`;
    r.addEventListener('click',()=>pick(i,false));
    r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(i,false)}});
    list.appendChild(r); if(i===sel)addPhoto(r,c)});
  count.textContent=n===C.length?`${n} callouts`:`${n} of ${C.length} callouts`;
  if(!n)list.innerHTML='<p class="empty">No callout matches. Try another name or clear the search.</p>';
}
function addPhoto(r,c){if(!c.img||r.querySelector('.ph'))return;
  const f=document.createElement('figure');f.className='ph';
  const pin=c.px&&c.px[0]>.03&&c.px[0]<.97&&c.px[1]>.03&&c.px[1]<.97?`<span class="pin" style="left:${c.px[0]*100}%;top:${c.px[1]*100}%"></span>`:'';
  f.innerHTML=`<div class="phi"><img src="../assets/callouts/${D.slug}/${c.img}.webp" width="960" height="540" alt="View of ${esc(c.n)} on ${esc(D.name)}" loading="lazy">${pin}</div><figcaption>View from the 3D model of the map. The dot marks ${esc(c.n)}.</figcaption>`;
  f.addEventListener('click',e=>e.stopPropagation());r.lastElementChild.appendChild(f)}
function pick(i,fromMap){
  const same=sel===i&&!fromMap;
  sel=same?-1:i;
  C.forEach((c,j)=>c.dot.classList.toggle('sel',j===sel));
  if(sel<0){tip.style.display='none';history.replaceState(null,'',location.pathname);render();return}
  showTip(i);
  if(fromMap&&!match(C[i])){filt='all';q.value='';syncFilters()}
  render();
  history.replaceState(null,'','#'+slug(C[i].n));
  const r=$('c-'+slug(C[i].n));
  if(r)requestAnimationFrame(()=>reveal(r,fromMap));
}
/* scroll the callout list, not the page; the page only moves when the list is off screen */
const sheet=document.querySelector('.sheet'), mobile=matchMedia('(max-width:900px)');
function reveal(r,fromMap){
  const smooth=matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
  const head=(list.querySelector('.grp')||{}).offsetHeight||0;
  const top=r.offsetTop-head-4, bot=r.offsetTop+r.offsetHeight-list.clientHeight+28;
  if(fromMap)list.scrollTo({top,behavior:smooth});
  else if(top<list.scrollTop)list.scrollTo({top,behavior:smooth});
  else if(bot>list.scrollTop)list.scrollTo({top:Math.min(top,bot),behavior:smooth});
  if(!fromMap)return;
  const lim=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar'))||52)+(mobile.matches?sheet.offsetHeight:12);
  const lr=list.getBoundingClientRect();
  if(lr.top>innerHeight-140||lr.bottom<lim+120)scrollBy({top:lr.top-lim-(mobile.matches?4:120),behavior:smooth});
}
new ResizeObserver(()=>document.documentElement.style.setProperty('--sh',sheet.offsetHeight+'px')).observe(sheet);
function syncFilters(){document.querySelectorAll('#filters button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f===filt))}
$('filters').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;filt=b.dataset.f;syncFilters();render()});
q.addEventListener('input',render);

/* modes */
const tabs=document.querySelectorAll('.modes button');
tabs.forEach(t=>t.addEventListener('click',()=>setMode(t.dataset.mode)));
function setMode(m){mode=m;
  tabs.forEach(t=>t.setAttribute('aria-selected',t.dataset.mode===m));
  $('explore').hidden=m!=='explore'; $('quiz').hidden=m!=='quiz';
  board.classList.toggle('quiz',m==='quiz'); tip.style.display='none';
  C.forEach((c,i)=>{c.dot.classList.remove('sel','hit','miss','dim');labelDot(i)});
  if(m==='quiz'){sel=-1;startQuiz()}else{render()}
}

/* test yourself */
const Q={order:[],k:0,score:0,done:false};
const poolInputs=document.querySelectorAll('input[name="pool"]');
poolInputs.forEach(r=>r.addEventListener('change',startQuiz));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function startQuiz(){
  const all=[...document.querySelectorAll('input[name="pool"]')].find(r=>r.checked)?.value==='all';
  const pool=C.map((c,i)=>i).filter(i=>all||C[i].p);
  Q.order=shuffle(pool).slice(0,10);Q.k=0;Q.score=0;Q.done=false;ask()}
function clearMarks(){C.forEach(c=>c.dot.classList.remove('hit','miss'))}
function ask(){clearMarks();const t=C[Q.order[Q.k]];
  $('q-progress').textContent=`Question ${Q.k+1} of ${Q.order.length}. ${Q.score} right so far.`;
  $('q-name').textContent=t.n; $('q-hint').textContent=t.a?`Players also say ${t.a}.`:'';
  $('q-feedback').textContent='Tap the marker on the map.'; $('q-feedback').className='q-feedback';
  $('q-next').hidden=true; $('q-again').hidden=true; $('q-ask').hidden=false; Q.answered=false}
function answer(i){if(Q.done||Q.answered)return;Q.answered=true;
  const ti=Q.order[Q.k],t=C[ti],fb=$('q-feedback');
  if(i===ti){Q.score++;t.dot.classList.add('hit');fb.textContent=`Right, that is ${t.n}.`;fb.className='q-feedback q-ok'}
  else{C[i].dot.classList.add('miss');t.dot.classList.add('hit');fb.textContent=`That is ${C[i].n}. ${t.n} is the green marker.`;fb.className='q-feedback q-miss'}
  $('q-progress').textContent=`Question ${Q.k+1} of ${Q.order.length}. ${Q.score} right so far.`;
  const last=Q.k===Q.order.length-1, nx=$('q-next');
  nx.textContent=last?'See your score':'Next callout'; nx.hidden=false; nx.focus({preventScroll:true});
}
$('q-next').addEventListener('click',()=>{if(Q.k<Q.order.length-1){Q.k++;ask()}else finish()});
function finish(){Q.done=true;clearMarks();
  const n=Q.order.length,s=Q.score;
  $('q-progress').textContent='Done.'; $('q-ask').hidden=true;
  $('q-name').textContent=`${s} of ${n}`;
  $('q-hint').textContent=s===n?'You know every one of them.':s>=n*.7?'Almost there. Play again to get the rest.':'Explore the map for a bit, then try again.';
  $('q-feedback').textContent='';$('q-next').hidden=true;const a=$('q-again');a.hidden=false;a.focus({preventScroll:true})}
$('q-again').addEventListener('click',startQuiz);
$('q-explore').addEventListener('click',()=>setMode('explore'));

/* scale bar: 10 m in the game, drawn at the size of the relief on screen */
const bar=$('bar');
function sizeBar(){if(bar)bar.style.width=(map.clientWidth*parseFloat(bar.dataset.mm)/parseFloat(bar.dataset.wmm)).toFixed(1)+'px'}
sizeBar();addEventListener('resize',sizeBar);
render();
const h=decodeURIComponent(location.hash.slice(1));
if(h){const i=C.findIndex(c=>slug(c.n)===h);if(i>=0)pick(i,true)}

/* top bar: scroll the current map into view (narrow screens) */
(function(){const nav=document.querySelector('.maplinks'),cur=nav&&nav.querySelector('a[aria-current]');
  if(!nav||!cur||nav.scrollWidth<=nav.clientWidth)return;
  nav.scrollLeft=Math.max(0,cur.offsetLeft-nav.offsetLeft-(nav.clientWidth-cur.offsetWidth)/2);
  const f=()=>nav.classList.toggle('sl',nav.scrollLeft>2); f(); nav.addEventListener('scroll',f,{passive:true});})();
})();
