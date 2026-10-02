# Agent Portal & Verified Property Supply V1

This program supplies the post-discovery foundation for Discover → qualify → verify → schedule → transport → view → due diligence → negotiate/contact → rent/buy. Ride2Go remains a shared mobility program; this change does not implement standalone taxi booking.

## Delivered workflow

Agent registration → profile → identity and agency evidence → independent operations reviews → property draft → marketing and ownership evidence → independent operations reviews → publication review → availability slots → qualified customer request → agent acceptance → payment and reservation confirmation → existing dispatch/driver journey → viewing outcome → lead follow-up and commission record.

Customer accounts cannot create listings. Agent actions are restricted to their own supply, requests and leads. Review actions belong to administrators. Every state-changing supply operation is audited; private document downloads are audited too.

## Verification and publication

| Check | Target | Evidence / purpose |
|---|---|---|
| Identity | Agent account | Private identity/KYC documents and submitted legal profile |
| Agency | Agent account | Agency registration documents and submitted registration profile |
| Marketing | Property | Evidence of authority to advertise the specific property |
| Ownership | Property | Reviewed documentary ownership evidence |
| Publication | Property | Final listing approval after required checks |

Checks move through DRAFT → PENDING → APPROVED / REJECTED. APPROVED or PENDING checks can be REVOKED. New submissions carry increasing revisions. Reviewer decisions must match the current revision, include a rationale, and include a future explicit-offset expiry for approval. Expired checks fail publication eligibility even when old compatibility flags remain set.

Agent profile edits reset identity/agency checks and unpublish that agent's inventory. Property edits reset marketing, ownership and publication checks. Media edits reset publication review. Availability toggles cannot bypass verification. Administration's old blanket agent/listing approval paths reject the operation and direct callers to documentary reviews.

Private evidence is stored in SQLite as immutable PDF/PNG/JPEG bytes, bounded to 2 MiB per document and 100 documents per account. Evidence must belong to the target agent and match the review kind. The document API requires an authorized session and serves attachments with a sandbox content policy. Public discovery excludes private documents, check evidence and review notes. HTTPS media URLs are stored as links; the server does not fetch them. Hosting must protect the database and backups containing private evidence. Automated identity checks, government/land-registry verification and document malware scanning are not integrated.

## Availability, requests and money

Availability slots use offset-aware timestamps normalized to UTC. The browser labels entry times as device local time. Slot durations are positive and at most 24 hours. Active requests occupy a slot. Acceptance checks the agent's calendar across properties and existing property reservations.

Customer qualification requires a saved city, budget and rent/buy goal matching the selected listing. Each request retains that qualification snapshot. Bedroom preference is stored, but is not a hard eligibility rule. This is preference/budget matching, not financial underwriting or identity verification.

Acceptance commits the request, booking, payment, reservation, links, reservation event, audit and notification together. The hold lasts 30 minutes or until viewing start. Expired holds release request availability on read/request processing; they cannot be captured as payable bookings. Expired unpaid bookings remain visible for operations cancellation rather than being silently deleted.

Managed payment verification confirms the reservation inside the existing payment transaction. Signed provider processing retains its inbox/event/intent atomicity. Acceptance and confirmation failure injection tests prove that no partial booking/payment/reservation state commits. Existing cancellation coordination handles dispatch, reservation and payment recovery; paid cancellation records refund review, not an actual refund transfer.

Rescheduling updates the linked reservation and booking time atomically. Active dispatch offers/assignments must be cancelled before rescheduling. Agents notify the customer when changing a time. Completed viewings accept one immutable outcome and one customer review. Follow-up and negotiation are lead stages; a won lead requires agreement evidence in notes and a completed viewing. A won lead is a recorded outcome, not proof that Ride2View completed legal conveyancing.

Commission amounts are agreed records entered by operations, not a hard-coded commission percentage. Operations can record EARNED, PENDING, DISPUTED and PAID statuses. A paid record requires pending status, evidence and an unused shared transaction reference. It records a ledger debit and pending reconciliation; it does not send funds or automatically verify a bank transfer.

## API

All endpoints below use the existing session and JSON/origin controls. Uploads alone allow a larger bounded JSON body.

| Endpoint | Access / behavior |
|---|---|
| `GET /api/agent/dashboard` | Agent's inventory, requests/calendar, leads, payments, commissions, metrics and reviews; admin sees all supply |
| `PUT /api/agent/profile` | Agent saves legal/contact/agency profile and renews review |
| `POST /api/supply/documents` | Agent/admin uploads `{kind,name,mime,data}`; data is base64 |
| `GET /api/supply/documents/:id` | Evidence owner or admin downloads private evidence |
| `POST /api/supply/checks/:kind/:targetId/submit` | Submit matching `documentIds`; publication needs no document IDs |
| `GET /api/admin/supply-reviews` | Admin review queue/history with evidence metadata |
| `POST /api/admin/supply-reviews/:kind/:targetId` | Admin decision, rationale, revision and approval expiry |
| `GET/POST /api/listings` | Public eligible supply / verified agent creates a draft |
| `PATCH /api/listings/:id` | Owner/admin edits property or availability |
| `POST /api/properties/:id/media` | Owner/admin adds photo/video/tour360 HTTPS link |
| `DELETE /api/properties/:id/media/:mediaId` | Owner/admin removes media |
| `GET/POST /api/properties/:id/slots` | Public open slots on eligible listings / owner/admin adds slots |
| `DELETE /api/properties/:id/slots/:slotId` | Owner/admin disables an unoccupied slot |
| `GET/POST /api/viewing-requests` | Scoped calendar / customer requests `{listingId,slotId,tier,idempotencyKey}` |
| `POST /api/viewing-requests/:id/accept` | Owner/admin atomically creates payable booking |
| `POST /api/viewing-requests/:id/decline` | Owner/admin declines pending request with reason |
| `POST /api/viewing-requests/:id/reschedule` | Owner/admin selects an available `slotId` |
| `POST /api/viewing-requests/:id/cancel` | Customer/owner/admin cancels; accepted requests use cancellation coordinator |
| `POST /api/viewing-requests/:id/outcome` | Participant records completed-viewing outcome |
| `POST /api/viewing-requests/:id/review` | Viewing customer records rating and comment |
| `GET /api/agent/leads` | Agent-scoped leads; admin sees all |
| `PATCH /api/agent/leads/:requestId` | Owner/admin updates stage/notes |
| `GET /api/agent/commissions` | Agent-scoped commission records; admin sees all |
| `POST /api/admin/commissions/requests/:requestId` | Record agreed commission amount/evidence for won lead |
| `PATCH /api/admin/commissions/:id` | Record pending/disputed/manual paid status and evidence |
| `GET/PUT /api/customer/profile` | Customer preference lifecycle |
| `GET /api/customer/saved-properties` | Customer's saved inventory and current publication eligibility |
| `PUT/DELETE /api/customer/saved-properties/:id` | Save/remove property |

`POST /api/bookings` no longer creates a direct payable viewing. Callers must request a published availability slot and obtain agent acceptance. Existing bookings, payment verification, dispatch and cancellation endpoints remain usable.

## Migration and validation

Schema migration 14 adds the supply/profile/evidence/media/calendar/lead/outcome/commission/review tables. It keeps existing users, properties, bookings and financial records. Legacy listing publication flags are cleared once because they have no documentary review record. Agents must complete evidence reviews before re-publication; existing bookings/payments are preserved. Repeated startup does not repeat quarantine. Back up the database before deployment; application rollback after migration requires a compatible restore because older builds reject newer schema versions.

Validation includes the complete persistent journey, migration data preservation/idempotency, evidence privacy, role/ownership boundaries, stale review rejection, expiry, qualification snapshots, request replay conflicts, calendar overlap, acceptance/payment rollback, rescheduling, cancellation/refund state, outcome/review completion gates, shared-reference commission replay protection, and Chromium tests for customer, agent, reviewer and driver flows plus mobile layouts.

## Remaining programs

Live remote sessions/recordings and AI tour summaries; full paid due diligence and external title checks; contact/messaging and offer/closing authority; standalone Ride2Go; canonical packages/return/waiting/subscription pricing; verified driver onboarding and tier enforcement; live maps/GPS/ETA; external communications; fiscal invoices and real payout/refund integrations. Video/360 media links and lead stages support these later programs but do not replace them.
