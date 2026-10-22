// Read-only Google Search Console Queries CSV opportunity analysis.
// Usage: node scripts/gsc-opportunities.mjs path/to/Queries.csv
import { readFile, mkdir, writeFile } from "node:fs/promises";
function parseCSV(data) {
  const rows=[]; let row=[],cell="",quoted=false;
  data=data.replace(/^\uFEFF/,"");
  for(let i=0;i<data.length;i++){const c=data[i];if(c==='"'){if(quoted&&data[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
    else if(c===","&&!quoted){row.push(cell);cell=""}
    else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&data[i+1]==="\n")i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=""}
    else cell+=c}
  if(quoted)throw Error("Unclosed CSV quote");
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
const path=process.argv[2];if(!path){console.error("Usage: node scripts/gsc-opportunities.mjs <Queries.csv>");process.exit(1)}
const rows=parseCSV(await readFile(path,"utf8"));
const headers=(rows.shift()||[]).map(h=>h.trim().toLowerCase());
const idx=(...keys)=>headers.findIndex(h=>keys.includes(h));
const columns=[idx("top queries","query","queries","search query"),idx("clicks"),idx("impressions"),idx("ctr"),idx("position","average position")];
if(columns.some(i=>i<0))throw Error("Expected GSC Queries export with columns: query, clicks, impressions, CTR, position. Found: "+headers.join(", "));
const number=v=>Number(String(v||"").replace(/[%\s]/g,"").replace(",","."));
const min=Number(process.env.GSC_MIN_IMPRESSIONS||20);
if(!Number.isFinite(min)||min<1)throw Error("Invalid GSC_MIN_IMPRESSIONS");
const ranked=rows.map(r=>({query:(r[columns[0]]||"").trim(),clicks:number(r[columns[1]]),impressions:number(r[columns[2]]),ctr:number(r[columns[3]]),position:number(r[columns[4]])}))
.filter(r=>r.query&&[r.clicks,r.impressions,r.ctr,r.position].every(Number.isFinite)&&r.impressions>=min&&r.position>=4&&r.position<=30)
.map(r=>({...r,score:Math.round(Math.log2(r.impressions+1)*(r.position<=15?3:1.5)*(1-Math.min(1,r.ctr>1?r.ctr/100:r.ctr)))}))
.sort((a,b)=>b.score-a.score||b.impressions-a.impressions).slice(0,50);
const escape=s=>s.replace(/\|/g,"\\|").replace(/[\r\n]/g," ");
const lines=["# Google Search Console opportunities","","Generated "+new Date().toISOString()+". Based only on supplied query export. Review manually before changes.","","| Query | Impressions | Clicks | CTR (export) | Avg position | Priority score |","| --- | ---: | ---: | ---: | ---: | ---: |",...ranked.map(r=>`| ${escape(r.query)} | ${r.impressions} | ${r.clicks} | ${r.ctr} | ${r.position} | ${r.score} |`),"","## Review checklist","","- Check search intent, existing landing pages and competing results.","- Improve an existing page before creating a duplicative new page.","- Ensure original, accurate and useful content; avoid AI mass publishing.","- Check internal links, canonical, indexability and sitemap.","- Compare GSC performance after deployment.",""];
await mkdir("reports",{recursive:true});await writeFile("reports/gsc-opportunities.md",lines.join("\n"));
console.log(`Created reports/gsc-opportunities.md with ${ranked.length} review candidates; no pages were changed.`);
