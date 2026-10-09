# V10-A security and deployment foundations
This change is intentionally isolated from EV development and payment provider integration.
## Production launch prerequisites
- Set NODE_ENV=production and COOKIE_SECURE=true; terminate TLS at a trusted ingress.
- Set DB_PATH to a persistent, backed-up volume. Do not deploy an in-memory production database.
- Put administrator and gateway credentials in the hosting secret store, not source control.
- Restrict and verify the M-Pesa/payment callback secret and test payment initiation and recovery before collecting money.
- Restrict ingress so remote clients cannot spoof their address through untrusted proxy headers.
- Use GET /api/health/live for process liveness and GET /api/health/ready for schema/database readiness.
- Configure alerts on sustained 5xx responses, not-ready responses and payment callback backlogs.
- Run npm run check, npm test, npm run test:agent, and npm run test:browser; merge only after CI is green.
## Rate-limit policy
A per-process fixed-window API limiter now applies to all /api/ requests (default 120 requests/minute per remote address). Authentication retains its stricter existing limit. At multi-instance scale use a shared store or enforce equivalent limits at an ingress/load balancer.
## Logging policy
Server errors log structured request metadata and correlation IDs, never request payloads, passwords or provider secrets. For client errors, normal HTTP responses remain authoritative.
