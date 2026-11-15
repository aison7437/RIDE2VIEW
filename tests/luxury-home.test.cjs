'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../server/app');
test('luxury homepage preview is isolated from existing booking workflows',async()=>{
 const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false,startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+app.server.address().port;
 try{
  for(const path of ['/luxury-home','/luxury-home.html','/css/luxury-home.css','/js/luxury-home.js']){
   const response=await fetch(base+path);assert.equal(response.status,200,path);assert.ok((await response.text()).length>100,path);
  }
  const html=await(await fetch(base+'/luxury-home')).text();
  assert.match(html,/Find a home worth/);
  assert.match(html,/Design preview/);
  assert.match(html,/Illustrative listing/);
  assert.match(html,/href="\/"/);
  assert.doesNotMatch(html,/type="file"/);
  const js=await(await fetch(base+'/js/luxury-home.js')).text();
  assert.doesNotMatch(js,/fetch\s*\(/);
  const core=await fetch(base+'/');assert.equal(core.status,200);assert.match(await core.text(),/id="screen-home"/);
 }finally{await new Promise((resolve,reject)=>app.server.close(error=>error?reject(error):resolve()));app.db.close();}
});
