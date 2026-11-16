'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../server/app');

test('SEC-01 detection-only observer preserves public discovery and ignores spoofed IP headers',async()=>{
  const events=[];
  const app=createApp({
    dbPath:':memory:',apiRateLimit:1000,observeTrafficRisk:true,
    trafficRiskThresholds:{discovery:2},onTrafficRiskEvent:e=>events.push(e),
    startOperationsRuntime:false,startSideEffectRuntime:false,
    startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false
  });
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  try {
    const url='http://127.0.0.1:'+app.server.address().port+'/api/listings';
    for(let i=0;i<4;i++){
      const response=await fetch(url,{headers:{'x-forwarded-for':'203.0.113.'+(i+1)}});
      assert.equal(response.status,200);
      assert.ok(response.headers.get('x-request-id'));
      await response.json();
    }
    assert.equal(events.length,1);
    assert.equal(events[0].routeGroup,'discovery');
    assert.equal(events[0].source,'socket_peer');
    assert.equal(events[0].action,'OBSERVE_ONLY');
    assert.ok(!JSON.stringify(events).includes('203.0.113.'));
  } finally {await app.close();}
});
