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
  await handler({ method: 'POST', query: { path: ['auth', 'login'] }, headers: { origin: 'https://premium.ride2view.example', cookie: 'r2v_session=old' }, body: { email: 'test@example.test', password: 'not-forwarded-to-browser' } }, res);
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
