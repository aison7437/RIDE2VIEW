# Ride2View

Property recommendations and viewing bookings with a customer, agent, driver, and administrator workspace. The existing design is available as a clearly labeled sample preview.

## Run

Requires Node 24 or newer. The server has no third-party runtime dependencies; SQLite is provided by Node.

```bash
npm ci
ADMIN_EMAIL=operations@example.com ADMIN_PASSWORD='use-a-unique-long-password' npm start
```

Open http://localhost:3000. Administrator credentials are environment configuration, never default credentials. Set them for the initial account, then remove the bootstrap password from the running environment. A `.env.example` documents settings; Node does not automatically load `.env` here (use `node --env-file=.env server/index.js` if desired).

The database defaults to `data/ride2view.sqlite`. Set `DB_PATH` to a durable writable volume. Do not run this application on static-only hosting: it requires a Node server. Production hosting, HTTPS, credentials, and external service setup remain external deployment tasks. Enable `COOKIE_SECURE=true` behind HTTPS. Back up the SQLite database with its SQLite backup facility; do not copy only the main database file while WAL writes are active. Ride2View includes an online-safe backup command that uses Node's SQLite backup API and verifies the resulting database with `PRAGMA integrity_check`:

```bash
npm run db:backup -- /secure/backups/ride2view-$(date +%F).sqlite
npm run db:check -- /secure/backups/ride2view-$(date +%F).sqlite
```

Schedule that command with the production platform's scheduler and store backups outside the application volume. Retention, encryption, off-site storage, and restore drills are infrastructure policy and must be configured on the chosen hosting platform.

## Operating the viewing journey

1. Register an agent account and complete its legal name, contact and agency registration profile. Upload private identity and agency evidence. Operations reviews each submission separately, with a reason and expiry. Driver approval remains under Operations.
2. A verified agent creates a rent/sale property draft, uploads marketing-authority and ownership evidence, and submits each for review. After both are approved, submit publication review. Ownership evidence review is an operational assessment, not a legal ownership guarantee or completed due diligence.
3. The agent adds future availability slots and photo, video or 360 tour HTTPS links. Customer profiles store city, budget, bedrooms and rent/buy goal; customers can save properties. A viewing request snapshots the matching city/budget/goal qualification.
4. A customer requests an available slot. The owning agent accepts, declines or reschedules it. Acceptance atomically creates the booking, pending payment and reservation; conflicting agent appointments are rejected. The payment hold lasts 30 minutes or until the viewing starts, whichever comes first.
5. The viewing charge is calculated on the server: General KES 650, Women KES 750, Students KES 450, VIP KES 2,000. These remain pilot charges, separate from property rent/purchase price. Women-Only enforcement, student eligibility and live transport supply are later programs. The package flow below adds versioned multi-property pricing.
6. Operations verifies the actual received payment record. Managed viewing payment verification and reservation confirmation commit together. Only confirmed paid viewings can receive a driver offer; the driver accepts and completes the trip through the existing dispatch authority. External provider adapters still require production credentials/configuration.
7. Cancellation uses the existing recovery coordinator. Paid bookings become `refund_pending`; this does not transfer money. Completed viewings can receive an immutable outcome and a customer review. Agents track follow-up, negotiation and won/lost leads.
8. Operations records an agreed commission against a won lead. Earned, pending, disputed and manually verified paid records remain separate from customer viewing charges. Paid records claim a unique shared transaction reference and record a debit/reconciliation entry; this does not initiate a payout.

For multi-property journeys, use **Viewing packages**: save contact/pickup details, select up to three properties and participants, receive an operations-reviewed route quote, accept its policy, obtain each agent confirmation, pay once and complete one assigned transport journey. General and VIP packages support whole-itinerary rescheduling, pre-trip credits/refunds and per-property outcomes. Women/Student packages remain blocked pending eligibility and verified driver supply. Full policy, API and limitations: [`docs/customer-viewing-journey-v2.md`](docs/customer-viewing-journey-v2.md).

The full API, review model, migration behavior and remaining phases are documented in [`docs/agent-property-supply-v1.md`](docs/agent-property-supply-v1.md).
There are no sample listings seeded into the live database. Tests use temporary fixture data only. Notifications are delivered inside the app; email, SMS, WhatsApp, maps, live tracking, automatic M-Pesa collection, eligibility verification, and external analytics are not connected.

## Architecture

Repository ownership and structural conventions are documented in [`docs/repository-architecture.md`](docs/repository-architecture.md). New code is organized by product capability and execution responsibility rather than geographic directory trees.

- `server/`: HTTP API, input validation, role-based access, SQLite schema, payment ledger, audit and notifications.
- `js/app.js`: connected customer and operations workspace; safe text rendering and a single voice-search controller.
- `js/preview.js`, `css/style.css`: existing sample design split from the HTML. Transaction controls redirect to the connected workspace.
- `ai/Core/journey-orchestrator/`: active orchestration control plane. Public property search uses its read-only discovery workflow, which stops after recommendations and cannot book, charge, or dispatch.
- `ai/user/lifestyle-agent/`: active workflow in `workflows/recommendation.js`, reasoning, overall-score ranking and recommendation formatting. Other legacy experimental modules are retained for compatibility and are not the active workflow.

Search injects approved database listings into the discovery provider. Time compatibility uses measured duration in minutes; a request limit is not treated as measured travel time. Missing timing remains unknown. This duration covers the supplied viewing estimate, not live traffic or travel predictions.

Authentication uses salted scrypt password hashes and HttpOnly SameSite cookies. Account roles are enforced by the server; agent documentary verification and driver approval are required. Browser writes reject cross-site origins. Public search and sample preview do not imply authentication.

## Checks

```bash
npm run check
npm test
npm run test:agent
npx playwright install chromium
npm run test:browser
```

CI checks all JavaScript, the two existing 10-scenario suites, authorization and payment replay controls, persistence across restart, and the full customer → agent → reviewer → driver browser journey, including evidence upload, publication renewal, outcomes and mobile layouts. CodeQL remains in its separate workflow.

## API

- Public: `GET /api/health`, `GET /api/config`, `GET /api/listings`, `POST /api/search`.
- Accounts: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
- Agent/admin: `POST /api/listings`, `PATCH /api/listings/:id`, `GET /api/listings?mine=true`.
- Viewing requests: `GET/POST /api/viewing-requests`; agent acceptance creates a booking.
- Existing bookings: `GET /api/bookings`, `POST /api/bookings/:id/cancel`.
- Admin: `GET /api/admin/users`, `POST /api/admin/users/:id/approve`, `POST /api/payments/:id/verify`, `POST /api/bookings/:id/assign`, `GET /api/admin/audit`.
- Assigned driver/admin: `POST /api/bookings/:id/complete`.
- Signed-in accounts: `GET /api/notifications`.
