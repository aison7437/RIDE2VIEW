# API-03 — Shadow contract observability (opt-in)

## Purpose

API-03 supplies **advisory**, source-linked request/response contract mismatch detection for the **24 operations** marked `x-r2v-contract-level: typed-core-v2` in `docs/api/openapi.json`. It does not change the OpenAPI contract itself, add routes, enforce request validation, update storage, or change financial authority. It reuses existing request correlation IDs from `X-Request-ID`.

The monitor is **disabled by default**, including production unless an operator explicitly enables it. No external vendor or tracing collector is configured in this milestone.

## Enable in a staging environment

After ensuring the staging system has non-sensitive fixtures and an approved log-retention policy, set:

```shell
R2V_API_CONTRACT_OBSERVE=shadow
```

The monitor can also be enabled per `createApp({apiContractObserve:true,apiContractLogger:{warn(line){ /* existing log sink */ }}})` for deterministic local test fixtures. `false` explicitly disables it even if the environment variable is set. **Never place secrets in the logger.**

## Behavior

- Only typed-core OpenAPI operations with recognized successful (`2xx`) response schemas are observed. Unauthorized, invalid, non-2xx, undocumented and untyped operations are intentionally skipped rather than assumed safe.
- Request/response inspection occurs in memory during the existing JSON send path; the *serialized event* never contains raw request or response bodies, credentials, cookies, authorization headers, query strings, concrete route parameters, or any unknown JSON key supplied by a user.
- Warning events contain `event`, timestamp, request correlation ID, OpenAPI operation ID, normalized route template, HTTP method/status, approximate duration and at most five diagnostic paths and codes. For example, `/api/payments/{id}/verify` rather than a concrete payment identifier.
- The monitor only emits a warning on a mismatch. A mismatch does not change the status, body, cookie, ledger, authorization outcome, or callback behavior. Observer exceptions and logging failures are swallowed by the optional monitor.
- `app.apiContractObserver.snapshot()` exposes process-local bounded counters for monitored method/status combinations (checked vs violations). Counters reset on process restart; no public metrics endpoint or cross-replica aggregation is exposed.

## Operator rollout and limits

1. Keep disabled on production while validating the API-01 and API-02 PR dependencies.
2. Turn on shadow mode only in a reviewed staging environment, inspect *metadata-only* warnings and test whether the schemas reflect the existing server outputs.
3. Resolve false positives in the documentation/fixtures, retaining backward compatibility. Route or runtime policy changes require separate review.
4. Before considering enforcement mode, define response schema maturity thresholds, telemetry retention/access, multi-instance aggregation, provider callback exclusions, and migration/rollback criteria. Enforcement is **not** implemented by API-03.

**Do not interpret the absence of a warning as proof of security or full API conformance.** Schema coverage is selective and deliberately permissive, with `additionalProperties: true` retained on many data structures. Monetary reconciliation, OTP, roles and reservations are enforced by the existing authority code, not by this monitor. Production provider integrations and deployed staging acceptance require independent verification.

## Verification

- `npm run check:api` — API-01/02 inventory and typed schema invariants.
- `npm test` — includes `tests/api-shadow-observability.test.js` for opt-in validation, stable route templates, metadata-only logs, logger failure isolation, disabled default and live HTTP behavior.
- `npm run test:acceptance` — existing check, unit/integration, agent, and browser suites.
