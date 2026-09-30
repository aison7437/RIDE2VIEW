# Ride2View

Property recommendations and viewing bookings with a customer, agent, driver, and administrator workspace. The existing design is available as a clearly labeled sample preview.

## Run

Requires Node 24 or newer. The server has no third-party runtime dependencies; SQLite is provided by Node.

```bash
npm ci
ADMIN_EMAIL=operations@example.com ADMIN_PASSWORD='use-a-unique-long-password' npm start
```

Open http://localhost:3000. Administrator credentials are environment configuration, never default credentials. Set them for the initial account, then remove the bootstrap password from the running environment. A `.env.example` documents settings; Node does not automatically load `.env` here (use `node --env-file=.env server/index.js` if desired).

The database defaults to `data/ride2view.sqlite`. Set `DB_PATH` to a durable writable volume. Do not run this application on static-only hosting: it requires a Node server. Production hosting, HTTPS, credentials, and external service setup remain external deployment tasks. Enable `COOKIE_SECURE=true` behind HTTPS. Back up the SQLite database with its SQLite backup facility or stop the process before copying the database; do not copy only the main database file while WAL writes are active.

## Operating the viewing journey

1. Register an agent and driver account; the administrator approves them under Operations.
2. An approved agent submits a property. The administrator checks it and approves the listing. Listing approval is a manual operational decision, not a legal ownership guarantee.
3. A customer searches approved available listings, chooses a property, and requests a future viewing.
4. The viewing charge is calculated on the server: General KES 650, Women KES 750, Students KES 450, VIP KES 2,000. These are configurable pilot charges in `server/app.js`, separate from rent. Women-only and student eligibility checks and live transport supply require additional operational policy; the tier label does not certify a driver's gender or a passenger's eligibility.
5. Payment remains pending. After receiving funds through an externally arranged payment method, an administrator checks the actual transaction record and enters its reference and exact amount. This is **manual verification**, not an M-Pesa/STK integration. Unique references prevent replay across bookings; audit records identify the verifier.
6. Only a confirmed paid viewing can receive an approved driver. The assigned driver or administrator completes it.
7. Cancellation of a paid booking records `refund_pending`; it does not transfer money. Operations must process refunds externally.

There are no sample listings seeded into the live database. Tests use temporary fixture data only. Notifications are delivered inside the app; email, SMS, WhatsApp, maps, live tracking, automatic M-Pesa collection, eligibility verification, and external analytics are not connected.

## Architecture

Repository ownership and structural conventions are documented in [`docs/repository-architecture.md`](docs/repository-architecture.md). New code is organized by product capability and execution responsibility rather than geographic directory trees.

- `server/`: HTTP API, input validation, role-based access, SQLite schema, payment ledger, audit and notifications.
- `js/app.js`: connected customer and operations workspace; safe text rendering and a single voice-search controller.
- `js/preview.js`, `css/style.css`: existing sample design split from the HTML. Transaction controls redirect to the connected workspace.
- `ai/Core/journey-orchestrator/`: active orchestration control plane. Public property search uses its read-only discovery workflow, which stops after recommendations and cannot book, charge, or dispatch.
- `ai/Core/orchestrator/`: legacy compatibility implementation retained temporarily while remaining callers/tests are migrated; `/api/search` no longer depends on it.
- `ai/user/lifestyle-agent/`: active workflow in `workflows/recommendation.js`, reasoning, overall-score ranking and recommendation formatting. Other legacy experimental modules are retained for compatibility and are not the active workflow.

Search injects approved database listings into the discovery provider. Time compatibility uses measured duration in minutes; a request limit is not treated as measured travel time. Missing timing remains unknown. This duration covers the supplied viewing estimate, not live traffic or travel predictions.

Authentication uses salted scrypt password hashes and HttpOnly SameSite cookies. Account roles are enforced by the server; agent/driver approval is required. Browser writes reject cross-site origins. Public search and sample preview do not imply authentication.

## Checks

```bash
npm run check
npm test
npm run test:agent
npx playwright install chromium
npm run test:browser
```

CI checks all JavaScript, the two existing 10-scenario suites, authorization and payment replay controls, persistence across restart, and the full customer → administrator → driver browser journey. CodeQL remains in its separate workflow.

## API

- Public: `GET /api/health`, `GET /api/config`, `GET /api/listings`, `POST /api/search`.
- Accounts: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
- Agent/admin: `POST /api/listings`, `PATCH /api/listings/:id`, `GET /api/listings?mine=true`.
- Bookings: `POST /api/bookings`, `GET /api/bookings`, `POST /api/bookings/:id/cancel`.
- Admin: `GET /api/admin/users`, `POST /api/admin/users/:id/approve`, `POST /api/payments/:id/verify`, `POST /api/bookings/:id/assign`, `GET /api/admin/audit`.
- Assigned driver/admin: `POST /api/bookings/:id/complete`.
- Signed-in accounts: `GET /api/notifications`.
