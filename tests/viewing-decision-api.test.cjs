const test=require('node:test');
const assert=require('node:assert/strict');
const {createJourneyRoutes}=require('../server/journeys/routes');
const fs=require('node:fs');
const path=require('node:path');

test('decision GET routes to customer-owned projection and does not mutate',()=>{
 let called=0,received;
 const route=createJourneyRoutes({journeys:{decision(user,id){called++;assert.equal(user.role,'customer');assert.equal(id,'journey-1');return {actions:{continue:true,interested:true,returnReview:true,endGuidance:true}};}}});
 const handled=route({path:'/api/journeys/journey-1/decision',method:'GET',user:{role:'customer'},body:null,send(status,payload){received={status,payload}}});
 assert.equal(handled,true);assert.equal(called,1);assert.equal(received.status,200);
 assert.equal(received.payload.actions.interested,true);
 assert.equal(route({path:'/api/journeys/journey-1/decision',method:'POST',user:{role:'customer'},body:{},send(){throw Error('must not send')}}),false);
});
test('decision projection enforces customer role, includes return entitlement, and has no transport mutation',()=>{
 const authority=fs.readFileSync(path.join(__dirname,'../server/journeys/authority.js'),'utf8');
 const projection=authority.split(' function decision(a,id){')[1].split(' function list(a)')[0];
 assert.match(projection,/role\(a,'customer'\)/);
 assert.match(projection,/get\(a,id\)/);
 assert.match(projection,/returnIncluded:Boolean\(j\.plan\.returnJourney\)/);
 assert.match(projection,/returnQuoteRequired/);
 assert.match(projection,/transportCompletionAuthority:'driver_or_admin'/);
 assert.doesNotMatch(projection,/db\.prepare|dispatch\.transition|tx\(/);
});

test('customer change request is routed to the authority without direct transport transition',()=>{
 let calls=0,output;
 const route=createJourneyRoutes({journeys:{requestChange(user,id,body){calls++;assert.equal(user.role,'customer');assert.equal(id,'j-1');assert.equal(body.kind,'EARLY_END');return {status:'PENDING',duplicate:false};}}});
 assert.equal(route({path:'/api/journeys/j-1/change-requests',method:'POST',user:{role:'customer'},body:{kind:'EARLY_END'},send(code,result){output={code,result}}}),true);
 assert.equal(calls,1);assert.equal(output.code,201);assert.equal(output.result.status,'PENDING');
});
test('journey change requests are transactional, idempotent and do not directly close trips',()=>{
 const authority=fs.readFileSync(path.join(__dirname,'../server/journeys/authority.js'),'utf8');
 const block=authority.split(' function requestChange(a,id,data){')[1].split(' function decision(a,id)')[0];
 assert.match(block,/role\(a,'customer'\)/);
 assert.match(block,/return tx\(\(\)=>\{/);
 assert.match(block,/idempotency_key/);
 assert.match(block,/status='PENDING'/);
 assert.match(block,/CHANGE_REQUESTED/);
 assert.doesNotMatch(block,/dispatch\.transition|UPDATE viewing_journeys SET status|UPDATE payments SET/);
 const schema=fs.readFileSync(path.join(__dirname,'../server/journeys/schema.js'),'utf8');
 assert.match(schema,/CREATE TABLE journey_change_requests/);
 assert.match(schema,/UNIQUE\(customer_id,idempotency_key\)/);
});

test('operations review and history routes use explicit authority methods',()=>{
 const calls=[];
 const route=createJourneyRoutes({journeys:{
  changeRequests(user,id){calls.push(['list',user.role,id]);return [{id:'r1',status:'PENDING'}]},
  reviewChange(user,id,requestId,data){calls.push(['review',user.role,id,requestId,data.decision]);return {id:requestId,status:'REVIEWED',executionStatus:'NOT_EXECUTED'}}
 }});
 let listed,reviewed;
 assert.equal(route({path:'/api/journeys/j1/change-requests',method:'GET',user:{role:'customer'},send(code,value){listed={code,value}}}),true);
 assert.equal(route({path:'/api/journeys/j1/change-requests/r1/review',method:'POST',user:{role:'admin'},body:{decision:'REVIEWED',note:'Review only'},send(code,value){reviewed={code,value}}}),true);
 assert.equal(listed.value.requests[0].status,'PENDING');
 assert.equal(reviewed.value.executionStatus,'NOT_EXECUTED');
 assert.deepEqual(calls,[['list','customer','j1'],['review','admin','j1','r1','REVIEWED']]);
});
test('operations review is audited and does not mutate booking, fare or transport',()=>{
 const authority=fs.readFileSync(path.join(__dirname,'../server/journeys/authority.js'),'utf8');
 const block=authority.split(' function reviewChange(a,id,requestId,data){')[1].split(' function decision(a,id)')[0];
 assert.match(block,/role\(a,'admin'\)/);
 assert.match(block,/CHANGE_REVIEWED/);
 assert.match(block,/reviewer_id/);
 assert.match(block,/NOT_EXECUTED/);
 assert.doesNotMatch(block,/dispatch\.transition|UPDATE payments SET|UPDATE viewing_journeys SET|UPDATE bookings SET/);
});

test('return coordination requires package entitlement at the authority boundary',()=>{
 const authority=fs.readFileSync(path.join(__dirname,'../server/journeys/authority.js'),'utf8');
 const block=authority.split(' function requestChange(a,id,data){')[1].split(' function changeRequests(a,id)')[0];
 assert.match(block,/data\.kind==='RETURN_REVIEW'&&plan\.returnJourney!==true/);
 assert.match(block,/does not include return transport/);
 assert.match(block,/JSON\.parse\(j\.plan\)/);
});

test('early-end requests require an unvisited stop and preserve normal completion',()=>{
 const authority=fs.readFileSync(path.join(__dirname,'../server/journeys/authority.js'),'utf8');
 const request=authority.split(' function requestChange(a,id,data){')[1].split(' function changeRequests(a,id)')[0];
 assert.match(request,/data\.kind==='EARLY_END'&&!journeyStops\.some\(s=>s\.status!=='COMPLETED'\)/);
 assert.match(request,/All property stops are complete/);
 const projection=authority.split(' function decision(a,id){')[1].split(' function list(a)')[0];
 assert.match(projection,/endGuidance:active&&!pending&&stops\(db,id\)\.some/);
});
