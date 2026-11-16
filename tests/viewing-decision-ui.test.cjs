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
 assert.match(section,/decision.returnIncluded/);
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
 assert.match(block,/decision.returnIncluded/);
});

test('active decision actions are gated by server projection',()=>{
 assert.match(source,/await api\('\/journeys\/'.*'\/decision'\)/);
 assert.match(source,/decision\.actions\.continue/);
 assert.match(source,/decision\.actions\.interested/);
 assert.match(source,/decision\.actions\.returnReview/);
});

test('unrecorded property outcomes do not dereference null',()=>{
 const block=source.split('// Customer decision hub:')[1].split('if(!j.stops.length)')[0];
 assert.doesNotMatch(block,/current\.outcome\.outcome/);
 assert.match(block,/decision\.current\?\.outcome/);
});
test('included return journeys do not navigate to a duplicate paid booking',()=>{
 const block=source.split('// Customer decision hub:')[1].split('if(!j.stops.length)')[0];
 assert.match(block,/if\(decision\.returnIncluded\)\{/);
 assert.match(block,/kind:'RETURN_REVIEW'/);
 assert.match(block,/no new fare has been charged/);
 assert.match(block,/decision.pendingChange/);
 assert.match(block,/if\(decision\.actions\.returnReview\)/);
 assert.match(block,/if\(decision\.actions\.endGuidance\)/);
});

test('pending journey changes disable new review requests at the authority layer',()=>{
 const authority=fs.readFileSync(require('node:path').join(__dirname,'../server/journeys/authority.js'),'utf8');
 const block=authority.split(' function decision(a,id){')[1].split(' function list(a)')[0];
 assert.match(block,/status='PENDING'/);
 assert.match(block,/pendingChange:pending/);
 assert.match(block,/returnReview:active&&!pending/);
 assert.match(block,/endGuidance:active&&!pending/);
});

test('customer can express interest in previously completed stops without changing transport',()=>{
 assert.match(source,/Interested in '\+s\.listing\.title/);
 assert.match(source,/s\.position!==Math\.max/);
 assert.match(source,/encodeURIComponent\(s\.request_id\)/);
 assert.match(source,/outcome:'INTERESTED',notes:''/);
});
