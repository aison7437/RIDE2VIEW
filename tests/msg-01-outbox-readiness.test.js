const test = require('node:test');
const assert = require('node:assert/strict');
const {openStore} = require('../server/store');
const {createPaymentSideEffectOutbox} = require('../server/payments/side-effect-outbox');

function fixture(options = {}) {
  const db = openStore(':memory:');
  const outbox = createPaymentSideEffectOutbox({db, ...options});
  return {db, outbox};
}

test('MSG-01: an outbox record rolls back with its authoritative database transaction', () => {
  const {db, outbox} = fixture();
  try {
    db.exec('BEGIN IMMEDIATE');
    db.prepare("INSERT INTO audit(actor_id,action,entity_id,details,created_at) VALUES(NULL,'test.commit','booking-1','{}',?)").run(new Date().toISOString());
    outbox.enqueueInsideTransaction({
      eventKey: 'booking-1:payment-verified',
      effectType: 'NOTICE',
      payload: {bookingId: 'booking-1'}
    });
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM payment_side_effect_outbox').get().count, 1);
    db.exec('ROLLBACK');
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM payment_side_effect_outbox').get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM audit WHERE entity_id='booking-1'").get().count, 0);
  } finally {
    db.close();
  }
});

test('MSG-01: committed event keys deduplicate and an acknowledged handler is not delivered again', () => {
  const handled = [];
  const {db, outbox} = fixture({
    handlers: {
      NOTICE(payload, event) {
        handled.push({payload, key: event.event_key});
      }
    }
  });
  try {
    db.exec('BEGIN IMMEDIATE');
    const first = outbox.enqueueInsideTransaction({
      eventKey: 'booking-2:payment-verified',
      effectType: 'NOTICE',
      payload: {bookingId: 'booking-2'}
    });
    db.exec('COMMIT');
    const duplicate = outbox.enqueueInsideTransaction({
      eventKey: 'booking-2:payment-verified',
      effectType: 'NOTICE',
      payload: {bookingId: 'booking-2'}
    });
    assert.equal(duplicate.id, first.id);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM payment_side_effect_outbox').get().count, 1);
    const delivered = outbox.process({id: first.id, workerId: 'worker-1'});
    assert.equal(delivered.status, 'DELIVERED');
    assert.equal(outbox.process({id: first.id, workerId: 'worker-2'}).duplicate, true);
    assert.deepEqual(handled, [{
      payload: {bookingId: 'booking-2'},
      key: 'booking-2:payment-verified'
    }]);
  } finally {
    db.close();
  }
});

test('MSG-01: handler failures remain durable and retry only when the event is due', () => {
  let attempts = 0;
  const {db, outbox} = fixture({
    retryMs: 60000,
    handlers: {
      NOTICE() {
        attempts++;
        if (attempts === 1) throw new Error('simulated transient downstream failure');
      }
    }
  });
  try {
    const event = outbox.enqueueInsideTransaction({
      eventKey: 'booking-3:payment-verified',
      effectType: 'NOTICE',
      payload: {}
    });
    assert.throws(
      () => outbox.process({id: event.id, workerId: 'worker-1'}),
      /simulated transient downstream failure/
    );
    const failed = db.prepare('SELECT * FROM payment_side_effect_outbox WHERE id=?').get(event.id);
    assert.equal(failed.status, 'FAILED');
    assert.equal(failed.attempts, 1);
    assert.ok(failed.next_attempt_at);
    assert.equal(failed.lease_owner, null);
    assert.deepEqual(outbox.processDue({workerId: 'worker-2'}), []);
    db.prepare('UPDATE payment_side_effect_outbox SET next_attempt_at=? WHERE id=?')
      .run('2000-01-01T00:00:00.000Z', event.id);
    const recovered = outbox.processDue({workerId: 'worker-2'});
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].status, 'DELIVERED');
    assert.equal(attempts, 2);
    assert.equal(db.prepare('SELECT attempts FROM payment_side_effect_outbox WHERE id=?').get(event.id).attempts, 2);
  } finally {
    db.close();
  }
});

test('MSG-01: an active leased event is fenced and an expired lease can be recovered', () => {
  let deliveryCount = 0;
  const {db, outbox} = fixture({
    handlers: {NOTICE() {deliveryCount++;}}
  });
  try {
    const event = outbox.enqueueInsideTransaction({
      eventKey: 'booking-4:payment-verified',
      effectType: 'NOTICE',
      payload: {}
    });
    db.prepare("UPDATE payment_side_effect_outbox SET status='PROCESSING',lease_owner='worker-A',lease_expires_at=? WHERE id=?")
      .run('2099-01-01T00:00:00.000Z', event.id);
    assert.throws(
      () => outbox.process({id: event.id, workerId: 'worker-B'}),
      error => error.code === 'SIDE_EFFECT_LEASED'
    );
    assert.deepEqual(outbox.processDue({workerId: 'worker-B'}), []);
    assert.equal(deliveryCount, 0);
    db.prepare('UPDATE payment_side_effect_outbox SET lease_expires_at=? WHERE id=?')
      .run('2000-01-01T00:00:00.000Z', event.id);
    const recovered = outbox.processDue({workerId: 'worker-B'});
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].status, 'DELIVERED');
    assert.equal(deliveryCount, 1);
  } finally {
    db.close();
  }
});
