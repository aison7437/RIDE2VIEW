'use strict';
const {spawnSync}=require('node:child_process');
const {mkdirSync,writeFileSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'..'),out=resolve(root,'acceptance-evidence');mkdirSync(out,{recursive:true});
const suites=['check','test','test:agent','test:browser'];
const results=[];
for(const suite of suites){
 const run=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run',suite],{cwd:root,encoding:'utf8',maxBuffer:50*1024*1024});
 writeFileSync(resolve(out,suite.replaceAll(':','-')+'.log'),(run.stdout||'')+(run.stderr||'')+(run.error?.message||''));
 results.push({suite,status:run.status===0?'passed':'failed'});
 console.log(suite+': '+results.at(-1).status);
}
const sha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout?.trim();
const dirty=spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout?.trim();
const passed=results.every(x=>x.status==='passed');
writeFileSync(resolve(out,'report.json'),JSON.stringify({time:new Date().toISOString(),sha,workingTreeModified:!!dirty,results,localGate:passed?'PASS':'FAIL',deployedStagingGate:'NOT_VERIFIED',provider:'synthetic test adapter; external sandbox not verified'},null,2));
if(!passed)process.exitCode=1;
