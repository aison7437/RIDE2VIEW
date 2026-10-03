# V5 — Provider operations, transport visibility and financial records

This release completes the repository-side workflows for external collection/refund jobs, verified messaging, foreground driver GPS, address search/road ETA, payment receipts, statement reconciliation and fiscal submission. Production provider connections remain disabled until explicitly configured. No live payment, message, tax invoice or provider account is created by this release or its tests.

## Activation and external work remaining

| Setting | Purpose |
| --- | --- |
| `R2V_GATEWAY_URL` | HTTPS base URL of the organization's trusted integration gateway |
| `R2V_GATEWAY_TOKEN` | Server-only authorization credential for that gateway |
| `R2V_GATEWAY_CAPABILITIES` | Explicit comma-separated selection: `payments,refunds,messaging,fiscal`; default is none |
| `R2V_GATEWAY_CALLBACK_SECRET` | At least 32 characters when payments are enabled; used only by the trusted gateway and Ride2View |
| `GOOGLE_ROUTES_API_KEY` | Server-only key for Google Routes and Geocoding APIs, with provider-side billing, restrictions and APIs configured |

Run `npm run check:integrations` to validate configuration without making any network request. The HTTP server loads these settings in `server/index.js`. Tests can inject provider adapters into `createApp({integrations})`; production does not inject test providers or credentials. Keep secrets outside Git, logs and browser configuration.

The gateway contract below is a Ride2View-owned integration boundary, **not Safaricom's native Daraja API, a WhatsApp vendor API, or KRA's native OSCU/VSCU schema**. The existing `mpesa-adapter.js` also represents a normalized signed adapter, not proof of native Daraja webhook signatures. External integration work still consists of connecting a deployed gateway to authorized M-Pesa/Daraja collection and refund services, approved SMS/WhatsApp delivery, and an appropriate eTIMS integration. Provider credentials, sender/template approvals, public HTTPS callback ingress, KRA onboarding/certification, merchant/customer billing data required by the chosen provider, and sandbox/production acceptance tests are external responsibilities. This repository does not fabricate those connections.

Google Routes/Geocoding has a direct HTTP adapter; once authorized credentials are configured, it resolves addresses and requests traffic-aware road durations. Google navigation links also open the selected coordinates in an external map. The in-app diagram is a coordinate overview, not a street basemap. GPS works while the driver's browser page is open; it is not an OS-level background location service.

## Durable provider job contract

The gateway must implement:

- `POST /v1/jobs` with `Authorization: Bearer <token>`, `Content-Type: application/json`, and `Idempotency-Key: <job UUID>`.
- JSON request: `{ "id": "job UUID", "type": "job type", "payload": { ... } }`.
- `GET /v1/jobs/:id` with the same authorization. Return `{ "status": "COMPLETED", "result": <original acknowledgement> }`, `{ "status": "NOT_FOUND" }` only after authoritative absence is established, or an indeterminate/pending state.
- Persist the key and exact outcome durably. Repeating the same job UUID must not collect, refund, deliver or invoice twice. Never return `NOT_FOUND` merely because the provider is temporarily unreachable or a request is still processing.

| Job type | Payload | Successful acknowledgement |
| --- | --- | --- |
| `payment.collect` | `collectionId`, whole-KES `amount`, `currency`, E.164 `phone`, description | `{ "requestId": "provider checkout/request ID" }`; this is acceptance of initiation, not proof of payment |
| `payment.refund` | `refundId`, whole-KES amount/currency, original payment reference, reason | `{ "reference": "actual settled refund reference", "amount": 1200, "currency": "KES" }`; acknowledge only a completed refund |
| `message.verify` | channel (`sms`/`whatsapp`), destination, verification text, expiry | `{ "messageId": "provider message ID" }` |
| `message.send` | channel, destination, text, optional expiry/reminder source | `{ "messageId": "provider message ID" }`; acceptance is not a handset delivery/read receipt |
| `fiscal.submit` | document ID, receipt number, customer ID, kind, gross/net/tax minor units, currency, frozen supplier/tax policy, original invoice for credits | `{ "accepted": true, "invoiceNumber": "...", "controlCode": "...", "verificationUrl": "https://..." }`; return only actual fiscal acceptance evidence |

All calls have a 12-second network deadline and reject redirects. Adapters do not take provider endpoints or credentials from customer input. Workers claim 30-second leases before outbound delivery. Timeout, crash, malformed acknowledgement or lost local settlement moves the job to `REVIEW`; it is not sent again automatically. An administrator records a reason and requests lookup. A known completed result is applied without resending. Only authoritative `NOT_FOUND` permits another send, after rechecking whether the operation is still allowed. This includes checking current messaging consent and payment holds.

The background worker runs every five seconds, prevents overlapping local drains, expires abandoned leases, and uses database leases across workers. Disabled capabilities do not dispatch their pending jobs. Failed external setup leaves existing manual operations available. Successful HTTP acknowledgements and job state commit together. Money application has its own durable, idempotent domain boundary so a crash between external acknowledgement and local payment/refund application remains recoverable.

## Authenticated payment results

The trusted gateway posts to `POST /api/operations/payment-events`:

```json
{
  "eventId": "durable-provider-event-id",
  "collectionId": "Ride2View collection UUID",
  "requestId": "acknowledged provider request ID",
  "status": "SUCCEEDED",
  "amount": 1200,
  "currency": "KES",
  "reference": "ACTUAL_PROVIDER_RECEIPT"
}
```

`status` may instead be `FAILED`; failed events still include the correlated intended amount/currency. Headers:

- `X-R2V-Timestamp`: Unix seconds, within five minutes of server time.
- `X-R2V-Signature`: lowercase hex HMAC-SHA256 of `timestamp + "." + exactRawRequestBody`, keyed with `R2V_GATEWAY_CALLBACK_SECRET`.

The gateway must authenticate/verify the real upstream provider result before signing. Do not expose this secret to browsers or forward arbitrary unsigned requests through a signing proxy. An STK initiation response is not sufficient evidence of received funds. This HMAC format is Ride2View's gateway protocol, not a claim about native Safaricom callback authentication.

Callbacks bind the collection, exact amount/currency and provider request ID, and are durably stored with a payload hash before domain application. Replays with changed data are rejected. Early callbacks wait for the matching initiation acknowledgement. Successful application invokes the existing booking/package, Ride2Go or property-service payment authority, preserving reservation, eligibility and verification checks. Shared references and ledger entries prevent duplicate application. Provider identity is recorded as `integration_gateway`, not disguised as a manually verified receipt.

The customer can request a collection only for their own currently payable payment. An active or ambiguous collection prevents another collection against the same target. If funds arrive after expiry, cancellation, another payment or a verification failure, they remain in `REVIEW`; the system does not falsely confirm the service. Operations may reapply stored evidence after resolving the domain issue, or record an actual refund of unapplied funds. That recovery records balanced received/refunded ledger entries and unique references. A mismatched checkout is not accepted as refund evidence.

## Refunds and reconciliation

Operations may submit an external refund only against an existing full refund liability. The original payment amount and reference come from the authority, not the request body. While an external refund is pending, the normal manual settlement routes for packages, Ride2Go and property services are locked to prevent competing payouts. A successful provider refund result is recorded first, then applied through the domain authority. Database application failures enter review; reapplication uses the same settled reference and never requests another transfer. Single-property refunds now have the same ledger/reference settlement path.

For viewing packages and property services, their existing cancellation policies remain authoritative. This release does not add partial refunds, alter refund amounts, or authorize refunds after arbitrary trip completion.

Each financial credit/debit creates a reconciliation record. Operations enters the observed statement amount and evidence reference. Exact matches become `MATCHED`; differences become `DISCREPANCY`. Final records cannot be overwritten with contradictory evidence. Historical transactions are not invented or backfilled into the ledger; receipts can still represent their existing authoritative payment records.

## Notification consent and reminders

Users choose SMS or WhatsApp and explicitly opt in. An OTP job is sent to the chosen E.164 number; no booking alerts are sent until the user proves control with that code. Codes expire after ten minutes, allow five attempts, and are limited to one issuance per minute. Stored job text containing OTPs is removed after acknowledgement/expiry. Protect the database and backups: queued OTP text, contacts, financial evidence and navigation points are sensitive.

Notification jobs are derived from new internal updates after verification, appointment reminders within 24 hours, and driver arrival. Ordinary alerts use generic text directing the user to sign in; they do not disclose property documents or private pickup codes. Each source has a stable event key. Rescheduled or cancelled appointments invalidate queued reminders. Delivery rechecks opt-in, verified contact, channel/destination and expiry. Withdrawal cancels pending messages; a message already accepted by the provider cannot be recalled. WhatsApp template selection/approval and real delivery receipts belong to the external gateway integration. This release does not implement browser Web Push.

## GPS, addresses and ETA

Only the assigned driver can publish a location for an active accepted trip. Customer/other-driver writes are rejected. Updates carry monotonically increasing sequence numbers, capture timestamps and accuracy; the server rejects old/future timestamps, out-of-order updates and accuracy worse than 200 metres, and limits writes to one per five seconds. The UI sends approximately every ten seconds after explicit browser geolocation permission and the driver's Start Sharing action.

Only the trip's customer, assigned driver and operations can read tracking. Agents and unrelated accounts cannot. A newly assigned driver cannot inherit another driver's location. Points are marked stale after 60 seconds without receipt or 90 seconds since capture. Completion/cancellation removes the active point on read/cleanup. Only the latest point is stored; inactive/abandoned points are purged on the five-second maintenance tick, with a 30-minute ceiling for abandoned active feeds. No route history is exposed. Driver Stop Sharing deletes the point and cached ETA immediately.

Customers select pickup/destination through address lookup or device location and explicitly consent to sharing them with the assigned driver. Advanced coordinate entry is available for operations or known pins. Route edits use optimistic versions; changes after departure require operations. Navigation coordinates do not change fares, property bookings or the agreed package itinerary. For a multi-property package, operations must set/review navigation points for the relevant leg; this release does not infer all property entrances or return routes from incomplete listing addresses.

ETA calls Google Routes with `TRAFFIC_AWARE`, masks to duration/distance/polyline, and uses the current driver position toward pickup or destination depending on trip phase. The server only returns a cached ETA with a fresh location, matching route version, driver and phase, and at most 60 seconds of cache age. An in-flight trip/route change invalidates the result. There is no invented straight-line speed ETA when the provider is absent. Foreground trip panels poll location every 15 seconds and display freshness and provider calculation time. Google route/Geocoding usage, location permission and public HTTPS deployment must be configured for live use.

## Receipts and fiscal documents

An immutable numbered payment receipt snapshots the authoritative received amount/reference for the customer. It is clearly labelled **not a fiscal tax invoice** and can be printed/saved from the browser. Current refund status is displayed separately. Package companion zero-value payments do not generate duplicate cash receipts. The supplier's reviewed fiscal policy is versioned and has no assumed VAT rate: operations supplies the legal supplier details, provider tax category, inclusive basis-point rate and evidence of the tax treatment review.

Fiscal submission freezes that policy and calculates gross/net/tax using integer minor units and inclusive rounding. Existing quoted customer prices do not receive undisclosed extra tax. A document becomes `ACCEPTED` only after the gateway supplies actual invoice/control evidence. Crediting a settled refund requires an accepted original invoice and retains its original tax treatment even if the current policy changes. The gateway must map these records plus any additional verified buyer/merchant details to its approved eTIMS integration. Configuring a policy or receiving a generic gateway response alone is not a legal compliance certification.

Official integration references consulted for this implementation:

- [Safaricom M-Pesa Express](https://developer.safaricom.co.ke/apis/MpesaExpressSimulate): merchant-initiated collection product; account-specific integration remains external.
- [Google Routes computeRoutes](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes): endpoint, request and response masks.
- [Google traffic-aware routing](https://developers.google.com/maps/documentation/routes/config_trade_offs): traffic-aware duration semantics.
- [Google Geocoding](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding): address lookup endpoint and result geometry.
- [KRA system-to-system integration](https://www.kra.go.ke/business/etims-electronic-tax-invoice-management-system/learn-about-etims/etims-system-to-system-integration): OSCU/VSCU and the applicable external onboarding process.

## API and validation

All user APIs live under `/api/operations` and use the existing session/same-origin boundary. Main resources: `capabilities`, `collections`, `payment-events`, `communications`, `communications/verify`, `receipts`, `fiscal-policy`, `refunds`, `reconciliations`, `jobs`, `geocode`, and `trips/:kind/:id/{route,location,eta,progress}`. Only `POST payment-events` uses the signed gateway identity instead of a user session. Administrator recovery actions require their normal role checks. Raw signed payloads are not logged to the browser or ordinary audit details.

Migration 18 creates only the V5 tables/indexes. Earlier migration checksums are unchanged. Existing bookings, package policies, identity reviews and service reports remain intact. Back up the SQLite database through the existing backup command before rollout.

Validation commands: `npm test`, `npm run check`, `npm run test:agent`, `npm run test:browser`. The V5 browser journey uses synthetic gateway acknowledgements, signed synthetic receipts, simulated GPS, synthetic road data and test tax policy. No passing test is evidence that live credentials, upstream signatures, sender approvals, mobile background tracking or fiscal certification have been supplied.
