const {randomUUID} = require('node:crypto');

/**
 * SQLite-backed, at-least-once outbox. Only synchronous, same-database handlers
 * belong in transactionalHandlers; providers and network I/O must use handlers.
 */
function createPaymentSideEffectOutbox({
  db, handlers = {}, transactionalHandlers = {},
  leaseMs = 30000, retryMs = 5000, maxAttempts = 5
}) {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 ||
      !Number.isSafeInteger(leaseMs) || leaseMs < 1 ||
      !Number.isSafeInteger(retryMs) || retryMs < 0) {
    throw new Error('INVALID_SIDE_EFFECT_WORKER_CONFIG');
  }

  function error(code) {
    return Object.assign(new Error(code), {code});
  }

  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (cause) {
      db.exec('ROLLBACK');
      throw cause;
    }
  }

  function get(id) {
    return db.prepare('SELECT * FROM payment_side_effect_outbox WHERE id=?').get(id);
  }

  function enqueueInsideTransaction({eventKey, effectType, payload}) {
    const now = new Date().toISOString();
    db.prepare("INSERT OR IGNORE INTO payment_side_effect_outbox(id,event_key,effect_type,payload,status,attempts,next_attempt_at,created_at,updated_at) VALUES(?,?,?,?, 'PENDING',0,?,?,?)")
      .run(randomUUID(), eventKey, effectType, JSON.stringify(payload || {}), now, now, now);
    return db.prepare('SELECT * FROM payment_side_effect_outbox WHERE event_key=?').get(eventKey);
  }

  function complete(row, token, localHandler) {
    return tx(() => {
      const current = get(row.id);
      if (current?.status !== 'PROCESSING' ||
          current.lease_owner !== token ||
          current.lease_expires_at !== row.lease_expires_at ||
          current.lease_expires_at <= new Date().toISOString()) {
        throw error('SIDE_EFFECT_LEASE_LOST');
      }
      // A transactional local effect and its delivered checkpoint are atomic.
      // Do not register external/network providers as local handlers.
      if (localHandler) {
        const result = localHandler();
        if (result && typeof result.then === 'function') {
          throw error('SIDE_EFFECT_ASYNC_TRANSACTION_HANDLER');
        }
      }
      const update = db.prepare("UPDATE payment_side_effect_outbox SET status='DELIVERED',lease_owner=NULL,lease_expires_at=NULL,last_error=NULL,next_attempt_at=NULL,updated_at=? WHERE id=? AND status='PROCESSING' AND lease_owner=? AND lease_expires_at=?")
        .run(new Date().toISOString(), row.id, token, row.lease_expires_at);
      if (update.changes !== 1) throw error('SIDE_EFFECT_LEASE_LOST');
      return get(row.id);
    });
  }

  function process({id, workerId = randomUUID()}) {
    const now = new Date();
    const nowIso = now.toISOString();
    const leaseExpiresAt = new Date(now.getTime() + leaseMs).toISOString();
    // Unique per-claim token fences stale acknowledgements, even when a worker
    // restarts with a reused workerId. No existing schema change is necessary.
    const token = String(workerId) + ':' + randomUUID();
    const row = tx(() => {
      const current = get(id);
      if (!current) throw error('SIDE_EFFECT_NOT_FOUND');
      if (current.status === 'DELIVERED') return {...current, duplicate: true};
      if (current.status === 'QUARANTINED') return {...current, quarantined: true};
      if (['FAILED', 'PROCESSING'].includes(current.status) &&
          current.attempts >= maxAttempts &&
          (current.status !== 'PROCESSING' || !current.lease_expires_at ||
            current.lease_expires_at <= nowIso)) {
        db.prepare("UPDATE payment_side_effect_outbox SET status='QUARANTINED',lease_owner=NULL,lease_expires_at=NULL,next_attempt_at=NULL,last_error=COALESCE(last_error,'SIDE_EFFECT_MAX_ATTEMPTS'),updated_at=? WHERE id=?")
          .run(nowIso, id);
        return {...get(id), quarantined: true};
      }
      if (current.status === 'PROCESSING' && current.lease_expires_at &&
          current.lease_expires_at > nowIso) {
        throw error('SIDE_EFFECT_LEASED');
      }
      const update = db.prepare("UPDATE payment_side_effect_outbox SET status='PROCESSING',attempts=attempts+1,lease_owner=?,lease_expires_at=?,last_error=NULL,updated_at=? WHERE id=? AND status IN ('PENDING','FAILED','PROCESSING') AND (status!='PROCESSING' OR lease_expires_at IS NULL OR lease_expires_at<=?) AND (next_attempt_at IS NULL OR next_attempt_at<=?)")
        .run(token, leaseExpiresAt, nowIso, id, nowIso, nowIso);
      if (update.changes !== 1) throw error('SIDE_EFFECT_NOT_DUE_OR_LEASED');
      return get(id);
    });
    if (row.duplicate || row.quarantined) return row;

    try {
      let payload;
      try { payload = JSON.parse(row.payload); }
      catch { throw error('SIDE_EFFECT_INVALID_PAYLOAD'); }

      if (Object.hasOwn(transactionalHandlers, row.effect_type)) {
        const handler = transactionalHandlers[row.effect_type];
        if (typeof handler !== 'function') throw error('SIDE_EFFECT_HANDLER_NOT_CONFIGURED');
        if (handler.constructor?.name === 'AsyncFunction') {
          throw error('SIDE_EFFECT_ASYNC_TRANSACTION_HANDLER');
        }
        return complete(row, token, () => handler(payload, row));
      }

      const handler = Object.hasOwn(handlers, row.effect_type) ? handlers[row.effect_type] : null;
      if (typeof handler !== 'function') throw error('SIDE_EFFECT_HANDLER_NOT_CONFIGURED');
      if (handler.constructor?.name === 'AsyncFunction') {
        throw error('SIDE_EFFECT_ASYNC_HANDLER_NOT_SUPPORTED');
      }

      // External effects are intentionally outside the database transaction:
      // they require their own idempotency and authoritative reconciliation.
      const result = handler(payload, row);
      if (result && typeof result.then === 'function') {
        throw error('SIDE_EFFECT_ASYNC_HANDLER_NOT_SUPPORTED');
      }
      return complete(row, token);
    } catch (cause) {
      const permanent = ['SIDE_EFFECT_HANDLER_NOT_CONFIGURED',
        'SIDE_EFFECT_INVALID_PAYLOAD', 'SIDE_EFFECT_ASYNC_TRANSACTION_HANDLER',
        'SIDE_EFFECT_ASYNC_HANDLER_NOT_SUPPORTED'].includes(cause?.code);
      const quarantine = permanent || row.attempts >= maxAttempts;
      const status = quarantine ? 'QUARANTINED' : 'FAILED';
      const code = typeof cause?.code === 'string' &&
        /^[A-Z0-9_]{1,100}$/.test(cause.code)
        ? cause.code : 'SIDE_EFFECT_DELIVERY_FAILED';
      tx(() => {
        const update = db.prepare("UPDATE payment_side_effect_outbox SET status=?,lease_owner=NULL,lease_expires_at=NULL,last_error=?,next_attempt_at=?,updated_at=? WHERE id=? AND status='PROCESSING' AND lease_owner=? AND lease_expires_at=?")
          .run(status, code, quarantine ? null : new Date(Date.now() + retryMs).toISOString(),
            new Date().toISOString(), id, token, row.lease_expires_at);
        if (update.changes !== 1) throw error('SIDE_EFFECT_LEASE_LOST');
      });
      throw cause;
    }
  }

  function processDue({workerId = randomUUID(), limit = 20} = {}) {
    const now = new Date().toISOString();
    const rows = db.prepare("SELECT id FROM payment_side_effect_outbox WHERE status IN ('PENDING','FAILED','PROCESSING') AND (next_attempt_at IS NULL OR next_attempt_at<=?) AND (status!='PROCESSING' OR lease_expires_at IS NULL OR lease_expires_at<=?) ORDER BY created_at LIMIT ?")
      .all(now, now, limit);
    const results = [];
    for (const row of rows) {
      try { results.push(process({id: row.id, workerId})); }
      catch (cause) {
        results.push({id: row.id, error: cause?.code || 'SIDE_EFFECT_DELIVERY_FAILED'});
      }
    }
    return results;
  }

  function snapshot() {
    const now = new Date().toISOString();
    const counts = Object.fromEntries(
      db.prepare('SELECT status,COUNT(*) AS count FROM payment_side_effect_outbox GROUP BY status')
        .all().map(row => [row.status, row.count])
    );
    const oldest = db.prepare("SELECT MIN(created_at) AS since FROM payment_side_effect_outbox WHERE status IN ('PENDING','FAILED','PROCESSING')").get();
    return {
      counts,
      oldestUnresolvedAt: oldest?.since || null,
      due: db.prepare("SELECT COUNT(*) AS count FROM payment_side_effect_outbox WHERE status IN ('PENDING','FAILED','PROCESSING') AND (next_attempt_at IS NULL OR next_attempt_at<=?) AND (status!='PROCESSING' OR lease_expires_at IS NULL OR lease_expires_at<=?)").get(now, now).count,
      quarantined: counts.QUARANTINED || 0
    };
  }

  return {enqueueInsideTransaction, process, processDue, snapshot};
}

module.exports = {createPaymentSideEffectOutbox};
