'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createApp} = require('../server/app');
const {validateContract} = require('../scripts/check-api-contract');

test('API-01 source inventory and OpenAPI specification agree', () => {
  const result = validateContract();
  assert.ok(result.routes > 100);
  assert.ok(result.operations >= result.routes);
});

test('API-01 public API, guards and callback ingress retain existing behavior', async t => {
  const app = createApp({
    dbPath: ':memory:',
    startOperationsRuntime: false,
    startSideEffectRuntime: false,
    startProviderCallbackRuntime: false,
    startPaymentInitiationRuntime: false
  });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => app.close());
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  async function call(path, method = 'GET', body) {
    const response = await fetch(origin + path, {
      method,
      headers: body === undefined ? {} : {'Content-Type':'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return {status:response.status, payload:await response.json()};
  }
  let response = await call('/api/health/live');
  assert.equal(response.status, 200);
  assert.equal(response.payload.status, 'ok');

  response = await call('/api/health/ready');
  assert.equal(response.status, 200);
  assert.equal(response.payload.status, 'ready');

  response = await call('/api/config');
  assert.equal(response.status, 200);
  assert.equal(response.payload.tiers.general, 650);

  response = await call('/api/listings');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.payload.listings));

  response = await call('/api/auth/me');
  assert.equal(response.status, 401);

  response = await call('/api/bookings', 'POST', {});
  assert.equal(response.status, 401); // A signed-in customer receives the legacy 409 guard.

  response = await call('/api/search', 'POST', {});
  assert.equal(response.status, 400);

  response = await call('/api/provider-callbacks/unconfigured', 'POST', {});
  assert.equal(response.status, 404); // Never accepts an unconfigured payment provider.

  response = await call('/api/operations/payment-events');
  assert.equal(response.status, 401); // Admin-only GET; signed POST uses HMAC verification.

  response = await call('/api/definitely-not-a-route');
  assert.equal(response.status, 404);
});
