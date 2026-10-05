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

1. Register an agent account and complete its legal name, contact and agency registration profile. Upload private identity and agency evidence. Operations reviews each submission separately, with a reason and expiry. Driver/vehicle onboarding now uses private mobility evidence and expiry-bound operations review.
2. A verified agent creates a rent/sale property draft, uploads marketing-authority and ownership evidence, and submits each for review. After both are approved, submit publication review. Ownership evidence review is an operational assessment, not a legal ownership guarantee or completed due diligence.
3. The agent adds future availability slots and photo, video or 360 tour HTTPS links. Customer profiles store city, budget, bedrooms and rent/buy goal; customers can save properties. A viewing request snapshots the matching city/budget/goal qualification.
4. A customer requests an available slot. The owning agent accepts, declines or reschedules it. Acceptance atomically creates the booking, pending payment and reservation; conflicting agent appointments are rejected. The payment hold lasts 30 minutes or until the viewing starts, whichever comes first.
5. The viewing charge is calculated on the server: General KES 650, Women KES 750, Students KES 450, VIP KES 2,000. These remain pilot charges, separate from property rent/purchase price. Women-Only and Student tiers now require current adult rider eligibility, and Women-Only requires a reviewed female driver. Live transport tracking remains pending. The package flow below adds versioned multi-property pricing.
6. Operations verifies the actual received payment record. Managed viewing payment verification and reservation confirmation commit together. Only confirmed paid viewings can receive a driver offer; the driver accepts and completes the trip through the existing dispatch authority. External provider adapters still require production credentials/configuration.
7. Cancellation uses the existing recovery coordinator. Paid bookings become `refund_pending`; this does not transfer money. Completed viewings can receive an immutable outcome and a customer review. Agents track follow-up, negotiation and won/lost leads.
8. Operations records an agreed commission against a won lead. Earned, pending, disputed and manually verified paid records remain separate from customer viewing charges. Paid records claim a unique shared transaction reference and record a debit/reconciliation entry; this does not initiate a payout.

For multi-property journeys, use **Viewing packages**: save contact/pickup details, select up to three properties and participants, receive an operations-reviewed route quote, accept its policy, obtain each agent confirmation, pay once and complete one assigned transport journey. General and VIP packages support whole-itinerary rescheduling, pre-trip credits/refunds and per-property outcomes. Women/Student packages support one verified adult account holder; Women-Only dispatch requires a reviewed female driver. Full policy, API and limitations: [`docs/customer-viewing-journey-v2.md`](docs/customer-viewing-journey-v2.md).

**Driver onboarding and Ride2Go** adds private identity/licence/vehicle evidence, adult eligibility review, online supply, expiry/revocation checks, shared driver/vehicle conflicts, standalone quoted trips, manual payment verification, driver offer/acceptance, private pickup-code start and cash-refund settlement. Operations must configure Ride2Go prices before issuing quotes. Operating policy and API: [`docs/driver-onboarding-ride2go-v3.md`](docs/driver-onboarding-ride2go-v3.md).

**Remote viewing, due diligence and transaction progression** adds timezone-aware remote requests, agent availability confirmation, reviewed service quotes and manual payments, gated private provider links, recording consent, private case evidence, independently released reports, customer-authorized negotiation and recorded rent/buy outcomes. Video hosting and registry/legal verification are not connected. Workflow, API and operating boundaries: [`docs/remote-viewing-due-diligence-v4.md`](docs/remote-viewing-due-diligence-v4.md).

**Provider operations and transport visibility (V5)** adds durable collection/refund gateway jobs, authenticated payment results for viewings/Ride2Go/property services, verified SMS/WhatsApp preferences, reminders, scoped foreground driver GPS, Google address/road-ETA adapters, printable payment receipts, reconciliation and provider-accepted fiscal records. Production integrations are disabled until explicitly configured. External gateway contract, configuration, privacy and activation requirements: [`docs/production-operations-v5.md`](docs/production-operations-v5.md).

## V9 production integration activation

Ride2View now has repository-side production boundaries for payments/refunds, SMS/WhatsApp messaging, Google Routes/Geocoding, fiscal submission and deployment monitoring. Run `npm run check:integrations` in the production environment before deployment. A provider capability is disabled unless its server-side configuration is complete; payment callbacks additionally require a secret of at least 32 characters. Provider and monitoring endpoints must be HTTPS and credentials are never accepted from browser requests.

The normalized `R2V_GATEWAY_*` contract deliberately separates Ride2View business authorities from native provider SDKs. A production gateway may translate that contract to M-Pesa/Daraja, an approved SMS/WhatsApp provider and the applicable fiscal provider. This repository does **not** claim those external accounts are activated. Actual provider credentials, public callback ingress, provider onboarding/approval, domain TLS, secret storage, scheduled off-site backups and alert routing remain deployment operations. Google credentials are server-only and should be API/restriction scoped. Video hosting, object storage and official registry verification remain disabled until reviewed adapters and credentials are introduced.

The full API, review model, migration behavior and remaining phases are documented in [`docs/agent-property-supply-v1.md`](docs/agent-property-supply-v1.md).
There are no sample listings seeded into the live database. Tests use temporary fixture data only. Internal notifications work without providers. External payment, SMS/WhatsApp, road routing and fiscal connections require the V5 configuration and gateway described above. Email, Web Push, external identity/eligibility registries and external analytics remain unconnected.

## Personal assistants

Signed-in customers, agents and drivers can run saved assessments from **Your assistants**. Agent Assistant, Lead Qualification and Driver Coach join the existing specialists through account-scoped, restart-recoverable workflows. Reviewing advice does not execute bookings, payments or messages. Capabilities, API and remaining agent work: [agent workflows](docs/agent-workflows.md).

Administrators also have **Business analytics and friction**: Nairobi date filters, defined conversion cohorts, currency-separated ledger records, payout/refund allocations, performance and evidence-linked findings. Signed-in search-to-selection measurement starts with this release; historical abandonment is not inferred. See [report definitions and limits](docs/business-analytics-friction.md).

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
