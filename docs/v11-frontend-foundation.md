# V11 — Incremental Next.js frontend foundation

## Status
This phase adds a **parallel, opt-in** Next.js/React/TypeScript frontend in `apps/web`. It does **not** replace the existing `index.html` or the Node 24 backend, and it does not claim that driver/agent/admin dashboards or PWA are implemented.

## Existing architecture
- Root `npm start` runs `server/index.js`; the existing backend is authoritative.
- Existing browser UI lives in `index.html`, `css/`, `js/`; `js/app.js` calls same-origin `/api/*`.
- Root `npm test`, browser and acceptance scripts remain unchanged.
- Database and provider integration continue to run on the backend. Never duplicate payment, booking or role-authorization logic in the frontend.

## Local development
1. Terminal A: from repository root, `npm ci && npm start` (Node >=24).
2. Terminal B: `cd apps/web && npm install && npm run dev`.
3. Open `http://localhost:3001` if port 3000 is occupied (Next.js may choose another port; `npm run dev -- -p 3001` sets it explicitly).
4. Next.js rewrites `/api/*` to `RIDE2VIEW_API_ORIGIN` (defaults to `http://127.0.0.1:3000`). Do not point this at an untrusted server. Keep both services behind one HTTPS origin in staging.

## Current scope
- Customer-facing responsive discovery shell.
- Existing `POST /api/search` integration, preserving the server's recommendations and errors.
- Existing `GET /api/auth/me` identity display; no new login or payment UI.
- No browser voice support in the new Next.js frontend yet; existing legacy UI remains available.

## Required gates before cutover
- Commit a reproducible `apps/web/package-lock.json` and run `npm ci`, `npm run build` and `npm run typecheck` in dedicated CI.
- Verify API request/response schema, authentication cookies and CSRF/security boundaries through the reverse proxy.
- Build role-specific customer, driver, agent and admin routes with server-side role enforcement.
- Port Voice V2 and booking UX; test real devices and permission failures.
- PWA manifest/service worker, safe cache exclusions for authenticated/payment data.
- Run staging acceptance and rollback drill. Never replace legacy UI until parity is demonstrated.
- EV work remains on hold.
