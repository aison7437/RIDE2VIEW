# Persistent agent assessments

This release adds a signed-in assistant workspace, SQLite checkpoints and three specialists: Agent Assistant, Lead Qualification and Driver Coach. The registry now contains 16 specialist implementations alongside the Journey Orchestrator.

These are deterministic, evidence-based recommendation modules. No LLM or external inference service is required. Their scores are heuristic rankings, not calibrated probabilities. This release does not complete the full historical multi-agent vision.

## Working flows

| Workspace assessment | Specialists | Server-side evidence and limits |
| --- | --- | --- |
| Business analytics and friction review | Business Analytics, Friction Hunter | Admin-only saved report: date-filtered creation cohorts, ledger postings, evidence and operational review rules. See `business-analytics-friction.md`. |
| Property fit and viewing options | Lifestyle, Property, Lead Qualification, Scheduling | Published listings and the customer's saved profile. Selected-property availability excludes occupied slots and overlapping agent/remote appointments. Single viewing only; zero inter-stop travel is not a live ETA. Booking revalidates all rules, including protected-tier eligibility. |
| Property and lead assistant | Agent Assistant | Owning agent's publication state, photo counts, enabled future slots and lead stages. Up to 100 properties and 100 recent leads. No customer contacts or private evidence documents enter the agent. |
| Driver readiness and earnings | Driver Coach | Own eligibility, expiring reviews, open offers, completed transport records and recorded marketplace earnings. Package companion bookings are excluded from trip counts. No battery, driving-behaviour, charging or income prediction. |
| Viewing payment and recovery review | Transaction, Trust & Safety, Support Recovery when relevant; Mobility for admins | Access-checked booking and current payment record. Recorded amount overrides legacy tier recommendations. Only amount discrepancies produce payment anomaly signals; ordinary pending payments are not fraud. Empty risk signals do not establish safety. Idle-driver GPS supply is not connected, so Mobility excludes candidates lacking fresh locations. No invented ETA. |
| Compare available catalog items | RidePlate Commerce | Up to 100 available items in the selected category, one item per basket. Comparison uses confirmed stock and prices; delivery, preparation time and merchant reliability are unknown. This is not multi-merchant basket optimization. |
| Shipment capacity | Logistics | Customer-owned shipment class and declared weight. External carriers remain unavailable. |
| Property opportunities | Opportunity | Up to 100 published properties matched to saved city, goal, budget and optional bedrooms. Timing, trust score and cross-service value are not inferred; zero factors mean unavailable evidence. |
| Experiences | Experiences | No production experience feed is connected. Returns unavailable evidence rather than sample recommendations. |

All 11 existing specialists are reachable through these scoped assessments; this is not a claim that their entire intended production capabilities are connected. Public `/api/search` remains read-only and ephemeral. Signed-in assessments use the durable runtime.

## Persistence and recovery

Migration 22 adds `agent_workflows` and `agent_workflow_events`; prior migrations are unchanged. Every workflow stores owner, normalized request, payload hash, saved input and outputs, expiry, version and execution lease. No browser-supplied candidates, prices, verification flags or arbitrary agent names are accepted.

An account can create up to ten assessments per minute. An idempotency key is bound to the normalized request. Repeating the request returns the original run, including while it is running; reusing the key with different input fails. The API lists the latest 30 runs for the account.

The runtime checkpoints through the existing orchestrator store interface. A 60-second token-fenced lease prevents concurrent workers from overwriting each other. Each specialist has a five-second timeout; workflows execute sequentially. There are no external side effects in these tasks. After a crash, an expired execution lease is shown as `RECOVERABLE`; explicit resume repeats interrupted computations against the original saved snapshot and preserves completed nodes. A live worker cannot be stolen. Shutdown drains active work before closing SQLite.

Assessments expire 15 minutes after creation. Expired assessments cannot resume or be marked reviewed: create a new assessment to load new evidence. Historical reviewed/dismissed results remain clearly timestamped. There is no background queue or autonomous retry after semantic failures.

Review uses an optimistic version check and records `REVIEWED` or `DISMISSED`. **Review is acknowledgement only**, not approval to execute a recommendation. It never changes a booking, payment, dispatch assignment, publication, lead, shipment or order. Existing domain APIs remain responsible for current validation and explicit customer/agent/admin decisions. The generic `WAITING_CONFIRMATION` node label denotes a recommendation awaiting review in this workspace.

Workflow status `PARTIAL` means at least one specialist failed or lacked evidence; individual node failures identify the reason. `COMPLETED` means the assessment finished, not that the real-world journey finished.

## Privacy

Only the workflow's owner can retrieve, review or resume it; admins cannot browse another user's assessment. Workflow creation also checks the user's current role and ownership of referenced bookings/shipments. Inputs are not returned to the browser. No document bytes, pickup codes, contact details or payment references are needed by these workflows. Frontend output uses text nodes, clears on logout and fences asynchronous renders across account changes.

Assessment history is persisted, not a shared learning model. Existing explicit customer preferences supply personalization. There is no automatic inference of sensitive preferences, model training or cross-account memory. Database retention remains deployment policy; no new automatic deletion process is introduced.

## API

- `GET /api/agents/capabilities`: role-appropriate workflow choices.
- `GET /api/agents/choices`: own shipment references for the selector.
- `GET /api/agents/workflows`: own latest 30 assessments.
- `POST /api/agents/workflows`: `{workflow, idempotencyKey}` plus the selected workflow's `listingId` (optional), `bookingId`, `category` or `shipmentId`.
- `GET /api/agents/workflows/:id`: saved assessment and review events.
- `POST /api/agents/workflows/:id/resume`: recover an interrupted run.
- `POST /api/agents/workflows/:id/review`: `{version, decision: "REVIEWED" | "DISMISSED"}`.

The UI uses human-readable record selectors. Authenticated APIs apply the existing session, same-origin and request-size controls.

## Remaining agent program

Market Intelligence, Growth Hacker, Marketing Creative, SEO, Sales Intelligence, Partnership, Investor Relations, AI Critic/Reasoning Verification, cross-service Data Quality, dedicated Security Intelligence, shared Memory & Learning, Experimentation, Autonomous Improvement, Digital CEO and EV Dealership Assistant remain separate work. The new Lead Qualification specialist handles stated preference fit, not a full conversational sales concierge. Driver Coach does not implement EV telemetry or predictive coaching.

## Verification

`tests/agent-workflows.test.js` exercises account isolation, payload-bound retries, concurrent creation, recorded pricing, restart recovery, lease fencing, expiry, review versions, purchase/rental matching and honest unavailable providers. `tests/agents-browser.cjs` covers customer/agent/driver screens, saved reviews, mobile width and logout privacy. Existing booking/payment/browser suites remain regression gates.
