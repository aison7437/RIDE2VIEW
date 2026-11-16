'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../server/app');

test('opt-in SEC-04 HTTP quota counts normalized phone challenges without changing existing 429 policy',async()=>{
  let now=Math.floor(Date.now()/3600000)*3600000+60000;
  const events=[];
  const sent=[];
  const provider={channels:{phone:true,email:true},async send(msg){sent.push(msg);return {messageId:'fake'};}};
  const app=createApp({
    dbPath:':memory:',authVerificationProvider:provider,
    otpSecret:'sec04-only-test-key-longer-than-thirty-two-bytes',
    observeAuthQuotas:true,authClock:()=>now,
    onAuthQuotaEvent:event=>events.push(event),
    startOperationsRuntime:false,startSideEffectRuntime:false,
    startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false
  });
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  try {
    const base='http://127.0.0.1:'+app.server.address().port;
    const request=()=>fetch(base+'/api/auth/phone/challenges',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone:'0712 345 678',name:'Quota Customer'})
    });
    for(let i=0;i<3;i++){
      const response=await request();
      assert.equal(response.status,202);
      await response.json();
      now+=61000;
    }
    const exceeded=await request();
    assert.equal(exceeded.status,429); // existing destination policy; not SEC-04 enforcement
    await exceeded.json();
    assert.equal(sent.length,3);
    assert.equal(events.length,1);
    assert.equal(events[0].event,'auth_quota_shadow_exceeded');
    assert.equal(events[0].scope,'phone_challenge');
    assert.equal(events[0].action,'OBSERVE_ONLY');
    const rows=app.db.prepare('SELECT key_digest,scope,hits FROM security_auth_quota_windows').all();
    assert.equal(rows.length,1);
    assert.equal(rows[0].hits,4);
    assert.equal(JSON.stringify(rows).includes('+254712345678'),false);
    assert.equal(JSON.stringify(events).includes('+254712345678'),false);
    const config=await fetch(base+'/api/config');
    assert.equal(config.status,200);
  }finally {await app.close();}
});

test('SEC-04 is disabled by default and does not create observer tables',async()=>{
  const app=createApp({
    dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false,
    startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false
  });
  try {
    const row=app.db.prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='security_auth_quota_windows'"
    ).get();
    assert.equal(row.count,0);
  }finally {await app.close();}
});


test('optional quota instrumentation does not prevent boot without a quota secret',async()=>{
  const app=createApp({
    environment:{NODE_ENV:'test'},dbPath:':memory:',
    observeAuthQuotas:true,
    startOperationsRuntime:false,startSideEffectRuntime:false,
    startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false
  });
  try{
    assert.equal(app.db.prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE name='security_auth_quota_windows'"
    ).get().count,0);
  }finally{await app.close();}
});
