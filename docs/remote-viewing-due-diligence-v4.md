# V4 — Remote viewing, due diligence and transaction progression

V4 adds a connected, manually operated property-service workflow. It does not provision a video provider, collect money automatically, perform official registry searches, issue legal clearance or execute rental/sale contracts.

## Customer journey

Search verified supply and choose **Remote viewing** or **Due diligence**. Describe the questions to resolve. Remote bookings store UTC instants and the customer's IANA timezone; the browser labels date inputs with the device timezone. Sessions last up to two hours and can be requested up to 90 days ahead.

For remote tours, the owning agent confirms availability before operations can quote. Operations quotes the fee, deliverables and delivery deadline. Customer acceptance freezes the displayed scope and fee. A quote lasts at most 24 hours and the accepted payment hold at most 30 minutes; both end no later than the remote session start. Expired requests cannot capture funds. Rebook expired cases with a new request key.

Operations verifies an actual received transfer using its exact whole-KES amount and unique reference. Verification, shared reference claim, financial ledger and case confirmation commit atomically. No property booking, driver assignment or transport charge is created for these services. These fees are separate from rent, purchase price, ride charges and customer viewing credits.

The service calendar rejects overlapping remote bookings and accepted physical viewings for the same agent/property. Single-property and package acceptance/rescheduling check the remote calendar too. A quote holds remote availability until expiry. If a paid remote session needs a different time, cancel/refund and create a replacement request; V4 does not silently move an accepted appointment or retain its charge against different terms.

## Private video and recordings

An administrator configures exact HTTPS provider hostnames and a description of the provider arrangement. Configuration starts empty. Agents/operations attach an independently created room only after payment. They must attest to participant-only provider access and recording disabled by default. The app never fetches these URLs or embeds provider content.

Only the customer and owning agent can retrieve a room link, from 15 minutes before the session until its end. Links are omitted from case lists, general case reads, notifications and audit records. Operations staff who are not the owning agent cannot retrieve participant links. Revoked property verification blocks session access and start. An operations-approved hostname is not proof of provider access control: actual invitation/authentication settings must be configured in the provider.

Both participants must consent before service start for a recording to be attached, and both must still consent when attaching or retrieving it. Later consent cannot authorize an earlier unconsented tour recording. Recordings are retained through the app for at most 30 days. Withdrawing consent immediately removes the app's stored playback link and flags provider removal as required. Operations must delete provider copies and disable recording externally; there is no provider deletion, recording-control or retention-enforcement API connection. Already retrieved URLs cannot be recalled by Ride2View. Provider-side participant authentication and deletion remain essential operational responsibilities.

The owning agent records attendance and an immutable agent-authored summary. This is not an AI-generated tour summary. Participants can add subsequent questions and answers. Hosted WebRTC, provider webhooks, video uploads/transcoding, automatic transcripts, AI summaries and production recording storage remain future integrations.

## Paid due diligence

Operations assigns an existing administrator/reviewer account and records competence and independence assessments. The property's owning agent cannot serve as its due diligence reviewer. The assigned reviewer starts paid work, collects evidence and drafts structured findings: topic, CLEAR/CONCERN/UNVERIFIED result, rationale and a document ID belonging to this case. Each report includes a summary and explicit limitations.

A different administrator, also independent of the owning agent, reviews and releases the report. Self-release is rejected. Reassigning the reviewer clears the old draft. Release freezes the report; V4 does not silently amend released reports. Any material correction requires a new assessed case and explicit customer communication. Production operators must provision at least two appropriate administrator accounts through their existing controlled account/bootstrap process; customer registration cannot create administrator accounts. No default reviewer credentials are seeded.

Customer documents and reviewer documents are accessible only to the case customer and administrators. An agent can upload and retrieve their own case documents but cannot access the customer's/reviewer's evidence, report draft or released report. Customers see the report only after independent release. PDFs/PNG/JPEG are validated, limited to 2 MiB, hashed, and served as sandboxed attachments with authenticated access and download auditing. These uploads do not receive malware scanning in this release.

The service is evidence-based operational review, not government ownership verification or a title guarantee. Qualified professionals and real registry evidence are needed for legal conclusions. No automated legal verdict is issued. Fees are case-specific operations quotes; no invented statutory fee, subscription or VAT invoice policy is introduced.

## Contact and rent/buy outcomes

After service completion, the customer explicitly authorizes an agent contact channel and instructions. Until then, negotiation writes are rejected. The shared discussion stores actor and timestamps. The customer can withdraw contact permission or close the enquiry.

A customer may record a rent/buy agreement only after an authorized negotiation, with their own uploaded case evidence and explicit outcome confirmation. Agreement outcomes are immutable and close further negotiation writes. This records a customer-reported result; it does not send external messages, sign a contract, register title, collect rent or purchase money, or automatically earn/pay agent commission. Customer-provided contact details are visible to the owning agent only while authorized, although information already viewed cannot be recalled.

Questions and negotiation notes are shared among the case participants and operations; private due diligence findings belong in the report/evidence workflow.

## Cancellation and recovery

Before work starts, customer, owning agent or operations may cancel for a full refund. After work starts, only operations may cancel an undelivered service, also retaining a full refund liability. Completed services cannot be casually cancelled or refunded through this workflow; investigate service disputes through operations/support. Cancellation revokes app-held session/recording links.

A paid cancellation becomes `refund_pending`. Operations records the actual external refund transfer with an exact amount and fresh shared reference. Refund settlement and a debit ledger entry commit together. Payment/refund retries are reference-bound and idempotent. This does not initiate a bank/M-Pesa transfer. The application's existing fiscal integration remains pending; these records are not VAT invoices.

## API

All routes are authenticated and use the existing same-origin JSON boundary.

| Route | Purpose |
| --- | --- |
| `GET/POST /api/property-services` | Scoped case list / customer request with payload-bound idempotency key |
| `GET /api/property-services/:id` | Scoped case and safe metadata |
| `GET/POST /api/property-services/config` | Read provider arrangement / administrator creates immutable configuration version |
| `POST /api/property-services/documents` | Private case evidence upload |
| `GET /api/property-services/documents/:id` | Authorized attachment download |
| `POST /api/property-services/:id/:action` | Optimistic-version case action |
| `POST /api/property-services/:id/room/access` | Time-windowed participant room URL |
| `POST /api/property-services/:id/recording/access` | Consent/retention-gated participant playback URL |

Actions: `confirm`, `quote`, `accept`, `verify`, `assign`, `room`, `consent`, `start`, `complete`, `recording`, `report`, `release`, `question`, `contact`, `negotiate`, `agreement`, `close`, `cancel`, `refund`. Every mutation is authorized server-side; UI visibility is not an authorization boundary. Action requests include the current `version`, except reference-identical transfer retries and link reads. Service events, audit entries and internal notifications commit with state changes.

Migration 17 creates only new service tables and indexes; historical migration definitions remain unchanged. Existing accounts, physical bookings, payments, driver verification and Ride2Go data remain intact. SQLite backup procedures still apply. Database files contain private evidence and provider URLs and must remain restricted to authorized operators.

## Validation and remaining rollout work

`npm test`, `npm run check`, `npm run test:agent`, and `npm run test:browser` cover regressions plus service payment/refund atomicity, privacy, role/version controls, independent report release, shared calendars, consent, expiry, negotiation and a complete browser journey. Provider URLs, evidence and transfer references in tests are synthetic.

Before live operation, configure and test the actual provider's invitation/recording/deletion controls, staff independent qualified reviewers, publish actual case quotes, and use real externally received/refunded funds. External video/payment integrations, notifications, registry access, AI summaries and fiscal invoicing remain explicit integration work, not completed production services.
