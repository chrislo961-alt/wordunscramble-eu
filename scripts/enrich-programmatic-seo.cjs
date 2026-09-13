#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const origin = 'https://wordunscramble.eu';
const today = new Date().toISOString().slice(0, 10);
const displayDate = new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${today}T00:00:00Z`));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);
const stripTags = (value) => String(value || '').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const routeFile = (route) => { const clean = route.replace(/^\/+|\/+$/g,''); return clean ? `${clean}/index.html` : 'index.html'; };
function extractMeta(html,name){const m=html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`,'i'));return stripTags(m&&m[1]);}
function extractFaqs(html){const section=(html.match(/<h2>Frequently asked questions<\/h2>([\s\S]*?)(?=<\/section>|<h2>)/i)||[])[1]||'';const out=[];const re=/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/gi;let m;while((m=re.exec(section)))out.push({question:stripTags(m[1]),answer:stripTags(m[2])});return out.filter(x=>x.question&&x.answer);}
function enrich(html,route){
  const h1=stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]);
  const title=stripTags((html.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]).replace(/\s*\|\s*WordUnscramble\.eu\s*$/i,'')||h1;
  const description=extractMeta(html,'description');
  const faqs=extractFaqs(html);
  const graph=[{'@type':'CollectionPage','@id':`${origin}${route}#page`,url:`${origin}${route}`,name:title,description,dateModified:today,publisher:{'@type':'Organization',name:'WordUnscramble.eu',url:origin}}];
  if(faqs.length)graph.push({'@type':'FAQPage','@id':`${origin}${route}#faq`,mainEntity:faqs.map(x=>({'@type':'Question',name:x.question,acceptedAnswer:{'@type':'Answer',text:x.answer}}))});
  const schema=`<script id="programmatic-aeo-schema" type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/<\//g,'<\\/')}</script>`;
  html=/<script id="programmatic-aeo-schema"/i.test(html)?html.replace(/<script id="programmatic-aeo-schema"[\s\S]*?<\/script>/i,schema):html.replace('</head>',`${schema}</head>`);
  const freshness=`<p class="muted programmatic-freshness"><strong>Last updated:</strong> ${displayDate} · <a href="/how-it-works/">Word-list methodology</a></p>`;
  if(!/programmatic-freshness/i.test(html))html=html.replace(/(<p class="content-intro">[\s\S]*?<\/p>)/i,`$1${freshness}`);
  const note=`<div class="notice programmatic-methodology"><strong>About this list:</strong> Results come from the site's documented open English word data. “Common” is a convenience subset, not an official game dictionary. For tournament or game legality, verify the word against that game's current official source. <a href="/how-it-works/">See methodology and limitations.</a></div>`;
  if(!/programmatic-methodology/i.test(html))html=html.replace(/(<h2>Use the right solver<\/h2>)/i,`${note}$1`);
  return html;
}
const manifest=JSON.parse(read('data/programmatic-seo-routes.json'));let updated=0,missing=0;
for(const item of manifest){const file=routeFile(item.route),full=path.join(root,file);if(!fs.existsSync(full)){missing++;continue;}const before=read(file),after=enrich(before,item.route);if(after!==before){write(file,after);updated++;}}
console.log(`Programmatic GEO/AEO enrichment complete: ${updated} pages updated, ${missing} routes missing files.`);
