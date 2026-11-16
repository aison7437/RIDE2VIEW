'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProxy } = require('../apps/premium-web/api/[...path].js');

function responseRecorder() {
  const headers = {};
  return { headers, statusCode: null, payload: null, setHeader(key, value) { headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; }, send(value) { this.payload = value; return this; } };
}

test('premium authentication proxy fails closed without an HTTPS API origin', async () => {
  let calls = 0;
  const handler = createProxy({ env: {}, fetchFn: async () => { calls++; } });
  const res = responseRecorder();
  await handler({ method: 'GET', query: { path: ['config'] }, headers: {} }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(calls, 0);
});

test('premium authentication proxy allowlists auth routes and rewrites origin for secure same-origin cookies', async () => {
  const sent = [];
  const handler = createProxy({ env: { R2V_API_ORIGIN: 'https://api.ride2view.example' }, fetchFn: async (url, options) => {
    sent.push({ url: String(url), options });
    return { status: 200, headers: { get: name => name === 'content-type' ? 'application/json' : null, getSetCookie: () => ['r2v_session=opaque; HttpOnly; SameSite=Strict; Path=/; Secure'] }, text: async () => '{"id":"verified-user"}' };
  } });
  const res = responseRecorder();
  await handler({ method: 'POST', query: { path: ['auth', 'login'] }, headers: { host: 'premium.ride2view.example', origin: 'https://premium.ride2view.example', cookie: 'r2v_session=old' }, body: { email: 'test@example.test', password: 'not-forwarded-to-browser' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.payload), { id: 'verified-user' });
  assert.equal(sent[0].url, 'https://api.ride2view.example/api/auth/login');
  assert.equal(sent[0].options.headers.Origin, 'https://api.ride2view.example');
  assert.equal(sent[0].options.headers.Cookie, 'r2v_session=old');
  assert.match(res.headers['Set-Cookie'][0], /HttpOnly/);
  const blocked = responseRecorder();
  await handler({ method: 'POST', query: { path: ['admin', 'users'] }, headers: {}, body: {} }, blocked);
  assert.equal(blocked.statusCode, 404);
  assert.equal(sent.length, 1);
});


test('premium auth proxy rejects cross-origin browser POSTs before rewriting Origin', async () => {
  let upstreamCalls = 0;
  const handler = createProxy({
    env: { R2V_API_ORIGIN: 'https://api.ride2view.example', VERCEL: '1' },
    fetchFn: async () => { upstreamCalls++; throw new Error('unexpected upstream request'); }
  });
  const cases = [
    {name:'foreign origin', headers:{host:'premium.ride2view.example',origin:'https://malicious.example'}},
    {name:'cross-site fetch metadata', headers:{host:'premium.ride2view.example',origin:'https://premium.ride2view.example','sec-fetch-site':'cross-site'}},
    {name:'cross-subdomain same-site', headers:{host:'premium.ride2view.example',origin:'https://other.ride2view.example','sec-fetch-site':'same-site'}},
    {name:'opaque origin',headers:{host:'premium.ride2view.example',origin:'null'}},
    {name:'malformed origin',headers:{host:'premium.ride2view.example',origin:'bogus'}},
    {name:'missing request host',headers:{origin:'https://premium.ride2view.example'}},
    {name:'Vercel non-HTTPS origin',headers:{host:'premium.ride2view.example',origin:'http://premium.ride2view.example'}},
    {name:'spoofed forwarded host',headers:{host:'premium.ride2view.example','x-forwarded-host':'malicious.example',origin:'https://malicious.example'}},
    {name:'same-site without exact Origin',headers:{host:'premium.ride2view.example','sec-fetch-site':'same-site'}}
  ];
  for (const item of cases) {
    const res=responseRecorder();
    await handler({method:'POST',query:{path:['auth','login']},headers:item.headers,body:{}},res);
    assert.equal(res.statusCode,403,item.name);
    assert.deepEqual(res.payload,{error:'Cross-site request denied'},item.name);
  }
  assert.equal(upstreamCalls,0);
});

test('valid same-origin request remains compatible and forwarding cannot spoof client IP', async () => {
  const sent=[];
  const handler=createProxy({
    env:{R2V_API_ORIGIN:'https://api.ride2view.example',VERCEL:'1'},
    fetchFn:async(url,options)=>{
      sent.push({url:String(url),options});
      return {status:200,headers:{get:()=> 'application/json',getSetCookie:()=>[]},text:async()=> '{"ok":true}'};
    }
  });
  const res=responseRecorder();
  await handler({
    method:'POST',query:{path:['auth','phone','challenges']},
    headers:{
      host:'premium.ride2view.example',origin:'https://premium.ride2view.example',
      'sec-fetch-site':'same-origin','content-type':'application/json',
      'x-forwarded-for':'203.0.113.100','x-vercel-forwarded-for':'203.0.113.101',
      'x-r2v-proxy-signature':'forged'
    },body:{phone:'+254700000000'}
  },res);
  assert.equal(res.statusCode,200);
  assert.equal(sent.length,1);
  assert.equal(sent[0].options.headers.Origin,'https://api.ride2view.example');
  assert.equal(sent[0].options.headers['Content-Type'],'application/json');
  assert.equal(Object.hasOwn(sent[0].options.headers,'x-forwarded-for'),false);
  assert.equal(Object.hasOwn(sent[0].options.headers,'x-vercel-forwarded-for'),false);
  assert.equal(Object.hasOwn(sent[0].options.headers,'x-r2v-proxy-signature'),false);
});

test('originless non-browser clients retain backward-compatible behavior', async()=>{
  let calls=0;
  const handler=createProxy({
    env:{R2V_API_ORIGIN:'https://api.ride2view.example'},
    fetchFn:async()=>{calls++;return {status:200,headers:{get:()=> 'application/json',getSetCookie:()=>[]},text:async()=> '{"ok":true}'};}
  });
  const res=responseRecorder();
  await handler({method:'POST',query:{path:['auth','login']},headers:{'content-type':'application/json'},body:{}},res);
  assert.equal(res.statusCode,200);
  assert.equal(calls,1);
});
