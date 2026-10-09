const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {createApp}=require('../server/app');
function request(port,path){return new Promise((resolve,reject)=>http.get({hostname:'127.0.0.1',port,path},res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(body)}));}).on('error',reject));}
test('V10-A API throttle preserves liveness and readiness',async()=>{
 const app=createApp({dbPath:':memory:',apiRateLimit:2,startOperationsRuntime:false,startSideEffectRuntime:false,startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 try {
  const port=app.server.address().port;
  assert.equal((await request(port,'/api/config')).status,200);
  assert.equal((await request(port,'/api/config')).status,200);
  const limited=await request(port,'/api/config');
  assert.equal(limited.status,429);assert.ok(Number(limited.headers['retry-after'])>=1);
  assert.ok(limited.headers['x-request-id']);
  assert.equal((await request(port,'/api/health/live')).status,200);
  assert.equal((await request(port,'/api/health/ready')).status,200);
 }finally{await app.close();}
});
