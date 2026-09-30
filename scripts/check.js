const { readdirSync }=require('node:fs');
const { join }=require('node:path');
const { spawnSync }=require('node:child_process');
let count=0;
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','data'].includes(e.name))continue;const path=join(dir,e.name);if(e.isDirectory())walk(path);else if(path.endsWith('.js')){count++;const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(r.status){process.stderr.write(r.stderr);process.exitCode=1;}}}}
walk('.');console.log(`Checked ${count} JavaScript files`);
