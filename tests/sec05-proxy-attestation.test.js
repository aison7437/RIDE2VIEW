'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {HEADERS,signProxyAttestation,verifyProxyAttestation}=require('../apps/premium-web/lib/proxy-attestation');

const secret='sec05-testing-server-to-server-secret-longer-than-32';

test('proof is bound to method, path, exact serialized body and short timestamp window',()=>{
  const base={secret,method:'POST',path:'/api/auth/login',body:'{"email":"unit@example.test"}',now:1780000000000,nonce:'a'.repeat(32)};
  const headers=signProxyAttestation(base);
  assert.match(headers[HEADERS.signature],/^[a-f0-9]{64}$/);
  assert.deepEqual(verifyProxyAttestation({...base,headers}),{status:'VERIFIED',verified:true});
  assert.equal(verifyProxyAttestation({...base,headers,method:'GET'}).status,'INVALID');
  assert.equal(verifyProxyAttestation({...base,headers,path:'/api/auth/logout'}).status,'INVALID');
  assert.equal(verifyProxyAttestation({...base,headers,body:'{"email":"changed@example.test"}'}).status,'INVALID');
  assert.equal(verifyProxyAttestation({...base,headers,secret:'another-long-valid-secret-for-proxy-test-00'}).status,'INVALID');
  assert.equal(verifyProxyAttestation({...base,headers,now:base.now+120001}).status,'EXPIRED');
  assert.equal(verifyProxyAttestation({...base,headers,now:base.now-120001}).status,'EXPIRED');
});

test('missing and malformed proof never become trusted',()=>{
  const req={secret,method:'POST',path:'/api/auth/login',body:'{}',now:1780000000000};
  assert.deepEqual(verifyProxyAttestation({...req,headers:{}}),{status:'ABSENT',verified:false});
  const headers=signProxyAttestation(req);
  assert.equal(verifyProxyAttestation({...req,headers:{...headers,[HEADERS.signature]:['abc','def']}}).status,'INVALID');
  assert.equal(verifyProxyAttestation({...req,headers:{...headers,[HEADERS.nonce]:'client-spoofed'}}).status,'INVALID');
  assert.equal(verifyProxyAttestation({...req,headers:{[HEADERS.signature]:'f'.repeat(64)}}).status,'INVALID');
  assert.throws(()=>signProxyAttestation({...req,path:'/api/admin/users'}),/Invalid proxy/);
  assert.throws(()=>signProxyAttestation({...req,secret:'short'}),/Invalid proxy/);
});

test('network identity is not signed, forwarded or inferred by this proof contract',()=>{
  const headers=signProxyAttestation({secret,method:'GET',path:'/api/auth/me',now:1780000000000});
  assert.equal(Object.keys(headers).length,3);
  assert.equal('x-forwarded-for' in headers,false);
  assert.equal('x-vercel-forwarded-for' in headers,false);
  assert.equal(JSON.stringify(headers).includes('127.0.0.1'),false);
});
