# Ride2View HTTP API contract — API-01

The authoritative implementation remains the Node.js route handlers under `server/`. These artifacts document existing behavior without adding new routes, changing URL paths, activating providers, or changing the database.

## Artifacts

- [`openapi.json`](openapi.json) — OpenAPI 3.1 specification in standard JSON format. Import into Swagger UI, Swagger Editor, Postman or compatible tooling.
- [`route-inventory.json`](route-inventory.json) — source-anchored inventory of handlers, normalized paths and HTTP methods.
- [`../../scripts/check-api-contract.js`](../../scripts/check-api-contract.js) — zero-dependency OpenAPI, source-drift, parameter, reference and callback security checks.
- [`../../tests/api-contract.test.js`](../../tests/api-contract.test.js) — local HTTP behavior smoke tests for safe public and guarded routes.

Run `npm run check:api` and `npm test`, followed by existing acceptance checks. The pull-request workflow performs contract validation before operational acceptance.

## Coverage and limitations

At the initial API-01 snapshot, the contract covers **140 distinct route declarations, 171 method/path operations and 146 normalized paths across 17 HTTP dispatcher modules**. The CI validator recalculates these numbers and fails when a route marker changes without inventory and OpenAPI updates.

Parameterized action routes use `/{action}` and OpenAPI enums where the handler expresses known choices. The agent workflow and operations tracking optional routers are split into the supported methods. Property media and availability slots are split so the contract does not claim GET on media.

**Schema limitation:** API-01 is a route and security contract, not an exhaustive typed payload specification. Where the server exposes no formal request/response schema, the OpenAPI contract uses a deliberately permissive `OpaqueJsonObject`. Some core auth, health, search, listings and manual payment payloads are typed. Refine remaining schemas with fixture-backed tests in API-02; do not enable blanket runtime schema validation based on these placeholders.

The existing `/api/` URLs remain unchanged. The OpenAPI document version identifies this contract revision; it does not introduce a new `/v1` URL prefix or silently migrate clients.

## Security and financial authority

- By default protected operations use the existing HttpOnly `r2v_session` cookie plus server-side authorization and role checks.
- Health, configuration, public discovery and relevant authentication challenge operations explicitly opt out of session authentication.
- `POST /api/provider-callbacks/{provider}` uses the configured adapter's verified `x-provider-signature`, not a customer cookie.
- `POST /api/operations/payment-events` uses a fresh `x-r2v-timestamp` and `x-r2v-signature` HMAC-SHA256 of the timestamp, a period and the exact raw HTTP body.
- `POST /api/bookings` remains intentionally disabled with HTTP 409 for signed-in customers; creating an agent-accepted viewing request remains the correct workflow.
- Payment verification, reservation confirmation, dispatch and cancellation remain controlled by existing deterministic authorities.

External payment or messaging adapters, deployment ingress, production credentials, persistence and provider approvals are **not proven enabled** merely because an HTTP endpoint exists.

## Maintenance procedure

When changing HTTP dispatch code, update the corresponding source marker and method/path mapping in `route-inventory.json`, revise OpenAPI parameters, security and responses, then run `npm run check:api` and the complete test suite. CI fails closed when it detects a new or altered route marker missing from the reviewed inventory.

## API-02 typed core contracts

API-02 adds [`typed-coverage.json`](typed-coverage.json) and a source-linked typed slice for verified registration, login, property CRUD/availability, viewing requests, bookings, multi-property journey drafts and manual payment verification. Run `npm run check:api` for route drift plus typed coverage/invariant validation. `npm test` includes synthetic HTTP fixture assertions in `tests/api-typed-contract.test.js`, exercising idempotent replay, cookie sessions, OTP challenge responses, booking guards, draft-journey role gating and payment confirmation (while existing viewing-package regression tests verify authorized agent redaction) without invoking live providers.

**Correctly distinct shapes:** public `PropertyListing` includes live verification and marketing metadata; embedded `PropertyListingSnapshot` does not. These two representations must not be silently conflated by client SDK generators. `AccountIdentity.verified` reflects the current integer database representation. All monetary amounts in protected payment verification use integer KES values.

**Contract boundary:** The typed coverage manifest is selective. It is not a claim that all routes have exhaustive JSON Schemas or that every payload property is required. `additionalProperties: true` preserves server-compatible extensions, while live authority still owns policy checks, entitlement, state transitions, concurrency and atomic side effects. Future schema tightening must be preceded by live fixtures and a separate compatibility review. No runtime endpoint, SQL migration or production provider activation is part of API-02.
