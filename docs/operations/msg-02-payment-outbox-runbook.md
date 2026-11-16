# MSG-02: Payment side-effect delivery hardening

## Scope and status

This change only affects the SQLite-backed `payment_side_effect_outbox` worker and the in-database booking-payment confirmation notification. It does **not** change authoritative payment verification, provider signatures, ledger constraints, HTTP contracts, deployment settings, or external gateway semantics.

The runtime is still designed for the documented **single-app-replica** deployment. RabbitMQ and Kafka are not introduced. This is a proposed branch change until CI and review pass.

## Local atomicity and idempotency

Booking-payment confirmation is a local insert into the existing `notifications` table. It now runs through `transactionalHandlers`: the notification insert and the `payment_side_effect_outbox.status='DELIVERED'` update occur in the **same SQLite transaction**.

The notification ID uses `payment-effect:<outbox UUID>`; `INSERT OR IGNORE` protects the existing `notifications.id` primary key from duplicate replays. This means a crash before transaction commit rolls back **both** writes. A replay after commit sees `DELIVERED`; recovery from a row with a previously inserted stable notification ID does not insert another row.

**Boundary:** This is exactly-once local *database effect per stable outbox event ID*, not globally exactly-once messaging. Legacy notifications created before this change used random IDs and cannot be retroactively deduplicated with certainty. External senders and providers must **never** be registered under `transactionalHandlers`, because network I/O within a database transaction is unsafe and cannot be atomically rolled back.

## Lease and retry policy

- Every claim now receives a fresh `lease_owner` token derived from the worker identity and a random UUID. Completion and failure updates are fenced against this exact claim and lease expiry; a stale worker cannot overwrite a new worker's checkpoint.
- `processDue` ignores active, unexpired leases. Expired leases may be reclaimed; external handler implementations remain responsible for idempotent side effects.
- Transient synchronous handler errors become `FAILED` with a retry timestamp. Default limit: **5 total attempts**. At the limit they become `QUARANTINED` and stop retrying automatically.
- Unknown effect types, invalid JSON payloads and unsupported asynchronous handlers become `QUARANTINED` immediately. The legacy implementation silently replaced malformed JSON with an empty object; this fail-open behavior is removed.
- Persisted `last_error` now contains only bounded error **codes**, not arbitrary exception text, to avoid leaking data to the queue.
- `snapshot()` returns aggregate status counts, oldest unresolved creation timestamp, number currently due, and quarantined count. It exposes no payload or customer data and does not create a new HTTP/admin route.

## Operator queries (read-only)

Run on an authorized, backed-up staging copy of the SQLite DB, not directly from an unapproved dashboard:

```sql
SELECT status, COUNT(*) AS jobs
FROM payment_side_effect_outbox
GROUP BY status;

SELECT MIN(created_at) AS oldest_unresolved_created_at
FROM payment_side_effect_outbox
WHERE status IN ('PENDING', 'FAILED', 'PROCESSING');

SELECT id, effect_type, attempts, last_error, created_at, updated_at
FROM payment_side_effect_outbox
WHERE status = 'QUARANTINED'
ORDER BY updated_at DESC
LIMIT 100;
```

Do not print or export full `payload` columns in routine monitoring. Alert if quarantined count is nonzero, oldest unresolved age exceeds the agreed notification delivery SLO, or an integration worker stops progressing. Actual SLO thresholds and alert routing must be agreed against staging measurements; they are not invented here.

## Recovery and safety gate

1. Stop or isolate the consumer before changing any quarantined event; take a verified backup and preserve incident evidence.
2. Identify whether the handler type was removed, the payload is invalid, or an external side effect may already have occurred.
3. For **local notification-only** events, verify the stable notification ID in `notifications` before considering replay. For provider-facing effects, reconcile externally before any re-send.
4. Fix the handler/configuration and use an audited, separately reviewed recovery procedure. This PR intentionally adds **no** public replay endpoint or automatic unquarantine.
5. Run acceptance, migrations, contract checks, security checks, and backup/restore exercises. Do not enable horizontal scaling or merge without review.

## Regression verification

`tests/msg-02-outbox-hardening.test.js` checks live app local-effect delivery, simulated failure before commit, persistent restart and expired lease reclaim, stale lease fencing, unknown-handler quarantine, bounded retry exhaustion and corrupt payload isolation.

There is no schema migration: the `notifications.id` primary key and existing outbox `status` TEXT field are sufficient. Both newly enqueued and pre-existing pending rows remain readable. Reverting this PR restores the prior code; quarantined rows created by this version would require a **manual, audited** recovery decision if reverting to older worker code.
