# V10-B staging readiness and operational acceptance

## Current gate
Repository acceptance uses synthetic customers and a synthetic payment gateway. It does not prove an external sandbox payment or a deployed staging release. EV development remains on hold.

`npm ci`, `npx playwright install --with-deps chromium`, then `npm run test:acceptance` runs syntax checks, all authority/HTTP tests, Lifestyle Agent scenarios and all browser suites. Logs and a SHA-associated report are written to `acceptance-evidence/` and uploaded by CI even when a gate fails. A modified working tree is explicitly recorded. Local success never sets the deployed staging gate to PASS.

Coverage includes provider-paid property discovery/reservation/driver assignment/completion; signed callbacks and replay rejection; driver rejection and replacement offers; expiry, cancellation, refunds, interrupted callbacks and ambiguous provider-send recovery; customer/driver/admin booking state and agent viewing state. The first browser viewing now uses a signed synthetic provider event instead of manual administrator verification. Later browser scenarios retain manual verification regression coverage.

## Isolated HTTPS deployment
Use a dedicated staging host and data volume, never a production database. Install Docker Compose on the staging host. Point its DNS hostname at that host and allow inbound ports 80/443. Restrict access at the hosting firewall/VPN to testers and the sandbox callback service. Administrator registration is forbidden; bootstrap an administrator with a unique secret and restrict account access.

Copy `deploy/staging/env.example` to `deploy/staging/.env.staging` on the host. Set ADMIN_EMAIL and a strong ADMIN_PASSWORD in that untracked file. Configure the reviewed gateway with sandbox-only credentials, a callback secret of at least 32 characters, and explicit `payments,refunds` capabilities. The gateway must implement the contract in `server/operations/providers.js`: authenticated HTTPS `/v1/jobs` submission and lookup, stable job idempotency, collection acknowledgement and refund outcomes. This gateway is an external integration, not a direct Safaricom sandbox supplied by this repository. Leave capabilities disabled until it exists.

From the repository root:

```sh
export STAGING_HOST=staging.your-domain.example
docker compose -f deploy/staging/compose.yml config --quiet
docker compose -f deploy/staging/compose.yml up -d --build
STAGING_URL=https://staging.your-domain.example npm run check:staging
```

Caddy obtains and renews HTTPS certificates. Only ingress ports are published; the application runs as a non-root user, with dropped capabilities, persistent SQLite data and readiness checks. Run one application replica: SQLite and the per-process limiter have not been validated for distributed deployment. Retain container error logs and configure host monitoring for readiness failures, 5xx spikes and payment recovery queues. Protect the environment file on the host (`chmod 600`).

## External acceptance evidence required
On HTTPS staging, create synthetic customer, verified agent/property/slot and verified driver accounts. Use the interfaces to discover/request/accept a viewing. Initiate collection through the configured sandbox gateway; preserve the provider request and event references, and confirm the authenticated callback establishes the authoritative paid state without manual verification. Offer to a driver, reject and reoffer, accept and complete. Capture matching customer, driver, agent and operations statuses. Repeat duplicate callback, expired hold, cancellation and provider-confirmed refund cases. Interrupt provider delivery and verify lookup/replay without a second financial transfer. Reconcile gateway records with the ledger. Record test time, deployed SHA, provider references, expected/actual outcomes and incident resolution without credentials or personal data.

## Backup and rollback drill
Before deployment, run the existing SQLite online backup from the app container to an isolated backup location using `node scripts/backup-db.js /app/data/backups/pre-release.sqlite`. Copy the backup off the host and verify it using `scripts/check-db.js`. Retain the previous exact Git SHA/image and environment configuration. On staging only, stop the application before replacing database files; remove stale WAL/SHM companions and restore the verified snapshot with ownership readable by uid 1000. Check out the previous SHA, rebuild and restart, then rerun HTTPS probes and confirm a synthetic pre-release record persists. A database rollback can discard later transactions, so keep users out during the drill. Repeat deployment of the candidate SHA and acceptance. Never automate production database rollback from this runbook.

## Go/no-go
GO requires passing exact-commit CI, deployed HTTPS probes, actual sandbox provider evidence, all operational cases and the backup/rollback drill, with no unresolved high-severity defects. Missing external credentials, hosting, monitoring or evidence means NO-GO. Repository tests alone do not authorize real customer payments.
