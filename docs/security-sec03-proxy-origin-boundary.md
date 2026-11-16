# SEC-03 — Premium authentication proxy origin boundary

## Verified deployment facts (2026-11-16)

- GitHub main has two separate frontend deployments. \`ride-2-view\` is Next.js using \`RIDE2VIEW_API_ORIGIN\` as a rewrite destination; \`ride2view-premium-web\` is a standalone static site plus a Vercel auth proxy and requires \`R2V_API_ORIGIN\`.
- Read-only inspection of connected Vercel project environment key names showed \`RIDE2VIEW_API_ORIGIN\` exists on \`ride-2-view\` (production/preview), but \`ride2view-premium-web\` has **no** \`R2V_API_ORIGIN\` key. This does not establish whether the external Node API is deployed.
- Both Vercel projects have Bot Protection and AI Bots **Log** managed rules configured, without application-level enforcement.
- The Node HTTP API is documented as requiring persistent SQLite, Node 24, a dedicated backend host and TLS; a successful static frontend deployment is not proof of an operational backend.

## Risk boundary

The premium Vercel function in \`apps/premium-web/api/[...path].js\` needs to rewrite outbound \`Origin\` to the trusted HTTPS backend origin. The backend's same-origin guard consequently sees the rewritten origin, **not** the browser origin. SEC-03 verifies the browser's original \`Origin\` and Fetch Metadata at the proxy *before* any upstream request.

For POST requests:

- Reject \`sec-fetch-site: cross-site\` even if \`Origin\` claims to match the host.
- When \`Origin\` is present, require a valid scheme, exact hostname/port match with the incoming request's \`Host\`, no userinfo/path/query/fragment, and HTTPS for a real Vercel deployment.
- Reject \`sec-fetch-site: same-site\` if \`Origin\` is missing, because a sibling subdomain has not demonstrated exact same-origin access.
- Preserve originless non-browser clients for compatibility. They are not validated humans; API abuse prevention and rate limits remain separate requirements.
- Continue using the route allowlist, HTTPS-only backend origin validation, size bounds and session-cookie pass-through. Forward only explicitly selected headers. Never honor incoming client-written proxy provenance headers.

These checks are defense in depth, **not** authentication or bot attestation: non-browser clients can omit browser headers. Authorization, CSRF protection, OTP constraints and rate limits must remain at the backend. \`X-Forwarded-For\` must **not** be blindly adopted as an identity, especially with shared Kenyan mobile networks.

## Operator steps before enabling signup

1. Identify the *actual* production Node API host (not one of the static UI URLs), verify its TLS hostname, readiness, credentials, persistent DB and ingress restrictions.
2. Configure the exact \`R2V_API_ORIGIN\` environment variable for the premium Vercel project; use **HTTPS scheme + host only** and choose production/preview environments deliberately. Do not guess or copy \`RIDE2VIEW_API_ORIGIN\` from the other frontend without independently verifying the destination.
3. Validate real browser request flow with network tracing: signup initiation -> verification provider delivery -> OTP verification -> HttpOnly cookie -> sign-in -> logout -> recovery. Confirm cross-site requests are blocked and no sensitive traffic is exposed.
4. Design SEC-04 identity attribution and distributed quotas *after* mapping the trusted proxy chain; collect feedback on shared IP false positives before enforcement.
5. Keep Bot Protection / AI Bots in log-only mode until false positives are assessed; never challenge provider callbacks.

## Validation and rollout constraints

Tests in \`tests/premium-auth-proxy.test.js\` cover original cross-origin rejection, exact same-origin allowance, forged forwarding headers, missing configuration and preservation of direct non-browser callers. Run Node 24 \`npm test\`, \`npm run check\`, \`npm run check:api\`, and existing browser acceptance CI. This feature has no production environment changes, credentials, bot verdicts, IP reputation feeds, or payment modifications. Do not merge until checks and review pass.
