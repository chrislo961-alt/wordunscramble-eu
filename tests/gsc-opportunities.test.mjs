import { test } from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
test("SEO candidates are based on impressions and realistic positions", async()=>{
 const dir=await mkdtemp(join(tmpdir(),"gsc-test-"));
 try{
  const fixture=join(dir,"Queries.csv");
  await writeFile(fixture,'Top queries,Clicks,Impressions,CTR,Position\n"how many days until christmas",5,1000,0.5%,8\n"low volume",0,2,0%,9\n"already top",50,2000,2.5%,1\n');
  const result=spawnSync(process.execPath,["scripts/gsc-opportunities.mjs",fixture],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
  const report=await readFile("reports/gsc-opportunities.md","utf8");
  assert.match(report,/how many days until christmas/);
  assert.doesNotMatch(report,/low volume/);
  assert.doesNotMatch(report,/already top/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
