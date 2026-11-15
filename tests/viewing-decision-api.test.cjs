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
