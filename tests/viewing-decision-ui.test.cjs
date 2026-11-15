const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/journeys.js'),'utf8');

test('customer viewing decision hub exposes four actions without direct transport mutation',()=>{
 new vm.Script(source,{filename:'js/journeys.js'});
 for(const label of ['Continue to next house',"I'm interested in this house",'Return with Ride2Go','End my journey']){
  assert.ok(source.includes(label),label+' missing');
 }
 const section=source.split('// Customer decision hub:')[1].split("if(!j.stops.length)")[0];
 assert.match(section,/user.role==='customer'&&j.status==='IN_PROGRESS'/);
 assert.match(section,/completed.length/);
 assert.match(section,/\/viewing-requests\/.*\/outcome/);
 assert.match(section,/outcome:'INTERESTED'/);
 assert.doesNotMatch(section,/api\('\/journeys\/.*\/(finish|start|cancel|stops)/);
 assert.doesNotMatch(section,/api\('\/ride2go\/trips'.*'POST'/);
 assert.match(section,/returnJourney/);
});

test('decision panel retains the original Ride2View Pro theme and accessible focus',()=>{
 const css=fs.readFileSync(require('node:path').join(__dirname,'../css/app.css'),'utf8');
 assert.match(css,/\.viewing-decision\{/);
 assert.match(css,/#faf7ec/i);
 assert.match(css,/#25180f/i);
 assert.match(css,/#865d0c/i);
 assert.match(css,/\.viewing-decision button:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('active customer sees one interest control and safe missing-request fallback',()=>{
 assert.match(source,/user\.role==='customer'&&j\.status!=='IN_PROGRESS'/);
 assert.match(source,/if\(!current\.request_id\)/);
 assert.match(source,/encodeURIComponent\(current\.request_id\)/);
 assert.match(source,/await refresh\(\)/);
 const block=source.split('// Customer decision hub:')[1].split('if(!j.stops.length)')[0];
 assert.doesNotMatch(block,/\/journeys\/.*\/finish/);
 assert.match(block,/j\.plan\.returnJourney/);
});
