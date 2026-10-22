'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createApp } = require('../server/app');
const { createAfricasTalkingSms, createResendEmail, fromEnvironment } = require('../server/auth/providers');

async function fixture(t, extra = {}) {
  const sent = [];
  let time = Date.now();
  const provider = extra.provider || {
    channels: { phone: true, email: true },
    async send(message) { sent.push(message); if (extra.deliveryFailure) throw new Error('simulated delivery failure'); return { messageId: 'provider-message-id' }; }
  };
  const app = createApp({ dbPath: ':memory:', authVerificationProvider: provider, otpSecret: 'test-only-otp-secret-with-more-than-32-bytes', authClock: () => time, startOperationsRuntime: false, startSideEffectRuntime: false, startProviderCallbackRuntime: false, startPaymentInitiationRuntime: false, ...extra });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = async (path, method = 'GET', body, cookie) => {
    const response = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie'), cookiePair: response.headers.get('set-cookie')?.split(';')[0] };
  };
  t.after(async () => app.close());
  return { app, call, sent, advance: ms => { time += ms; } };
}

test('email signup verifies before account creation and issues secure HttpOnly session', async t => {
  const { app, call, sent } = await fixture(t, { secureCookies: true });
  assert.deepEqual((await call('/api/config')).data.authVerificationChannels, { phone: true, email: true });
  const started = await call('/api/auth/email/challenges', 'POST', { name: 'Test Customer', email: 'customer@example.test', password: 'Test-Password-1234', role: 'customer' });
  assert.equal(started.status, 202);
  const challenge = app.db.prepare('SELECT * FROM auth_verification_challenges WHERE id=?').get(started.data.challengeId);
  assert.equal(challenge.status, 'PENDING');
  assert.equal(JSON.stringify(challenge).includes(sent[0].text.match(/\d{6}/)[0]), false);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
  const code = sent[0].text.match(/\d{6}/)[0];
  assert.equal((await call('/api/auth/challenges/verify', 'POST', { challengeId: started.data.challengeId, code: '000000' })).status, 400);
  const verified = await call('/api/auth/challenges/verify', 'POST', { challengeId: started.data.challengeId, code });
  assert.equal(verified.status, 200);
  assert.match(verified.cookie, /HttpOnly/);
  assert.match(verified.cookie, /SameSite=Strict/);
  assert.match(verified.cookie, /Secure/);
  assert.equal(verified.data.email, 'customer@example.test');
  assert.equal((await call('/api/auth/me', 'GET', undefined, verified.cookiePair)).data.id, verified.data.id);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM auth_contacts WHERE kind=? AND address=? AND verified_at IS NOT NULL').get('email', 'customer@example.test').n, 1);
  assert.equal((await call('/api/auth/challenges/verify', 'POST', { challengeId: started.data.challengeId, code })).status, 400);
});

test('phone signup, phone and email linking preserve one identity', async t => {
  const { call, sent } = await fixture(t);
  const startPhone = await call('/api/auth/phone/challenges', 'POST', { name: 'Phone Customer', phone: '0712 345 678', role: 'customer' });
  assert.equal(startPhone.status, 202);
  assert.equal(sent[0].channel, 'sms');
  const phoneUser = await call('/api/auth/challenges/verify', 'POST', { challengeId: startPhone.data.challengeId, code: sent[0].text.match(/\d{6}/)[0] });
  assert.equal(phoneUser.status, 200);
  assert.equal(phoneUser.data.phone, '+254712345678');
  assert.equal(phoneUser.data.email, null);
  const linked = await call('/api/auth/email/link/challenges', 'POST', { email: 'linked@example.test', password: 'New-Password-12345' }, phoneUser.cookiePair);
  assert.equal(linked.status, 202);
  const emailCode = sent[1].text.match(/\d{6}/)[0];
  const sameUser = await call('/api/auth/challenges/verify', 'POST', { challengeId: linked.data.challengeId, code: emailCode });
  assert.equal(sameUser.status, 200);
  assert.equal(sameUser.data.id, phoneUser.data.id);
  assert.equal(sameUser.data.phone, '+254712345678');
  assert.equal(sameUser.data.email, 'linked@example.test');
  assert.equal((await call('/api/auth/login', 'POST', { email: 'linked@example.test', password: 'New-Password-12345' })).status, 200);
});

test('verification fails closed when providers are missing and after expiry or attempt cap', async t => {
  const missing = await fixture(t, { provider: { channels: { phone: false, email: false }, async send() {} } });
  assert.equal((await missing.call('/api/auth/phone/challenges', 'POST', { phone: '+254712345678' })).status, 503);

  const { app, call, sent, advance } = await fixture(t);
  const start = await call('/api/auth/phone/challenges', 'POST', { phone: '+254712345678' });
  for (let i = 0; i < 5; i++) assert.equal((await call('/api/auth/challenges/verify', 'POST', { challengeId: start.data.challengeId, code: '000000' })).status, 400);
  assert.equal(app.db.prepare('SELECT status FROM auth_verification_challenges WHERE id=?').get(start.data.challengeId).status, 'LOCKED');
  assert.equal(app.db.prepare('SELECT draft,code_digest FROM auth_verification_challenges WHERE id=?').get(start.data.challengeId).draft, '{}');
  assert.equal((await call('/api/auth/phone/challenges', 'POST', { phone: '+254722345678' })).status, 202);
  const latest = app.db.prepare("SELECT id FROM auth_verification_challenges WHERE destination='+254722345678'").get();
  advance(5 * 60 * 1000 + 1);
  assert.equal((await call('/api/auth/challenges/verify', 'POST', { challengeId: latest.id, code: sent.at(-1).text.match(/\d{6}/)[0] })).status, 400);
  assert.equal(app.db.prepare('SELECT status FROM auth_verification_challenges WHERE id=?').get(latest.id).status, 'EXPIRED');
});

test('verification resend limit is persistent across challenge types', async t => {
  const { call, sent, advance } = await fixture(t);
  const first = await call('/api/auth/phone/challenges', 'POST', { phone: '+254712345678' });
  const account = await call('/api/auth/challenges/verify', 'POST', { challengeId: first.data.challengeId, code: sent[0].text.match(/\d{6}/)[0] });
  advance(60 * 1000 + 1);
  assert.equal((await call('/api/auth/phone/challenges', 'POST', { phone: '+254712345678' })).status, 202);
  advance(60 * 1000 + 1);
  assert.equal((await call('/api/auth/phone/link/challenges', 'POST', { phone: '+254712345678' }, account.cookiePair)).status, 202);
  advance(60 * 1000 + 1);
  assert.equal((await call('/api/auth/phone/challenges', 'POST', { phone: '+254712345678' })).status, 429);
});

test('provider send failures do not return a challenge usable for login', async t => {
  const { app, call } = await fixture(t, { deliveryFailure: true });
  const result = await call('/api/auth/email/challenges', 'POST', { name: 'Failure Test', email: 'failure@example.test', password: 'Test-Password-1234' });
  assert.equal(result.status, 503);
  assert.equal(app.db.prepare("SELECT status FROM auth_verification_challenges").get().status, 'DELIVERY_FAILED');
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
});

test('verified mode rejects legacy signup and requires contact proof for password sign-in', async t => {
  const { app, call, sent } = await fixture(t, { requireVerifiedAuth: true });
  const salt = 'synthetic-test-salt';
  const { scryptSync } = require('node:crypto');
  const password = 'Legacy-Test-Password-1234';
  const hash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
  app.db.prepare('INSERT INTO users(id,email,name,password,role,verified) VALUES(?,?,?,?,?,1)').run('legacy-user', 'legacy@example.test', 'Legacy User', hash, 'customer');
  assert.equal((await call('/api/auth/register', 'POST', { name: 'Bypass', email: 'bypass@example.test', password, role: 'customer' })).status, 410);
  assert.equal((await call('/api/auth/login', 'POST', { email: 'legacy@example.test', password })).status, 403);
  const challenge = await call('/api/auth/email/challenges', 'POST', { email: 'legacy@example.test' });
  assert.equal(challenge.status, 202);
  const verified = await call('/api/auth/challenges/verify', 'POST', { challengeId: challenge.data.challengeId, code: sent.at(-1).text.match(/\d{6}/)[0] });
  assert.equal(verified.data.id, 'legacy-user');
  assert.equal((await call('/api/auth/login', 'POST', { email: 'legacy@example.test', password })).status, 200);
});

test('pending verification survives API restart and completes against persistent SQLite state', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ride2view-auth-'));
  const dbPath = join(dir, 'auth.sqlite');
  const sent = [];
  const provider = { channels: { phone: true, email: true }, async send(message) { sent.push(message); return { messageId: 'restart-message' }; } };
  let app = createApp({ dbPath, authVerificationProvider: provider, otpSecret: 'test-only-otp-secret-with-more-than-32-bytes', startOperationsRuntime: false, startSideEffectRuntime: false, startProviderCallbackRuntime: false, startPaymentInitiationRuntime: false });
  async function listen(current) { await new Promise(resolve => current.server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${current.server.address().port}`; }
  async function post(base, path, body) { const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json() }; }
  try {
    const firstBase = await listen(app);
    const started = await post(firstBase, '/api/auth/phone/challenges', { phone: '0712345678', name: 'Persistent User' });
    assert.equal(started.status, 202);
    await app.close();
    app = createApp({ dbPath, authVerificationProvider: provider, otpSecret: 'test-only-otp-secret-with-more-than-32-bytes', startOperationsRuntime: false, startSideEffectRuntime: false, startProviderCallbackRuntime: false, startPaymentInitiationRuntime: false });
    const secondBase = await listen(app);
    const verified = await post(secondBase, '/api/auth/challenges/verify', { challengeId: started.data.challengeId, code: sent[0].text.match(/\d{6}/)[0] });
    assert.equal(verified.status, 200);
    assert.equal(verified.data.phone, '+254712345678');
  } finally {
    if (app.server.listening) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('password recovery proves email control, changes password and revokes prior sessions', async t => {
  const { call, sent, advance } = await fixture(t);
  const registration = await call('/api/auth/email/challenges', 'POST', { name: 'Recovery User', email: 'recover@example.test', password: 'Original-Password-1234' });
  const created = await call('/api/auth/challenges/verify', 'POST', { challengeId: registration.data.challengeId, code: sent[0].text.match(/\d{6}/)[0] });
  const oldCookie = created.cookiePair;
  advance(60 * 1000 + 1);
  const reset = await call('/api/auth/email/recovery/challenges', 'POST', { email: 'recover@example.test', password: 'Replacement-Password-1234' });
  assert.equal(reset.status, 202);
  const afterReset = await call('/api/auth/challenges/verify', 'POST', { challengeId: reset.data.challengeId, code: sent[1].text.match(/\d{6}/)[0] });
  assert.equal(afterReset.status, 200);
  assert.equal(afterReset.data.id, created.data.id);
  assert.equal((await call('/api/auth/me', 'GET', undefined, oldCookie)).status, 401);
  assert.equal((await call('/api/auth/login', 'POST', { email: 'recover@example.test', password: 'Original-Password-1234' })).status, 401);
  assert.equal((await call('/api/auth/login', 'POST', { email: 'recover@example.test', password: 'Replacement-Password-1234' })).status, 200);
});

test('production provider adapters use server credentials and require provider acceptance', async () => {
  const requests = [];
  const fetchFn = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, headers: { get: () => '100' }, text: async () => url.includes('africastalking') ? JSON.stringify({ SMSMessageData: { Recipients: [{ statusCode: 101, messageId: 'ATX123' }] } }) : JSON.stringify({ id: 're_123' }) };
  };
  const sms = createAfricasTalkingSms({ username: 'ride2view', apiKey: 'server-only', senderId: 'RIDE2VIEW', fetchFn });
  const email = createResendEmail({ apiKey: 'server-only', from: 'Ride2View <auth@example.test>', fetchFn });
  assert.ok(await sms.send({ destination: '+254712345678', text: 'Code 123456', idempotencyKey: 'otp-1' }));
  assert.ok(await email.send({ destination: 'a@example.test', text: 'Code 123456', idempotencyKey: 'otp-2' }));
  assert.equal(requests[0].url, 'https://api.africastalking.com/version1/messaging');
  assert.match(requests[0].options.headers.apiKey, /server-only/);
  assert.equal(requests[1].url, 'https://api.resend.com/emails');
  assert.equal(requests[1].options.headers.Authorization, 'Bearer server-only');
  assert.equal(requests[1].options.headers['Idempotency-Key'], 'otp-2');
  assert.deepEqual(fromEnvironment({}).channels, { phone: false, email: false });
});
