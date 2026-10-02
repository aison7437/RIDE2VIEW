# Customer Profile & Viewing Journey V2

This release connects one to three published properties into an operations-reviewed viewing package. It supplements the single-property flow and uses the same payment and dispatch authorities.

## Customer and operations flow

1. Save city, budget and rent/buy preferences, then contact phone, pickup address, contact preference and optional accessibility instructions. Preference and contact changes have a private history. Contact preference does not send external messages.
2. Add up to three distinct properties in visit order. Choose future availability, one to four named participants, General or VIP tier, and optional return. Qualification is a city/budget/transaction match, not KYC or financial underwriting.
3. Operations reviews transfer distances and transfer times between properties and records the evidence reference. An itinerary must allow each viewing to finish plus the reviewed transfer time before the next viewing begins. These are reviewed estimates, not live traffic, GPS or navigation.
4. The customer sees an itemized, versioned quote and its cancellation policy, then explicitly accepts. Quotes last up to 15 minutes. Accepted requests lock every slot atomically and notify each owning agent. Initial agent confirmations expire after 24 hours or before the first viewing, whichever is sooner.
5. Each agent confirms their own stop. A decline cancels the entire package. Only after all confirmations does the server create bookings, reservations and one payable package charge. All property and agent conflicts are checked again. Payment holds expire after 30 minutes or before the first viewing, whichever is sooner.
6. Operations verifies an actual received payment reference, or a configured provider captures it. Payment and every property reservation commit in one transaction. Revoked or expired property verification blocks capture. A failed stop confirmation or payment mutation rolls back the entire transaction.
7. Operations offers the master booking to one verified driver. Driver acceptance binds every stop to that driver. The driver starts transport, confirms each completed stop in order, and finishes the package including the agreed return. These actions are manual operational confirmations; they do not measure arrival, distance or GPS location. Customer/agent outcomes and lead progression remain per property.
8. Customer or operations can reschedule all properties together before the driver starts pickup. Agents must reconfirm all replacement times within 30 minutes; a paid package keeps its original charge. Property order, tier and route remain unchanged; a different route requires a new package. Offers are canceled and a new dispatch offer is required after reconfirmation.
9. Before trip start, the customer or operations may cancel the full package for a cash refund or viewing credits. After transport starts, cancellation requires operations recovery rather than an invented partial-refund formula.

## Prospective pilot policy

Earlier discussions contained conflicting package and waiting examples. Version 0 is an explicitly labeled pilot, displayed to the customer for acceptance, rather than a claim that those examples were finalized.

| Component | Pilot rule |
|---|---|
| Base | One fare for one to three properties: General KES 650; VIP KES 2,000 |
| Inter-property mileage | KES 7/km from reviewed distances in integer metres |
| Optional return | 50% of the tier base |
| Waiting | Disabled by default; configurable rate per started two-minute block after configured grace |
| Waiting estimate | Quoted and accepted in advance; this release does not meter or add surprise post-trip charges |
| Rounding | Calculate in integer minor units, round the final charge up to whole KES and display the difference |
| Cancellation | Full cash refund or credit before trip start |
| Women/Students | Rates retained in policy (KES 750/450), but package creation is blocked pending verified eligibility and suitable driver supply |
| Tax | No Kenyan VAT invoice or fiscal compliance claim; fiscal integration remains pending |

Operations may publish an immutable new policy version using `POST /api/journeys/pricing`. New quotes use the latest version. Existing quotes retain their complete policy snapshot, and customers must accept the exact current journey revision. Pricing policy changes do not rewrite accepted journeys.

## Credits and refunds

Viewing credits are private KES-denominated liabilities in an append-only entry table. The customer opts into using them when accepting a quote. They are consumed atomically when all agents confirm, up to the quote total. A fully funded credit booking requires no external payment. Cancellation or expiry returns reserved credit exactly once. On paid cancellation, existing credits are restored and the cash component becomes either new viewing credit or a pending cash refund.

A pending refund is not a bank transfer. Operations performs the transfer externally, then records its exact amount and actual transaction reference. The reference must be unused across the shared payment reference registry. Settlement writes a debit/reconciliation ledger entry and marks the package payment refunded in one transaction. Repeated identical settlement is idempotent. Credit cancellation cannot also claim a cash refund.

## API

| Endpoint | Actor and purpose |
|---|---|
| `GET/PUT /api/customer/details` | Customer contact/pickup details, optimistic version, profile and qualification history |
| `GET /api/customer/credits` | Customer credit balance and entries |
| `GET/POST /api/journeys/pricing` | Public current pilot policy; admin publishes new version |
| `GET/POST /api/journeys` | Scoped journey list; customer creates a draft with idempotency key |
| `GET /api/journeys/:id` | Scoped journey, itemized quote, stops, timeline and payment/refund state |
| `POST /api/journeys/:id/quote` | Admin route review and versioned quote |
| `POST /api/journeys/:id/accept` | Customer accepts displayed policy and optional credit use |
| `POST /api/journeys/:id/stops/:position/confirm` | Owning agent/admin accepts or declines their stop |
| `POST /api/journeys/:id/reschedule` | Customer/admin changes every slot in one transaction |
| `POST /api/journeys/:id/cancel` | Customer/admin cancels full package before trip start |
| `POST /api/journeys/:id/start` | Assigned driver/admin starts package transport |
| `POST /api/journeys/:id/stops/:position/complete` | Assigned driver/admin confirms the next stop |
| `POST /api/journeys/:id/finish` | Assigned driver/admin completes transport after every stop |
| `POST /api/journeys/:id/refund` | Admin records completed external refund transfer |

Mutations of plan, quote, confirmations and stops carry the current `version`. Conflict responses require a refresh. Idempotency keys cannot be reused for a different plan. Agent journey responses include only their own property stops, without customer pickup/contact/participants, package payment, refunds or other agents' properties. Driver responses require an active or completed assignment.

The first stop is the master booking with the complete net cash charge. Other bookings have zero amount and are internal companions, not extra charges or external receipts. Bookings lists show one master per package. Standalone acceptance, rescheduling, cancellation, completion and companion payment/dispatch are blocked for package legs. Per-property outcomes, commissions and reviews continue through the existing supply authority.

## Persistence and verification

Migration 15 adds package, stop, event, pricing, private detail/history, credit and refund tables. Migration 14 is unchanged. Existing profiles are backfilled into history on upgrade; legacy bookings, payments and publication checks are retained. Request expiration excludes package legs so the package authority can release all stops and credits together. Expiry is reconciled on journey reads/mutations, not by a new background timer.

Automated coverage includes pricing/rounding, revision conflicts, quote expiry, authorization/privacy, injected rollback, stale verification, provider capture, one assignment, ordered stops, rescheduling without rebilling, full-credit payment, mixed credits on expiry, refund replay and policy snapshot stability. The browser suite exercises the complete three-property journey across all four roles, outcomes and mobile layouts, alongside the existing single-viewing journey.

## Remaining original vision

This release is not the complete original Ride2View program. Driver onboarding/KYC, Ride2Go, verified Women-Only supply, student verification/pooling, remote/live tours, due diligence, private/NDA viewing, GPS/maps/ETA, external communications, subscriptions/referrals and Kenyan fiscal integration remain separate programs. Existing media support is HTTPS links, not hosted live video production. External service operation still requires configured providers and credentials.
