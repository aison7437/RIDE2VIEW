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

test('default API quota still rejects request 121 and preserves health probes',async()=>{
 const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 try {
  const port=app.server.address().port;
  for(let i=0;i<120;i++)assert.equal((await request(port,'/api/config')).status,200);
  const denied=await request(port,'/api/config');
  assert.equal(denied.status,429);assert.equal(denied.body.error,'API rate limit exceeded');
  assert.ok(Number(denied.headers['retry-after'])>0);
  assert.equal((await request(port,'/api/health/live')).status,200);
  assert.equal((await request(port,'/api/health/ready')).status,200);
 }finally{await app.close();}
});

test('authentication keeps its stricter quota independently of the API limit',async()=>{
 const app=createApp({dbPath:':memory:',startOperationsRuntime:false,startSideEffectRuntime:false});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 try {
  const base='http://127.0.0.1:'+app.server.address().port;
  // Invalid input exercises the actual auth limiter without expensive password hashing.
  for(let i=0;i<30;i++){
   const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   assert.equal(r.status,400);await r.text();
  }
  const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(r.status,429);assert.match((await r.json()).error,/sign-in attempts/);
  assert.equal((await request(app.server.address().port,'/api/config')).status,200);
 }finally{await app.close();}
});
