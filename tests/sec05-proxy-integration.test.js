'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {createProxy}=require('../apps/premium-web/api/[...path].js');
const {createApp}=require('../server/app');
const {HEADERS,signProxyAttestation,verifyProxyAttestation}=require('../apps/premium-web/lib/proxy-attestation');

const secret='sec05-testing-secret-32-plus-bytes-unique-12345678';
function recorder(){
  return {headers:{},statusCode:null,payload:null,
    setHeader(k,v){this.headers[k]=v;},
    status(n){this.statusCode=n;return this;},
    json(v){this.payload=v;return this;},
    send(v){this.payload=v;return this;}
  };
}
function okResponse(){
  return {status:200,headers:{get:()=> 'application/json',getSetCookie:()=>[]},text:async()=> '{"ok":true}'};
}
test('premium proxy creates verifiable proof only when explicitly opted in',async()=>{
  const sent=[];
  const proxy=createProxy({
    env:{VERCEL:'1',R2V_API_ORIGIN:'https://api.ride2view.example',
      R2V_PROXY_ATTESTATION_SIGN:'true',R2V_PROXY_ATTESTATION_SECRET:secret},
    fetchFn:async(url,options)=>{sent.push({url:String(url),options});return okResponse();}
  });
  const res=recorder();
  await proxy({
    method:'POST',query:{path:['auth','phone','challenges']},
    headers:{host:'premium.ride2view.example',origin:'https://premium.ride2view.example',
      'sec-fetch-site':'same-origin','content-type':'application/json',
      'x-r2v-proxy-signature':'f'.repeat(64),
      'x-forwarded-for':'198.51.100.73'},
    body:{phone:'+254700000000'}
  },res);
  assert.equal(res.statusCode,200);
  assert.equal(sent.length,1);
  const outbound=sent[0].options;
  assert.equal(sent[0].url,'https://api.ride2view.example/api/auth/phone/challenges');
  assert.deepEqual(verifyProxyAttestation({
    secret,method:'POST',path:'/api/auth/phone/challenges',
    body:outbound.body,headers:outbound.headers
  }),{status:'VERIFIED',verified:true});
  assert.notEqual(outbound.headers[HEADERS.signature],'f'.repeat(64));
  assert.equal(outbound.headers['x-forwarded-for'],undefined);
});

test('enabled signer refuses to forward if no server-only secret is installed',async()=>{
  let forwarded=0;
  const proxy=createProxy({
    env:{VERCEL:'1',R2V_API_ORIGIN:'https://api.ride2view.example',R2V_PROXY_ATTESTATION_SIGN:'true'},
    fetchFn:async()=>{forwarded++;return okResponse();}
  });
  const res=recorder();
  await proxy({method:'POST',query:{path:['auth','login']},
    headers:{host:'premium.ride2view.example',origin:'https://premium.ride2view.example'},body:{}},res);
  assert.equal(res.statusCode,503);
  assert.equal(forwarded,0);
});

test('backend shadow validation separates signed, tampered and absent proof without changing auth decisions',async()=>{
  const events=[];
  const app=createApp({
    dbPath:':memory:',observeProxyAttestation:true,proxyAttestationSecret:secret,
    onProxyAttestationEvent:event=>events.push(event),
    startOperationsRuntime:false,startSideEffectRuntime:false,
    startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false
  });
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  try{
    const url='http://127.0.0.1:'+app.server.address().port+'/api/auth/login';
    const originalBody='{}';
    const proof=signProxyAttestation({secret,method:'POST',path:'/api/auth/login',body:originalBody});
    const send=async(body,proofHeaders)=> {
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...proofHeaders},body});
      const status=response.status;await response.text();return status;
    };
    assert.equal(await send(originalBody,proof),400);
    assert.equal(await send('{"password":"wrong"}',proof),400);
    assert.equal(await send(originalBody,{}),400);
    assert.equal(app.proxyProofStats.VERIFIED,1);
    assert.equal(app.proxyProofStats.INVALID,1);
    assert.equal(app.proxyProofStats.ABSENT,1);
    assert.deepEqual(events.map(e=>e.status),['VERIFIED','INVALID','ABSENT']);
    for(const e of events){
      assert.equal(e.routeGroup,'authentication');
      assert.equal('ip' in e,false);
      assert.equal('cookie' in e,false);
      assert.equal('path' in e,false);
    }
  }finally {await app.close();}
});


test('disabled signing preserves the existing allowlisted proxy behavior',async()=>{
  const sent=[];
  const proxy=createProxy({
    env:{VERCEL:'1',R2V_API_ORIGIN:'https://api.ride2view.example'},
    fetchFn:async(url,options)=>{sent.push(options);return okResponse();}
  });
  const res=recorder();
  await proxy({method:'POST',query:{path:['auth','login']},
    headers:{host:'premium.ride2view.example',origin:'https://premium.ride2view.example',
      'content-type':'application/json','x-r2v-proxy-timestamp':'forged'},
    body:{email:'a@example.test'}},res);
  assert.equal(res.statusCode,200);
  assert.equal(sent.length,1);
  for(const key of Object.values(HEADERS)) assert.equal(sent[0].headers[key],undefined);
});
