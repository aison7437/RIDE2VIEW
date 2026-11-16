# ADR-0001: Durable messaging and broker adoption for Ride2View

- **Status:** Proposed (MSG-01; review and CI required)
- **Date:** 2026-11-16
- **Scope:** First-customer launch and staged evolution of asynchronous execution

## Verified implementation

The default branch uses Node.js and SQLite (server/store.js), not PostgreSQL. The staging configuration (deploy/staging/compose.yml) persists a single SQLite database, and docs/v10-b-staging-acceptance.md requires one application replica. Distributed SQLite and process-local controls have not been validated.

Existing durable mechanisms are payment_initiation_outbox, payment_side_effect_outbox, provider_callback_inbox, integration_jobs, and dispatch_assignments. Worker entry points are server/payments/*-runtime.js and server/operations/jobs.js. Payment, dispatch and reservation decisions are made by their server authorities, not by a messaging broker.

No RabbitMQ or Kafka client, deployment or broker-specific messaging API was identified in the audited default branch.

## Decision

**Keep SQLite-backed durable outbox, inbox and job processing for first-customer launch. Do not deploy RabbitMQ or Kafka in MSG-01.**

A later broker-neutral event envelope should describe a stable event_id/deduplication key, event_type, schema_version, aggregate identity and version, occurred_at, correlation_id and a minimal privacy-reviewed payload. This is a **design convention only**: do not change live event formats, HTTP routes, database schemas or credentials in this PR.

A single database commit is authoritative for the business transition and its outbox entry. Publishing and external delivery occur after the commit. Assume **at-least-once delivery** and idempotent consumers; do not claim exactly-once financial effects merely because a broker supports transactional features.

## RabbitMQ adoption gates

Prefer RabbitMQ quorum queues for operational task distribution only after all of the following are demonstrated:

1. A supported long-running worker deployment and private broker topology exist, with TLS, least-privilege users, bounded resources, publisher confirms, acknowledgements, dead letters and recovery procedures.
2. The authoritative datastore and workers support validated shared concurrent access. Before horizontally scaling the service, replace or independently validate the unsupported multi-replica SQLite topology; PostgreSQL is a future candidate, not an existing component.
3. A publisher reads committed outbox events, confirms durable broker delivery before checkpointing, and safely deduplicates on replay after an ambiguous publish.
4. Consumers commit idempotent domain state before acknowledging delivery. Bounded retries and dead-letter isolation are explicit. Payment/refund provider ambiguity continues to require authoritative lookup/reconciliation rather than a blind re-send.
5. Failure tests cover unavailable broker, worker crash, duplicate event, callback replay, stale lease, network partition, restored worker, double-charge prevention and dispatch exclusion.
6. Operational monitoring covers oldest pending event age, lag, failed/review counts, dead-letter count, re-delivery, worker health and reconciliation backlog.

The database remains the authority for bookings, payment intents, ledger entries, reservations and dispatch assignments.

## Kafka adoption gates

Kafka should be considered independently for retained replayable event streams, multiple analytics/fraud subscribers, CDC or complex projections, when measurable throughput/retention requirements justify operational cost. No unmeasured event volume forecast should be treated as justification.

## Known gaps / review notes

- A broker does not solve SQLite horizontal-scaling or per-process coordination by itself.
- The payment_side_effect_outbox worker executes the side-effect handler before marking the record DELIVERED. A crash in between can replay the handler. The current customer notification handler uses a fresh notification ID, so replay could duplicate the message. Financial idempotency does not imply notification exactly-once.
- Unknown side-effect handler types currently fail after lease acquisition; a poison-event quarantine/alert strategy is needed.
- Synthetic test-provider evidence does not prove production connectivity or real M-Pesa settlement.
- Queue health telemetry, restore drills and operational SLOs are still needed.

These gaps are explicit future engineering work, not permission to activate a broker.

## Sequencing

- **MSG-01 (this PR):** This ADR plus deterministic outbox atomicity, lease, deduplication and retry regression tests. Zero production behavioral change.
- **MSG-02:** Harden notification idempotency and poison-event handling; add worker health and backlog alerting.
- **MSG-03:** Complete single-replica sandbox acceptance, backup/restore and measured latency/lag baselines.
- **MSG-04 (conditional):** Benchmark scaling requirements and only then develop an independent worker and RabbitMQ adapter with explicit rollout/rollback.
- **MSG-05 (conditional):** Evaluate Kafka for proven replay/analytics needs.

## Safety and rollback

This PR introduces no runtime settings, schema migration, external dependencies, broker, secrets, provider integration, production activation or changed HTTP behavior. Reverting documentation and tests restores the prior repository state. Merge remains gated on required CI and review.
