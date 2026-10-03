const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('../server/app');
function user(db,role){const id=role+'-v6';db.prepare('INSERT INTO users(id,email,name,password,role,verified) VALUES(?,?,?,?,?,1)').run(id,id+'@example.test',role,'x',role);return {id,role};}
test('V6 earnings are idempotent, split-conserving and payout references cannot replay',()=>{
 const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false,startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false});
 const admin=user(app.db,'admin'),driver=user(app.db,'driver');
 assert.throws(()=>app.marketplace.earn(admin,{beneficiaryId:driver.id,beneficiaryRole:'driver',sourceKind:'ride2go',sourceId:'r1',grossAmount:650,platformAmount:300,beneficiaryAmount:351,evidenceRef:'completed'}),/split/);
 const e=app.marketplace.earn(admin,{beneficiaryId:driver.id,beneficiaryRole:'driver',sourceKind:'ride2go',sourceId:'r1',grossAmount:650,platformAmount:300,beneficiaryAmount:350,evidenceRef:'completed'});
 assert.equal(e.beneficiary_amount,350);
 assert.equal(app.marketplace.earn(admin,{beneficiaryId:driver.id,beneficiaryRole:'driver',sourceKind:'ride2go',sourceId:'r1',grossAmount:650,platformAmount:300,beneficiaryAmount:350,evidenceRef:'completed'}).duplicate,true);
 assert.equal(app.marketplace.payout(admin,e.id,{reference:'PAYOUT-V6-1',evidenceRef:'bank statement'}).status,'PAID');
 assert.equal(app.marketplace.payout(admin,e.id,{reference:'PAYOUT-V6-1',evidenceRef:'bank statement'}).duplicate,true);
});
test('V6 subscriptions require unique payment evidence and expose active entitlement',()=>{
 const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false,startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false});
 const admin=user(app.db,'admin'),customer=user(app.db,'customer');
 const plan=app.marketplace.createPlan(admin,{name:'Three Viewings',price:1500,durationDays:30,viewingCredits:3});
 const s=app.marketplace.subscribe(customer,{planId:plan.id});
 assert.equal(s.status,'PENDING');assert.equal(s.remaining_viewings,3);
 assert.equal(app.marketplace.activate(admin,s.id,{reference:'SUB-V6-1'}).status,'ACTIVE');
 assert.equal(app.marketplace.subscriptions(customer)[0].status,'ACTIVE');
});
