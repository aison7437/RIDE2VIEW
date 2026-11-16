# SEC-04 — Atomic, privacy-conscious authentication quota observations

## Scope and current production posture

This milestone adds **opt-in, observation-only** per-destination quota counters for Ride2View's verified SMS/email authentication challenges. It does **not** replace the existing login throttle, API throttle, per-destination OTP resend/attempt rules, or signed payment-provider callback handling.

Existing backend protections reviewed:
- `server/security.js` API quota: in-memory `Map` keyed by TCP peer address.
- `server/app.js` password-login throttle: in-memory TCP peer address `Map`.
- `server/auth/onboarding.js`: SQLite-backed OTP challenges with per-destination 60-second resend interval, 3 challenges/hour, five verification attempts and expiring codes.

None of the TCP socket-based controls is a reliable per-person or globally distributed quota. The Vercel frontend and premium auth proxy can have different source IP identities from their customers. Shared Kenyan carrier NATs should not result in account suspension.

## New implementation

`server/atomic-auth-quota.js` stores **only HMAC-SHA256 digests** of normalized destination + scope + time window. A SQLite `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` atomically increments a count, allowing **separate processes with coherent access to the same SQLite file** to share quota observations. It does not require external packages.

- Enabled **only** when `R2V_AUTH_QUOTA_OBSERVE=true` (or `createApp({observeAuthQuotas:true})`). Default is disabled.
- Uses `R2V_AUTH_QUOTA_SECRET` if supplied, otherwise the existing server-side OTP secret; both must be >=32 bytes. Provision a distinct secret in production where feasible; do not put keys in Git or frontend environments.
- Observes normalized destinations at `startChallenge` for both phone and email, with an initial shadow threshold of three requests/hour.
- Emits one `auth_quota_shadow_exceeded` event at the first crossing of each 1-hour window. Events exclude raw phone numbers, emails, cookies, IP addresses, authentication codes and request bodies.
- The policy is always `OBSERVE_ONLY`. Existing OTP 429 decisions still originate in the pre-existing `rateDestination` policy.
- The observer fails open if the database is unavailable and ignores telemetry emission failures. Other application DB errors retain their existing behavior.
- The feature creates `security_auth_quota_windows` and an expiry index at first opt-in. It periodically prunes expired keys and supports explicit `pruneExpired()` maintenance.
- Rows should be purged as part of a defined data-retention schedule. HMAC digests are pseudonymous, not anonymous; apply Kenyan privacy/data minimization requirements.

## Limitations and non-goals

**SQLite is not an Internet-scale distributed limiter.** Atomicity spans independent SQLite connections/processes using the *same lock-coherent database file*. It does not span separately deployed Vercel functions, isolated hosts, independent replicas, or network filesystems with unreliable locks. Do not assume global rate limits unless a supported shared backend (e.g. Redis with atomic commands and controlled outages) is actually deployed and tested.

The observation scope is valid SMS/email challenge initiation after normalization, not arbitrary failed inputs, password login, untrusted forwarded IP, customer accounts, bot scoring, or payment callbacks. This phase intentionally avoids punishment of shared mobile-network traffic or a new payment risk dependency.

## Acceptance gates

1. Run Node 24 `npm test`, `npm run check`, `npm run check:api`, existing browser/operational acceptance, and CodeQL.
2. Verify process-shared SQLite behavior, HMAC-only persistence, single threshold crossing event, window reset, expired-row pruning, and opt-in HTTP behavior using the new tests.
3. Confirm the *actual* backend hosting and whether it uses a single SQLite database file, independent replicas, or another durable store.
4. In staging only, set `R2V_AUTH_QUOTA_OBSERVE=true` with a dedicated 32+ byte `R2V_AUTH_QUOTA_SECRET`. Compare observed events against existing OTP 429 results for legitimate users.
5. Establish a separate atomic shared rate-limit store (when multiple hosts exist), per-account constraints, safe proxy attribution and measurable false-positive thresholds before considering challenge/deny changes.
6. Do not merge without required checks; do not enable production enforcement as part of this milestone.

Related PRs: SEC-01 #110 and SEC-03 #111 remain separate. SEC-04 intentionally starts from the last verified `main` commit so it can be reviewed independently. Resolve and retest any integration conflicts before merge.
