'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createApp} = require('../server/app');

async function fixture(t) {
  const app = createApp({
    dbPath: ':memory:',
    requireVerifiedAuth: false,
    startOperationsRuntime: false,
    startSideEffectRuntime: false,
    startProviderCallbackRuntime: false,
    startPaymentInitiationRuntime: false
  });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => app.close());
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  async function call(path, method = 'GET', data, cookie) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        ...(data === undefined ? {} : {'Content-Type':'application/json'}),
        ...(cookie ? {Cookie:cookie} : {})
      },
      body: data === undefined ? undefined : JSON.stringify(data)
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0]
    };
  }
  return {app,call};
}

test('identity gateway is protected and leaves existing sessions compatible', async t => {
  const {call} = await fixture(t);
  assert.equal((await call('/api/auth/me')).status,401);

  const registered = await call('/api/auth/register','POST',{
    email:'customer-idv1@example.test',name:'Customer V1',
    password:'Example-Password-123456',role:'customer'
  });
  assert.equal(registered.status,201);
  const login = await call('/api/auth/login','POST',{
    email:'customer-idv1@example.test',password:'Example-Password-123456'
  });
  assert.equal(login.status,200);
  assert.ok(login.cookie?.startsWith('r2v_session='));

  const me = await call('/api/auth/me','GET',undefined,login.cookie);
  assert.equal(me.status,200);
  assert.equal(me.data.id,registered.data.id);
  assert.equal(me.data.role,'customer');
  assert.equal(me.data.access.phase,'LEGACY_PRIMARY_ROLE_ONLY');
  assert.equal(me.data.access.defaultWorkspace,'customer');
  assert.equal(me.data.access.multiRoleEnabled,false);
  assert.deepEqual(me.data.access.workspaces.map(x=>x.key),['customer']);
  assert.equal(me.data.access.workspaces[0].path,'/customer');
  assert.equal(me.data.access.applications.length,3);
  assert.ok(me.data.access.applications.every(x=>x.selfServiceEnabled===false));

  const spoofed = await call('/api/auth/me?role=admin','GET',undefined,login.cookie);
  assert.equal(spoofed.status,200);
  assert.deepEqual(spoofed.data.access.workspaces.map(x=>x.key),['customer']);

  assert.equal((await call('/api/auth/logout','POST',{},login.cookie)).status,200);
  assert.equal((await call('/api/auth/me','GET',undefined,login.cookie)).status,401);
});

test('unapproved agent sees only its onboarding workspace, never admin or customer privileges', async t => {
  const {call} = await fixture(t);
  const registered = await call('/api/auth/register','POST',{
    email:'agent-idv1@example.test',name:'Agent V1',
    password:'Example-Password-123456',role:'agent'
  });
  assert.equal(registered.status,201);
  assert.equal(registered.data.requiresApproval,true);
  const login = await call('/api/auth/login','POST',{
    email:'agent-idv1@example.test',password:'Example-Password-123456'
  });
  assert.equal(login.status,200);
  const me = await call('/api/auth/me','GET',undefined,login.cookie);
  assert.equal(me.status,200);
  assert.deepEqual(me.data.access.workspaces.map(x=>x.key),['agent']);
  assert.equal(me.data.access.workspaces[0].operationalStatus,'REQUIRES_DOMAIN_ELIGIBILITY_CHECK');
  assert.equal(me.data.access.multiRoleEnabled,false);
  assert.equal((await call('/api/admin/users','GET',undefined,login.cookie)).status,403);
  assert.equal((await call('/api/bookings','POST',{},login.cookie)).status,403);
});

test('public registration cannot mint pharmacy or administrative accounts', async t => {
  const {call} = await fixture(t);
  for (const role of ['admin','pharmacy']) {
    const response = await call('/api/auth/register','POST',{
      email:role+'-idv1@example.test',name:'Test Account',
      password:'Example-Password-123456',role
    });
    assert.equal(response.status,400);
  }
});
