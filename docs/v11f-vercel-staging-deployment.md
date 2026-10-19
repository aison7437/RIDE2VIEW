# Ride2View Vercel staging frontend deployment

This deploys **only** the Next.js frontend from `apps/web`. The authoritative Node.js backend, SQLite storage, callback workers and payment controls must remain on a persistent HTTPS staging host.

1. In Vercel, import GitHub repository `aison7437/RIDE2VIEW` and select **Root Directory: `apps/web`**.
2. Select Next.js framework, Node.js runtime supported by Next.js 15, and deploy a **Preview** environment before configuring production domains.
3. Set **`RIDE2VIEW_API_ORIGIN=https://<your-staging-api-host>`** in the Vercel project environment variables. It must be the HTTPS **origin only**, with no `/api`, path, username, or trailing endpoint. Set this separately for Preview and Production as appropriate. **Do not put provider secrets or database credentials in Vercel.**
4. The Next.js rewrite forwards `/api/*` to the configured backend. With no production API origin, the rewrite is intentionally absent: the frontend cannot silently forward traffic to localhost. The frontend uses same-origin requests so session cookies should be validated end to end against the deployed proxy.
5. Before enabling a public production domain, verify `/api/config`, login/session cookies, customer property discovery, booking requests, agent acceptance, driver offers and administrative authorization through the Vercel domain. Ensure backend origin/CSRF/host checks accept the intended Vercel domain without weakening security for other origins.
6. Keep **real M-Pesa disabled** until the provider-specific Daraja ingress, callback authenticity, reconciliation and sandbox tests are complete. The existing STK transport foundation does not confer payment readiness.
7. Confirm rate limits, HTTPS, audit logs, persistent database backups and rollback procedures. Do not store SQLite in Vercel's ephemeral runtime.

**Not performed by this commit:** linking a Vercel account, deploying a project, provisioning a VPS, creating DNS records, or running live staging tests. These require external infrastructure access and configuration.
