# P0-01 — Public frontend-to-backend deployment gate

## Finding (12 November 2026)
The repository has a Node 24 HTTP API, SQLite persistence, a Docker/Caddy staging deployment, and two successful Vercel deployment statuses. This **does not establish where the Node backend is hosted** or whether the public Vercel frontend proxies `/api/*` to it. No `vercel.json` exists on the audited main branch. Do not infer production readiness from a static frontend build.

## Implementation
`scripts/frontend-api-smoke.js` provides a read-only release gate against the **actual customer-facing HTTPS origin**, rather than only the isolated Node staging origin. It checks:
1. `/` returns HTML.
2. `/api/health/live` returns successful JSON.
3. `/api/health/ready` returns successful JSON.
4. `/api/admin/audit` denies anonymous access with HTTP 401.
5. Requests do not silently follow redirects; an SPA fallback returning HTML for `/api/*` fails.

Run `FRONTEND_URL=https://your-customer-origin.example npm run check:frontend-api` after each frontend/backend release. This is a smoke test, **not** proof of booking, payment, OTP, durable storage, or provider connectivity. The check does not create accounts, collect funds, or modify state.

## Deployment decisions still required
- Identify the live Node API hosting provider, host, persistent database mount, and ingress. Do not point Vercel at a development laptop or static-only server.
- Configure an authenticated, HTTPS backend and same-origin `/api/*` routing at the customer origin. Preserve original request method, body, cookies, and provider callback paths. Use a trusted reverse proxy; restrict origin exposure and forwarded headers.
- Keep session cookies Secure, HttpOnly and appropriately SameSite; verify login and logout through the public origin.
- Configure a durable `DB_PATH`, online SQLite backups to encrypted off-host storage, restore drills, readiness alerts and secret management.
- Validate Node 24 runtime, `npm run test:acceptance`, `npm run check:integrations`, `npm run check:staging`, and the new public-origin gate on the **same release SHA**.
- Perform manual real-device registration and payment-provider sandbox checks before any customer funds are collected.

## Release rule
Do not merge or enable paid public booking based only on this PR. CI and live infrastructure checks must pass; credentials, hosting topology, payment providers and data backups require separate operational verification.

## Operator-triggered GitHub deployment check
The workflow `.github/workflows/p0-01-public-api.yml` provides a manual `workflow_dispatch` gate that accepts the exact customer-facing HTTPS origin and executes `npm run check:frontend-api` from a GitHub-hosted runner. GitHub typically requires a manually dispatched workflow file to exist on the default branch; therefore it cannot be relied upon until this PR has passed review and been merged. In the meantime, run the command from a trusted machine or CI checkout against the actual public origin and preserve the output with the deployed SHA. Do not mark the public-origin gate PASS based solely on synthetic unit tests or successful Vercel checks.
