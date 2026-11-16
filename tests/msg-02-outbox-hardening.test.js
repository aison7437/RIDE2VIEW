const test = require('node:test');
const assert = require('node:assert/strict');
const {mkdtempSync, rmSync} = require('node:fs');
const {join} = require('node:path');
const {tmpdir} = require('node:os');
const {openStore} = require('../server/store');
const {createApp} = require('../server/app');
const {createPaymentSideEffectOutbox} = require('../server/payments/side-effect-outbox');

function enqueue(outbox, eventKey, effectType = 'NOTICE', payload = {}) {
  return outbox.enqueueInsideTransaction({eventKey, effectType, payload});
}

test('MSG-02: application payment notice writes once and commits with its outbox acknowledgement', async () => {
  const app = createApp({dbPath: ':memory:', startOperationsRuntime: false,
    startSideEffectRuntime: false, startProviderCallbackRuntime: false,
    startPaymentInitiationRuntime: false});
  try {
    const db = app.db;
    db.prepare("INSERT INTO users(id,email,name,password,role,verified) VALUES('c','c@msg02.test','Customer','x','customer',1)").run();
    const event = enqueue(app.sideEffects, 'booking-payment:p:verified',
      'BOOKING_PAYMENT_VERIFIED', {customerId: 'c', paymentId: 'p'});
    const completed = app.sideEffects.process({id: event.id, workerId: 'worker-one'});
    assert.equal(completed.status, 'DELIVERED');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n, 1);
    assert.equal(db.prepare('SELECT id FROM notifications').get().id, 'payment-effect:' + event.id);
    const duplicate = enqueue(app.sideEffects, 'booking-payment:p:verified',
      'BOOKING_PAYMENT_VERIFIED', {customerId: 'c', paymentId: 'p'});
    assert.equal(duplicate.id, event.id);
    assert.equal(app.sideEffects.process({id: event.id, workerId: 'worker-two'}).duplicate, true);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n, 1);
    assert.equal(app.sideEffects.snapshot().counts.DELIVERED, 1);
  } finally {
    await app.close();
  }
});

test('MSG-02: local notification transaction rolls back if a crash is injected before acknowledgement', () => {
  const db = openStore(':memory:');
  let abort = true;
  db.prepare("INSERT INTO users(id,email,name,password,role,verified) VALUES('c','crash@msg02.test','Customer','x','customer',1)").run();
  const outbox = createPaymentSideEffectOutbox({db, retryMs: 1000,
    transactionalHandlers: {NOTICE: (_payload, row) => {
      db.prepare('INSERT OR IGNORE INTO notifications(id,user_id,message,created_at) VALUES(?,?,?,?)')
        .run('payment-effect:' + row.id, 'c', 'Payment confirmed', new Date().toISOString());
      if (abort) throw new Error('simulated worker termination before commit');
    }}
  });
  try {
    const event = enqueue(outbox, 'payment-crash');
    assert.throws(() => outbox.process({id: event.id, workerId: 'crashed'}),
      /simulated worker termination/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n, 0);
    assert.equal(db.prepare('SELECT status FROM payment_side_effect_outbox WHERE id=?').get(event.id).status, 'FAILED');
    abort = false;
    db.prepare('UPDATE payment_side_effect_outbox SET next_attempt_at=? WHERE id=?')
      .run('2000-01-01T00:00:00.000Z', event.id);
    assert.equal(outbox.processDue({workerId: 'recovered'})[0].status, 'DELIVERED');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n, 1);
    assert.equal(outbox.process({id: event.id}).duplicate, true);
  } finally {
    db.close();
  }
});

test('MSG-02: durable event survives connection restart and an expired lease is recovered', () => {
  const dir = mkdtempSync(join(tmpdir(), 'r2v-msg02-'));
  const file = join(dir, 'db.sqlite');
  let db;
  try {
    db = openStore(file);
    const before = createPaymentSideEffectOutbox({db, handlers: {NOTICE() {}}});
    const event = enqueue(before, 'restartable');
    db.prepare("UPDATE payment_side_effect_outbox SET status='PROCESSING',lease_owner='abandoned',lease_expires_at=? WHERE id=?")
      .run('2000-01-01T00:00:00.000Z', event.id);
    db.close();
    db = openStore(file);
    let processed = 0;
    const after = createPaymentSideEffectOutbox({db, handlers: {NOTICE() {processed++;}}});
    assert.equal(after.processDue({workerId: 'fresh-process'})[0].status, 'DELIVERED');
    assert.equal(processed, 1);
    assert.equal(after.process({id: event.id}).duplicate, true);
  } finally {
    if (db?.isOpen) db.close();
    rmSync(dir, {recursive: true, force: true});
  }
});

test('MSG-02: an active lease rejects competing workers, and a stale completion is fenced', () => {
  const db = openStore(':memory:');
  const outbox = createPaymentSideEffectOutbox({db, handlers: {
    NOTICE(_payload, row) {
      db.prepare('UPDATE payment_side_effect_outbox SET lease_owner=? WHERE id=?')
        .run('newer-worker-lease', row.id);
    }
  }});
  try {
    const event = enqueue(outbox, 'fencing');
    db.prepare("UPDATE payment_side_effect_outbox SET status='PROCESSING',lease_owner='live',lease_expires_at=? WHERE id=?")
      .run('2099-01-01T00:00:00.000Z', event.id);
    assert.throws(() => outbox.process({id: event.id, workerId: 'other'}),
      err => err.code === 'SIDE_EFFECT_LEASED');
    db.prepare('UPDATE payment_side_effect_outbox SET lease_expires_at=? WHERE id=?')
      .run('2000-01-01T00:00:00.000Z', event.id);
    assert.throws(() => outbox.process({id: event.id, workerId: 'recovered'}),
      err => err.code === 'SIDE_EFFECT_LEASE_LOST');
    assert.equal(db.prepare('SELECT status FROM payment_side_effect_outbox WHERE id=?').get(event.id).status, 'PROCESSING');
    assert.equal(db.prepare('SELECT lease_owner FROM payment_side_effect_outbox WHERE id=?').get(event.id).lease_owner, 'newer-worker-lease');
  } finally {
    db.close();
  }
});

test('MSG-02: unknown handler quarantines immediately without repeatedly leasing the event', () => {
  const db = openStore(':memory:');
  const outbox = createPaymentSideEffectOutbox({db, handlers: {}});
  try {
    const event = enqueue(outbox, 'unregistered', 'NONEXISTENT');
    const outcome = outbox.processDue();
    assert.equal(outcome.length, 1);
    assert.equal(outcome[0].error, 'SIDE_EFFECT_HANDLER_NOT_CONFIGURED');
    const row = db.prepare('SELECT * FROM payment_side_effect_outbox WHERE id=?').get(event.id);
    assert.equal(row.status, 'QUARANTINED');
    assert.equal(row.attempts, 1);
    assert.equal(row.lease_owner, null);
    assert.equal(row.next_attempt_at, null);
    assert.deepEqual(outbox.processDue(), []);
    assert.equal(outbox.snapshot().quarantined, 1);
    assert.equal(outbox.snapshot().due, 0);
  } finally {
    db.close();
  }
});

test('MSG-02: permanently failing handler stops after configured attempt budget', () => {
  const db = openStore(':memory:');
  let delivered = 0;
  const outbox = createPaymentSideEffectOutbox({db, retryMs: 1000, maxAttempts: 2,
    handlers: {NOTICE() {delivered++; throw new Error('synthetic failure');}}
  });
  try {
    const event = enqueue(outbox, 'retry-budget');
    assert.equal(outbox.processDue()[0].error, 'SIDE_EFFECT_DELIVERY_FAILED');
    db.prepare('UPDATE payment_side_effect_outbox SET next_attempt_at=? WHERE id=?')
      .run('2000-01-01T00:00:00.000Z', event.id);
    assert.equal(outbox.processDue()[0].error, 'SIDE_EFFECT_DELIVERY_FAILED');
    assert.equal(delivered, 2);
    const row = db.prepare('SELECT status,attempts,next_attempt_at FROM payment_side_effect_outbox WHERE id=?').get(event.id);
    assert.equal(row.status, 'QUARANTINED');
    assert.equal(row.attempts, 2);
    assert.equal(row.next_attempt_at, null);
    assert.deepEqual(outbox.processDue(), []);
    assert.equal(delivered, 2);
  } finally {
    db.close();
  }
});

test('MSG-02: corrupt payload is quarantined rather than silently converting to an empty object', () => {
  const db = openStore(':memory:');
  const outbox = createPaymentSideEffectOutbox({db, handlers: {NOTICE() {
    assert.fail('corrupted payload must never reach a handler');
  }}});
  try {
    const event = enqueue(outbox, 'corrupt-json');
    db.prepare('UPDATE payment_side_effect_outbox SET payload=? WHERE id=?')
      .run('{invalid', event.id);
    assert.equal(outbox.processDue()[0].error, 'SIDE_EFFECT_INVALID_PAYLOAD');
    assert.equal(db.prepare('SELECT status FROM payment_side_effect_outbox WHERE id=?').get(event.id).status, 'QUARANTINED');
  } finally {
    db.close();
  }
});

test('MSG-02: recovery of a pre-applied local event cannot duplicate its stable notification', async () => {
  const app = createApp({dbPath: ':memory:', startOperationsRuntime: false,
    startSideEffectRuntime: false, startProviderCallbackRuntime: false,
    startPaymentInitiationRuntime: false});
  try {
    const db = app.db;
    db.prepare("INSERT INTO users(id,email,name,password,role,verified) VALUES('c','prior@msg02.test','Customer','x','customer',1)").run();
    const event = enqueue(app.sideEffects, 'already-notified', 'BOOKING_PAYMENT_VERIFIED',
      {customerId: 'c', paymentId: 'p'});
    db.prepare('INSERT INTO notifications(id,user_id,message,created_at) VALUES(?,?,?,?)')
      .run('payment-effect:' + event.id, 'c',
        'Payment verified. Viewing confirmed; driver assignment pending.', new Date().toISOString());
    db.prepare("UPDATE payment_side_effect_outbox SET status='PROCESSING',lease_owner='abandoned',lease_expires_at=? WHERE id=?")
      .run('2000-01-01T00:00:00.000Z', event.id);
    assert.equal(app.sideEffects.processDue({workerId: 'replay'})[0].status, 'DELIVERED');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n, 1);
  } finally {
    await app.close();
  }
});

test('MSG-02: nontransactional handlers execute outside SQLite transactions', () => {
  const db = openStore(':memory:');
  let ran = 0;
  const outbox = createPaymentSideEffectOutbox({db, handlers: {
    NOTICE() {
      assert.equal(db.isTransaction, false);
      ran++;
    }
  }});
  try {
    const event = enqueue(outbox, 'external-boundary');
    assert.equal(outbox.process({id: event.id}).status, 'DELIVERED');
    assert.equal(ran, 1);
  } finally {
    db.close();
  }
});

test('MSG-02: exhausted crashed-in-flight job is quarantined without a sixth attempt', () => {
  const db = openStore(':memory:');
  let deliveries = 0;
  const outbox = createPaymentSideEffectOutbox({db, maxAttempts: 2,
    handlers: {NOTICE() { deliveries++; }}
  });
  try {
    const event = enqueue(outbox, 'expired-max-attempts');
    db.prepare("UPDATE payment_side_effect_outbox SET status='PROCESSING',attempts=2,lease_owner='dead',lease_expires_at=? WHERE id=?")
      .run('2000-01-01T00:00:00.000Z', event.id);
    const result = outbox.processDue({workerId: 'survivor'});
    assert.equal(result.length, 1);
    assert.equal(result[0].status, 'QUARANTINED');
    assert.equal(deliveries, 0);
    const state = db.prepare('SELECT status,attempts FROM payment_side_effect_outbox WHERE id=?').get(event.id);
    assert.equal(state.status, 'QUARANTINED');
    assert.equal(state.attempts, 2);
  } finally {
    db.close();
  }
});

test('MSG-02: accidentally async provider and local handlers are rejected without invocation', () => {
  const db = openStore(':memory:');
  let began = 0;
  const outbox = createPaymentSideEffectOutbox({db,
    handlers: {REMOTE: async () => {began++;}},
    transactionalHandlers: {LOCAL: async () => {began++;}}
  });
  try {
    const remote = enqueue(outbox, 'async-provider', 'REMOTE');
    const local = enqueue(outbox, 'async-local', 'LOCAL');
    const results = outbox.processDue();
    assert.deepEqual(
      new Set(results.map(x => x.error)),
      new Set(['SIDE_EFFECT_ASYNC_HANDLER_NOT_SUPPORTED',
        'SIDE_EFFECT_ASYNC_TRANSACTION_HANDLER'])
    );
    assert.equal(began, 0);
    for (const e of [remote, local]) {
      assert.equal(db.prepare('SELECT status FROM payment_side_effect_outbox WHERE id=?').get(e.id).status, 'QUARANTINED');
    }
  } finally {
    db.close();
  }
});
