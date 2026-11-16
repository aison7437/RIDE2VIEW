# SEC-01 — IP reputation and bot defense: observation-first foundation

## Status and threat model

This change is deliberately **detection-only** and disabled by default. It does not claim that an IP intelligence feed, BotID verification, distributed rate limiter or global bot-blocking policy has been deployed. Production changes require a separately reviewed rollout.

Initial read-only audit (2026-11-16) of main at commit 42320d041e0b84c69239d7f5517c757da0591113 found:

- The existing API limiter is backed by a process-local Map (120 requests / 60 s by default). The login limiter is another socket-based process-local Map (30 attempts / 60 s). Neither enforces a shared multi-instance quota.
- Both use the TCP peer remoteAddress, not a validated original client identity. When customers share a mobile carrier NAT or Vercel reverse proxy, the socket is insufficient for individual risk attribution. Blindly trusting x-forwarded-for would permit spoofing.
- The premium static deployment proxies an allowlist of auth/config paths through apps/premium-web/api/[...path].js to a separately configured R2V_API_ORIGIN. Provider credentials and backend deployment remain separate concerns.
- Both connected Vercel projects returned configured:false for custom firewall policy. Vercel's default firewall still applies; this does **not** mean platform DDoS mitigation is disabled.

## Included in this feature branch

- Dependency-free traffic-risk policy with route classifications and a weighted risk signal contract for *trusted server-side* network reputation, bot verdict, socket velocity and authentication failures. Unknown signals remain UNASSESSED.
- An in-memory, bounded and expiring socket-velocity observer. Threshold exceedance emits one sanitized event per socket/route window. The signal is NOT evidence that an individual customer is a bot.
- The observer never stores IPs outside its short-lived process-local keys and never logs raw addresses, account data, cookies, request bodies or full URLs.
- Excludes payment-provider callback routes from browser bot scoring. Monitoring errors do not interrupt legitimate requests.
- Opt-in API hook: R2V_TRAFFIC_RISK_OBSERVE=true, or createApp({observeTrafficRisk:true}). Default is OFF; the policy is always OBSERVE_ONLY. Optional onTrafficRiskEvent event sink and trafficRiskThresholds are available for tests and host integrations.
- Unit tests and HTTP regression coverage. No third-party dependencies added.

## Rollout gates

1. Keep R2V_TRAFFIC_RISK_OBSERVE unset in production until staging tests pass and the backend topology is confirmed. This branch does **not** retrieve external IP reputation or run Vercel BotID checks.
2. Inspect Vercel Firewall on both connected projects. If applicable, start Bot Protection managed rules in **Log**, not Challenge/Deny, while observing real traffic. Exclude/allow legitimate bots, operational health checks and provider callbacks where necessary.
3. Integrate Vercel BotID separately on selected Vercel-hosted browser actions using its client bootstrap and server-side checkBotId verification. A user-supplied flag/header is not proof of humanity. Do not challenge signed gateway webhooks.
4. Before attributing risk to a browser IP, create a documented, authenticated trusted-proxy-to-API boundary. Either restrict upstream ingress to authenticated trusted proxies or cryptographically sign and verify client provenance. Never trust arbitrary forwarded headers.
5. Replace socket-only per-process enforcement with atomic shared limits after identifying production API hosting. Use per-account and per-contact OTP constraints; provide safe fallback for mobile carrier NAT and shared networks. Preserve existing verification and webhook idempotency.
6. Stage tests: shared NAT and proxy address, spoofed forwarding headers, excessive OTP attempts, scraper bursts, webhook retries, unknown reputation feed result, and monitoring outage. Measure true positives, false positives, support tickets, conversion impacts and latency.
7. Document purpose limitation, data retention, encryption and access controls for network/device signals in a Kenya Data Protection Act review.

## Validation

Run npm run check, npm run check:api, npm test and relevant browser tests in Node 24 CI. Do not merge without required checks. No production firewall settings, BotID products, DNS, payment settings or Vercel environment variables are changed by this branch.
