'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {createApiContractObserver}=require('../server/observability/api-contract');
const {createApp}=require('../server/app');

test('API-03 monitor matches stable contract templates and never logs payloads or concrete IDs',()=>{
  const emitted=[];
  const observer=createApiContractObserver({logger:{warn(line){emitted.push(JSON.parse(line));}},now:()=> '2026-11-16T00:00:00.000Z'});
  assert.ok(observer.monitoredOperations>=20);

  const path='/api/payments/PERSONAL_PAYMENT_ID_ABC/verify';
  const requestBody={reference:'BAD PRIVATE REFERENCE',amount:650};
  const responseBody={success:true,status:'confirmed',verification:'manual',duplicate:false,reservationId:'PRIVATE_RESERVATION_ID',reservationStatus:'CONFIRMED'};
  const result=observer.observe({
    method:'POST',path,status:200,requestId:'safe-uuid',
    requestBody,responseBody,durationMs:12.8
  });
  assert.equal(result.matched,true);
  assert.equal(result.valid,false);
  assert.equal(result.route,'/api/payments/{id}/verify');
  assert.ok(result.issues.some(issue=>issue.phase==='request'&&issue.code==='PATTERN'));
  const event=emitted[0];
  assert.equal(event.event,'api_contract_shadow_mismatch');
  assert.equal(event.route,'/api/payments/{id}/verify');
  assert.equal(event.status,200);
  assert.equal(event.requestId,'safe-uuid');
  assert.equal(event.durationMs,13);
  assert.ok(event.issues.every(x=>['phase','location','code'].every(k=>Object.hasOwn(x,k))));
  const serialized=JSON.stringify(event);
  for(const forbidden of ['PERSONAL_PAYMENT_ID_ABC','BAD PRIVATE REFERENCE','PRIVATE_RESERVATION_ID','650'])
    assert.ok(!serialized.includes(forbidden),'Metadata log leaked forbidden value: '+forbidden);
  assert.equal(observer.snapshot()[0].checked,1);
  assert.equal(observer.snapshot()[0].violations,1);

  // Contract mismatch detection is advisory; it must never create new business failures.
  assert.equal(observer.observe({method:'POST',path:'/api/provider-callbacks/daraja',status:202,requestId:'x',requestBody:{secret:'no'},responseBody:{accepted:true}}),null);
  assert.equal(observer.observe({method:'GET',path:'/api/listings',status:401,requestId:'x',responseBody:{error:'Unauthorized'}}),null);
  assert.equal(emitted.length,1);
});

test('API-03 monitor validates real successful responses but ignores denied requests',async t=>{
  const emitted=[];
  const app=createApp({
    dbPath:':memory:',
    adminEmail:'admin@api03.test',
    adminPassword:'Test-Administrator-API03-2345',
    apiContractObserve:true,
    apiContractLogger:{warn(line){emitted.push(JSON.parse(line));}},
    startOperationsRuntime:false,startSideEffectRuntime:false,
    startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false
  });
  assert.ok(app.apiContractObserver);
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>app.close());
  const base='http://127.0.0.1:'+app.server.address().port;

  const listings=await fetch(base+'/api/listings');
  assert.equal(listings.status,200);
  assert.ok(listings.headers.get('x-request-id'));
  assert.ok(Array.isArray((await listings.json()).listings));
  const signIn=await fetch(base+'/api/auth/login',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:'admin@api03.test',password:'Test-Administrator-API03-2345'})
  });
  assert.equal(signIn.status,200);
  assert.ok(signIn.headers.get('set-cookie')?.includes('HttpOnly'));
  assert.equal((await signIn.json()).role,'admin');
  const cookie=signIn.headers.get('set-cookie').split(';')[0];
  const me=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}});
  assert.equal(me.status,200);
  assert.equal((await me.json()).role,'admin');

  const forbidden=await fetch(base+'/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(forbidden.status,401);
  const callback=await fetch(base+'/api/provider-callbacks/not_configured',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(callback.status,404);
  assert.deepEqual(emitted,[],'Valid authenticated/public traffic should not produce schema mismatch warnings');
  const counters=app.apiContractObserver.snapshot();
  assert.ok(counters.some(x=>x.route==='/api/listings'&&x.method==='GET'&&x.checked===1&&x.violations===0));
  assert.ok(counters.some(x=>x.route==='/api/auth/login'&&x.checked===1&&x.violations===0));
  assert.ok(counters.some(x=>x.route==='/api/auth/me'&&x.checked===1&&x.violations===0));
  assert.ok(!counters.some(x=>x.route.includes('provider-callbacks')));
});

test('API-03 observer is disabled by default, never throws on logger failures, and counters are snapshots',async t=>{
  const off=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false});
  assert.equal(off.apiContractObserver,null);
  t.after(async()=>off.close());

  const observer=createApiContractObserver({logger:{warn(){throw new Error('logging backend unavailable');}}});
  const result=observer.observe({
    method:'GET',path:'/api/listings',status:200,responseBody:{listings:'not-an-array'},requestId:'uuid'
  });
  assert.equal(result.valid,false,'Even a broken logger must not disable drift detection');
  const snapshot=observer.snapshot();
  snapshot[0].checked=999;
  assert.equal(observer.snapshot()[0].checked,1,'The counters are not exposed as mutable state');

  // Errors in optional metrics components cannot modify HTTP behavior.
  assert.equal(observer.observe({method:'GET',path:'/api/listings',status:500,responseBody:{error:'server error'}}),null);
});
