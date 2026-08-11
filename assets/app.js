const $=id=>document.getElementById(id);
const CACHE={};
const POINTS={a:1,b:3,c:3,d:2,e:1,f:4,g:2,h:4,i:1,j:8,k:5,l:1,m:3,n:1,o:1,p:3,q:10,r:1,s:1,t:1,u:1,v:4,w:4,x:8,y:4,z:10};
const score=w=>[...w].reduce((n,c)=>n+(POINTS[c]||0),0);
function counts(s){const m={};for(const c of s)m[c]=(m[c]||0)+1;return m}
function canBuild(word,letters){const wild=(letters.match(/\?/g)||[]).length,pool=counts(letters.replace(/\?/g,''));let missing=0;for(const [c,n] of Object.entries(counts(word)))missing+=Math.max(0,n-(pool[c]||0));return missing<=wild}
async function loadLength(n){if(CACHE[n])return CACHE[n];const r=await fetch(`/data/w${n}.txt`);if(!r.ok)throw new Error('Word data could not load.');const t=await r.text();return CACHE[n]=t.trim().split(/\s+/).filter(Boolean)}
async function run(){
 const letters=$('letters').value.toLowerCase().replace(/[^a-z?]/g,'').slice(0,15);if(letters.length<2){$('results').innerHTML='<p class="muted">Enter at least 2 letters.</p>';return}
 $('go').disabled=true;$('go').textContent='SEARCHING…';
 try{
  const exact=+$('length').value||0,max=Math.min(letters.length,15),lengths=exact?[exact]:Array.from({length:max-1},(_,i)=>i+2);
  const sets=await Promise.all(lengths.filter(n=>n<=max).map(loadLength));let out=sets.flat().filter(w=>canBuild(w,letters));
  const starts=$('starts').value.toLowerCase().replace(/[^a-z]/g,''),ends=$('ends').value.toLowerCase().replace(/[^a-z]/g,''),contains=$('contains').value.toLowerCase().replace(/[^a-z]/g,'');
  if(starts)out=out.filter(w=>w.startsWith(starts));if(ends)out=out.filter(w=>w.endsWith(ends));if(contains)out=out.filter(w=>w.includes(contains));
  const sort=$('sort').value;out.sort(sort==='az'?(a,b)=>a.localeCompare(b):sort==='score'?(a,b)=>score(b)-score(a)||b.length-a.length:(a,b)=>b.length-a.length||a.localeCompare(b));
  $('count').textContent=`${out.length.toLocaleString()} word${out.length===1?'':'s'} found`;
  const groups={};for(const w of out)(groups[w.length]??=[]).push(w);
  $('results').innerHTML=Object.keys(groups).sort((a,b)=>b-a).map(n=>`<section class="group"><h2>${n}-letter words (${groups[n].length.toLocaleString()})</h2><div class="wordgrid">${groups[n].map(w=>`<button class="word" data-word="${w}" title="Copy ${w}"><span>${w}</span><small>${score(w)} pts</small></button>`).join('')}</div></section>`).join('')||'<p class="muted">No matching words found. Try fewer filters.</p>';
  document.querySelectorAll('.word').forEach(el=>el.onclick=async()=>{const w=el.dataset.word;try{await navigator.clipboard.writeText(w);el.classList.add('copied');setTimeout(()=>el.classList.remove('copied'),650)}catch{}});
  const u=new URL(location.href);u.searchParams.set('letters',letters);history.replaceState(null,'',u);
 }catch(e){$('results').innerHTML=`<p class="muted">${e.message}</p>`}finally{$('go').disabled=false;$('go').textContent='UNSCRAMBLE'}
}
$('go')?.addEventListener('click',run);$('letters')?.addEventListener('keydown',e=>{if(e.key==='Enter')run()});['starts','ends','contains','length','sort'].forEach(id=>$(id)?.addEventListener('change',()=>$('letters').value&&run()));
const q=new URLSearchParams(location.search).get('letters');if(q&&$('letters')){$('letters').value=q;run()}
