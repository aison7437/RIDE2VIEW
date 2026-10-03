# Driver Onboarding, Verified Tiers and Ride2Go V3

This release replaces approval flags with a private, reviewed driver/vehicle evidence lifecycle, adds protected rider eligibility, and connects standalone Ride2Go trips to the same driver supply used by property viewings. Reviews are performed by operations. No government registry, biometric, university, map, GPS or payment collection provider is connected to this new workflow.

## Pilot onboarding policy

The checklist below is an explicit operating policy. It does not assert that a submitted document is genuine or that all Kenyan legal licensing requirements have been satisfied. Production transport operation requires the operator's regulatory assessment and real documentary review.

| Review | Required evidence and checks |
|---|---|
| Driver/vehicle | Identity, selfie, driving licence, commercial permit, vehicle registration, insurance and inspection; legal name, phone, licence number, plate, make/model and capacity |
| Women-Only driver | Current driver approval; declared female profile; identity and selfie evidence; explicit operations verification of Women-Only eligibility |
| Women-Only rider | Identity, selfie and eligibility evidence; explicit operations verification of Women-Only eligibility |
| Student rider | Identity and current enrolment evidence; institution name and explicit operations verification of enrolment |
| All reviews | Adult pilot confirmation, reviewer reason, exact pending revision, explicit adult eligibility verification and future expiry bounded by the earliest evidence expiry |

1. A driver saves a versioned profile, uploads private PDF/PNG/JPEG evidence (up to 2 MiB each), chooses the required documents and submits the review.
2. Operations downloads evidence through authorized, audited endpoints, checks identity and the vehicle, then approves/rejects with a reason and expiry. A female declaration alone cannot authorize Women-Only dispatch.
3. A reviewed driver explicitly goes online. Review, document and profile revisions are authoritative; the historical `users.verified` flag cannot grant eligibility by itself.
4. Profile/vehicle changes invalidate driver and Women-Only driver reviews and set the driver offline. Changing an existing profile/vehicle requires active assignments to be completed or canceled. Expired offers do not block editing. Legacy drivers may enter their first profile while a historical assignment exists, but pickup remains blocked until documentary approval. New evidence can be submitted for renewal. Revocation makes new offer/accept/start operations fail; a trip already in progress can still be completed safely.
5. Approval must cover the scheduled departure, not just the current time. Driver availability, vehicle capacity, rider eligibility and Women-Only driver eligibility are checked again at offer, acceptance and trip start.

Evidence files are private to the owner and operations. Uploads validate type signatures, size, expiry and ownership. Reviews reject stale revisions and evidence from another account. Changes and review decisions retain an audit/event history. Uploaded gender/identity evidence is not automatically classified or inferred by AI.

## Shared supply and protected tiers

Ride2Go and property viewings use the same online driver profiles. Offers and active assignments in either service block another assignment for that driver or the same registered vehicle plate. Response leases can expire or be rejected; operations then offers another eligible driver. There is no automatic partner fallback or live ETA claim.

Women-Only and Student tiers are enabled only for **one verified adult account holder** in this pilot. Property packages must name that verified account holder as their sole participant. Additional passengers are rejected rather than treated as verified companions. Women-Only requires a currently reviewed eligible female driver; a male or unreviewed driver cannot be used as fallback. Student pooling, minor/guardian travel and multi-rider eligibility remain separate work.

Single-property requests and viewing packages now enforce protected eligibility before request/accept/payment and dispatch. Expired or revoked enrolment/Women-Only reviews cannot bypass the payment/dispatch authorities. Package pricing retains its earlier immutable policy snapshots; this release does not rewrite accepted V2 prices.

## Ride2Go customer-to-driver workflow

1. A customer requests pickup, destination, contact phone, passenger count, tier, future departure within 30 days and optional return. No property/listing record is required. General/VIP support one to four passengers; protected tiers support one.
2. Operations first publishes a versioned Ride2Go policy. **No live default fares are seeded.** Earlier prototype prices were inconsistent and are not treated as commercial authorization. Policy fields include the four tier bases, a per-kilometre rate, optional return percentage and waiting rate/grace. Waiting is zero in the UI until operations changes it.
3. Operations reviews the full route distance in metres, duration in minutes, any estimated additional waiting and the evidence reference. The customer receives a quote with the complete policy snapshot. It lasts up to 15 minutes or until departure, whichever is sooner.
4. The customer explicitly accepts the displayed price/cancellation policy. A pending payment and private pickup code are created atomically. Payment must be verified within 30 minutes or before departure.
5. Operations verifies an actual received payment transaction reference and exact quoted amount. Payment, the shared reference registry, capture ledger/reconciliation entry and trip confirmation commit together. Duplicate identical verification is harmless; reference replay and expired eligibility fail. This release supports manual verification for Ride2Go; it does not initiate external collections or advertise provider callbacks for standalone rides.
6. Operations offers the paid ride to an eligible online driver. The driver has 60 seconds to accept/reject. Acceptance rechecks driver/rider eligibility, vehicle capacity and conflicts across both services, then assigns the ride atomically.
7. Driver confirms arrival and starts the trip using the rider-provided six-digit code. Only the customer can retrieve that code. Driver/admin responses and audit events exclude it. Five wrong attempts lock the code; operations may reissue it against a recorded customer-verification recovery reason. Operations cannot bypass the driver start/code step.
8. Driver confirms completion, including the agreed return if selected. These are manual operational confirmations, not GPS proof of pickup or arrival. Customer sees the driver's name and vehicle; contact details are withheld from drivers until acceptance.

Fare calculation uses integer minor units: base + reviewed mileage + optional percentage of base for return + estimated waiting blocks after grace. The final amount rounds up once to whole KES, with the rounding difference displayed. No surprise post-trip waiting charge is generated. Quotes state that fiscal integration is pending; no VAT invoice is issued by this layer.

## Cancellation and recovery

Before trip start, customer/operations can cancel for a full refund of the verified cash charge. Offers and assignments are canceled together. Pending/unpaid requests expire without capturing money. A refund record is a liability, not a bank transfer: operations transfers money externally, then records its exact amount and unused actual transaction reference. Settlement writes the debit/reconciliation entry and marks the payment refunded atomically. Repeated identical settlement cannot issue a second refund.

After start, the cancellation endpoint requires operations recovery and does not invent a partial-refund formula. Ride2Go does not spend or issue V2 viewing credits in this release. Driver payouts/earnings are not inferred from customer fare; payout agreement and authority remain separate from trip completion.

## API

| Endpoints | Purpose |
|---|---|
| `GET /api/mobility/dashboard` | Driver/customer private profile, evidence and review state; admin review queue |
| `GET/PUT /api/driver/profile` | Driver profile with current `revision` |
| `PUT /api/driver/availability` | Driver online/offline toggle |
| `POST /api/mobility/documents`; `GET /api/mobility/documents/:id` | Private upload and authorized audited download |
| `POST /api/mobility/checks/:kind/submit` | Driver, Women-Only driver/rider or Student eligibility submission |
| `POST /api/admin/mobility-reviews/:subject/:kind` | Operations review against exact revision |
| `GET/POST /api/ride2go/pricing` | Current policy/configuration state; admin publishes a new immutable version |
| `GET/POST /api/ride2go/trips`; `GET /api/ride2go/trips/:id` | Scoped list, request and state |
| `POST /api/ride2go/trips/:id/quote`, `/accept`, `/verify`, `/offer` | Reviewed quote, customer consent, manual capture and driver offer |
| `POST /api/ride2go/assignments/:id/respond` | Assigned driver's acceptance/rejection |
| `POST /api/ride2go/trips/:id/arrive`, `/start`, `/complete` | Driver state transitions; start requires pickup code |
| `POST /api/ride2go/trips/:id/resetCode` | Operations reissues code after documented recovery |
| `POST /api/ride2go/trips/:id/cancel`, `/refund` | Pre-trip cancellation and manual refund settlement |

Trip/quote/customer consent/state mutations carry the current trip `version`. Requests and offers have payload-bound idempotency keys. Users cannot read another customer's trip; drivers only see their active offer/assigned/completed rides. Contact is hidden before acceptance, and payment/refund/quote/event details are hidden from drivers. Agents do not receive mobility evidence or ride access.

## Migration and verification

Migration 16 adds mobility profiles, private evidence, review history, standalone pricing/trips/payments/offers/events/start codes/refunds. It resets legacy driver approval flags while retaining users, bookings, payments and active trip records. Historical flags must undergo the new review before authorizing a new dispatch or pickup. Earlier migration checksums are unchanged. Trip/offer expiry is reconciled on reads and operations; no new background scheduler is claimed.

Automated checks cover privacy/roles, stale review and profile invalidation, evidence expiry through scheduled departure, immutable quotes and consent, protected eligibility at each stage, failed capture rollback, global reference/refund replay, cross-service dispatch conflicts, expired offers, private pickup codes and bounded retries/recovery, restart persistence and migration retention. Browser coverage includes profile resubmission, private evidence upload, operations review, online supply, configured pricing, quote acceptance, payment, driver acceptance, pickup-code start and completion, alongside the existing single-viewing and three-property journeys and mobile layouts.

Remaining original programs include Student pooling, driver earnings/payouts, live maps/GPS/ETA, external communications and collection adapters, SOS/incident transport recovery, remote/live viewing, private/NDA viewings, due diligence, subscriptions/referrals and Kenyan fiscal integration. Review records are an operational foundation, not a claim that those external services are connected or the full original vision is finished.
