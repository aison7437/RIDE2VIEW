const test=require('node:test');
const assert=require('node:assert/strict');
const {productionConfig,createRateLimiter,logRequestError}=require('../server/security');
test('production configuration refuses insecure cookies and ephemeral storage',()=>{
  assert.throws(()=>productionConfig({NODE_ENV:'production',COOKIE_SECURE:'false',DB_PATH:'./data/test.sqlite'}),/COOKIE_SECURE/);
  assert.throws(()=>productionConfig({NODE_ENV:'production',COOKIE_SECURE:'true',DB_PATH:':memory:'}),/DB_PATH/);
  assert.equal(productionConfig({NODE_ENV:'production',COOKIE_SECURE:'true',DB_PATH:'./data/live.sqlite'}),true);
  assert.equal(productionConfig({NODE_ENV:'test'}),true);
});
test('production payment provider settings are validated without printing secrets',()=>{
  const baseline={NODE_ENV:'production',COOKIE_SECURE:'true',DB_PATH:'./data/live.sqlite',R2V_GATEWAY_URL:'https://gateway.example',R2V_GATEWAY_TOKEN:'secret'};
  assert.throws(()=>productionConfig(baseline),/callback secret/);
  assert.equal(productionConfig({...baseline,R2V_GATEWAY_CALLBACK_SECRET:'a'.repeat(32)}),true);
  assert.throws(()=>productionConfig({...baseline,R2V_GATEWAY_CALLBACK_SECRET:'a'.repeat(32),R2V_GATEWAY_URL:'http://gateway.example'}),/HTTPS/);
});
test('per-key limiter enforces quotas and resets after expiry',()=>{
  let now=0;const check=createRateLimiter({limit:2,windowMs:1000,clock:()=>now});
  assert.equal(check('a').allowed,true);assert.equal(check('a').allowed,true);
  assert.deepEqual(check('a'),{allowed:false,retryAfter:1});
  assert.equal(check('b').allowed,true);now=1001;assert.equal(check('a').allowed,true);
});
test('structured errors omit exception messages, request bodies and credentials',()=>{
  const messages=[];const log=logRequestError(new Error('password=classified'),{requestId:'test',method:'GET',path:'/api/config',status:500},{error:v=>messages.push(v)});
  assert.equal(log.requestId,'test');assert.equal(messages.length,1);
  assert.equal(messages[0].includes('classified'),false);assert.equal(log.code,'INTERNAL_ERROR');
});
