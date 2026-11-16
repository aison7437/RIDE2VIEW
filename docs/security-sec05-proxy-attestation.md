# SEC-05 — Signed proxy-origin proof (observation-only)

## Purpose

Carry a cryptographically authenticated *premium proxy-to-backend* request provenance indicator without trusting arbitrary client-provided headers. This is a stepping stone for risk telemetry, **not client-IP attestation**, bot detection, or authorization.

### Current deployment constraints

- The premium Vercel project has no confirmed `R2V_API_ORIGIN` environment variable. It must point to a separately verified HTTPS Node API host before live authentication works.
- The Next.js frontend's distinct `RIDE2VIEW_API_ORIGIN` is not evidence of a functioning backend; do not copy either hostname speculatively.
- SEC-03 PR #111 protects the original browser `Origin` before the premium proxy rewrites it. SEC-05 is **stacked on SEC-03**; merge/rebase SEC-03 first.
- SEC-01 and SEC-04 remain independent review changes. None needs SEC-05 to be deployed.

## Protocol

The browser request passes the SEC-03 same-origin validation. The premium serverless function **creates** the signed headers; it never forwards or trusts similarly named headers from clients. Signatures bind:

`v1 | timestamp | random 128-bit nonce | uppercase method | absolute API path | SHA-256(exact UTF-8 request body)`.

The exact canonical format is newline-separated and implemented in `apps/premium-web/lib/proxy-attestation.js`. The proof is HMAC-SHA256 using a minimum 32-byte backend-only random secret. Verification performs strict format and age checks (±120 s), recalculates the signature and compares it in constant time. Invalid, expired and absent proofs remain distinguishable in server-side counters; only the `VERIFIED` status indicates possession of the configured signing key at the time of proof creation.

The proof **cannot** establish the end-user's IP, session identity, browser integrity or trustworthiness. **It does not currently prevent replay within the time window.** The random nonce is reserved for a future shared nonce replay store, which is required before this signal could ever authorize sensitive actions. Do not reuse the proof as a Bearer credential, bypass origin/auth limits, or give it permission to initiate payments.

## Feature flags and secrets

Premium Vercel serverless function (after upstream verification):
- `R2V_PROXY_ATTESTATION_SIGN=true`
- `R2V_PROXY_ATTESTATION_SECRET=<32+ random bytes, managed in Vercel secret store>`

Node API host:
- `R2V_PROXY_ATTESTATION_OBSERVE=true`
- `R2V_PROXY_ATTESTATION_SECRET=<same secret, stored in backend secret manager>`

Both flags default OFF. The premium proxy returns 503 rather than sending unsigned requests when explicitly opted in but misconfigured. The backend's observer is non-enforcing, does not alter account/login/payment handling and never logs raw request content, signatures, raw IPs, cookies or credentials. It exposes bounded **per-process** in-memory counters through the app instance, not a customer-accessible endpoint. Optional injected callback can forward sanitized event statuses to a security telemetry sink.

**Secret rotation:** Disabling the signing flag on the proxy restores legacy requests; the observer reports ABSENT. For a future enforced protocol, implement key IDs and staged dual-key verification, replay protection and end-to-end zero-downtime rotation. Do not switch enforcement during rotation.

## Test matrix

- Correct signature, exact method/path/body and short lifetime.
- Reject modified payload, wrong method/path/secret, malformed/duplicated proof headers and expired/future timestamp.
- Premium proxy blocks cross-origin browser requests (SEC-03) before adding proof.
- Browser spoofed proxy/forwarding headers are not forwarded. A correct proxy-generated proof is verified server-side.
- Missing signing secret with opt-in -> HTTP 503 and no upstream request.
- Node server reports VERIFIED, INVALID and ABSENT in shadow telemetry but preserves existing login error responses.
- Provider callbacks, finance and customer-booking state transitions are not modified.

Run Node 24 `npm run check`, `npm run check:api`, `npm test`, and operational/browser acceptance. No production secret/environment changes or real backend connection are included in the PR.

## Next gates before IP reputation enforcement

1. Verify Node API hosting and firewall ingress restrictions to prevent bypass of the premium proxy.
2. Confirm any Vercel-provided client-network metadata is provider-attested at the edge (not user-writable) and establish a precise trusted-proxy chain. **Do not copy arbitrary `x-forwarded-for` or geographic headers as verified identity.**
3. Add a coherent shared nonce replay store and key rotation if signed proof is to become an enforcement dependency.
4. Introduce a proven, atomic multi-host datastore and per-account/per-contact limits. Capture shared mobile-NAT false positives.
5. Add server-verified BotID/edge verdicts and an authorized IP reputation provider with data minimization, explicit latency/circuit-breaker policy and privacy review.
6. Promote from observation to step-up challenges only after longitudinal false-positive measurements and a tested rollback.
