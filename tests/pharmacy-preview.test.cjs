'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../server/app');
test('pharmacy preview serves only informational assets and does not expose transactional endpoints',async()=>{
 const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false,startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+app.server.address().port;
 try{
  for(const path of ['/pharmacy','/pharmacy.html','/css/pharmacy.css','/js/pharmacy.js']){
   const response=await fetch(base+path);
   assert.equal(response.status,200,path);
   assert.equal(response.headers.get('cache-control'),'no-store');
   const text=await response.text();
   assert.ok(text.length>100,path);
   assert.doesNotMatch(text,/fetch\s*\(\s*['"`]\/api\/pharmacy/);
  }
  const html=await (await fetch(base+'/pharmacy')).text();
  assert.match(html,/Preview only/);
  assert.match(html,/No prescription uploads, payments, medicine orders or delivery requests/);
  assert.match(html,/id="search-input"/);
  assert.match(html,/id="category-grid"/);
  assert.match(html,/id="result-count"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.doesNotMatch(html,/<input[^>]*type="file"/i);
  const script=await (await fetch(base+'/js/pharmacy.js')).text();
  assert.match(script,/replacement\?\.focus/);
  assert.doesNotMatch(script,/fetch\s*\(/);
  const response=await fetch(base+'/api/pharmacy/orders',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.notEqual(response.status,200);
  assert.notEqual(response.status,201);
 }finally{await new Promise((resolve,reject)=>app.server.close(error=>error?reject(error):resolve()));app.db.close();}
});
