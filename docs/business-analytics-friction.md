# Business Analytics and Friction Hunter

Two deterministic agents join the registry: `business-analytics-agent` and `friction-hunter-agent` (16 specialists total). The administrator's **Business analytics and friction** panel creates saved `operations-intelligence` assessments through the existing persistent agent runtime. No provider credentials are needed.

## Operating the report

1. Sign in as an administrator, open Business analytics and friction, and choose From/Through dates.
2. Generate a report. It records one source snapshot shared by both agents, preserving the period, generation time, source counts and definitions.
3. Review conversion, money movements, payout/refund liabilities and performance tables.
4. Inspect a finding to open the associated source records, 50 at a time. These records are current; they may differ from a previously saved assessment.
5. Use the existing booking, dispatch, support or reconciliation workspace to investigate and act. Reports never perform remediation or contact customers.

Dates use Africa/Nairobi, inclusive calendar days. The default is the last 30 days including today; the maximum is 366 days. Malformed, reversed or future-ended ranges are rejected. Today is necessarily incomplete. Zero denominators produce an unavailable percentage, not 0% conversion.

## Metric definitions

| Metric | Population and timing |
| --- | --- |
| Viewing requests | Property requests created in the selected period. |
| Accepted at least once | Those requests with a linked booking, even if later cancelled. |
| Completed viewings | Those requests whose linked booking currently has completed status. |
| Request conversion | Accepted or completed requests divided by all requests in that same creation cohort. |
| Transport | Standalone viewing bookings, one master booking per viewing package, plus Ride2Go trips created in the period. Companion property stops are excluded. |
| Agent performance | Up to 50 agents by request volume: request, accepted and completed counts for the creation cohort. |
| Driver performance | Up to 50 drivers by completed count: currently assigned records and completed transport from the creation cohort. This is not an offer acceptance rate or a driver safety score. |
| Ledger | Entries posted during the date range, grouped by currency, direction and event type. Refund-settlement debits remain separately visible. |
| Earnings allocations | Platform and beneficiary allocations created in the period, excluding VOID and DISPUTED entries. These are recorded allocations, not additional cash receipts. |
| Outstanding payouts | EARNED/PAYOUT_PENDING marketplace earnings created in the period, grouped by currency. This is not the all-time outstanding balance. |
| Pending customer refunds | Currently refund_pending payments on viewing, Ride2Go, property-service and commerce records created in the period. |
| Search conversion | Measured signed-in searches created in the period with at least one recorded selection, divided by all measured signed-in searches in that cohort. |

**Collections are not company revenue.** The report does not calculate recognized revenue, profit, tax due or independently verified bank balances. It does not sum different currencies. Historical payments without ledger entries cannot be reconstructed from this report. Current statuses are not historical month-end statuses; regenerate a snapshot to see changes.

## Friction rules v1

| Finding | Evidence rule | Priority |
| --- | --- | --- |
| Pending agent decision | REQUESTED viewing is at least 24 hours old or its slot has started. | Medium |
| Expired viewing hold | Unpaid, non-terminal master/standalone booking with a passed hold deadline. No lazy expiry mutation is invoked by reporting. | High |
| Expired request | Request is currently EXPIRED. | Medium |
| Dispatch review | Viewing or Ride2Go offer currently rejected, expired, failed, no-driver-available or requiring reassignment. This is not the historical count of every failed attempt. | High |
| Paid viewing awaiting assignment | Confirmed, paid viewing was verified at least 30 minutes ago and has no live assignment/offer. This particular rule covers property viewing transport, not Ride2Go. | High |
| Support attention | Unresolved/non-cancelled case stale for 24 hours, or currently high/critical severity. | High |
| Pending refund | Current refund_pending status on a selected-period service record. | High |
| Provider review | Integration job currently in REVIEW. | High |
| Cancelled transport | Current cancelled status in the transport cohort. No cause is inferred. | Medium |
| No recorded selection | Signed-in search with results, older than 24 hours, has no selection record. | Low |

Findings are ordered by priority, then affected record count. They may overlap. Counts must not be summed as unique customers, and no finding proves causation. Thresholds are explicit operational heuristics, not contractual SLAs. Missing evidence or no findings does not establish that operations are healthy.

## Minimal discovery measurement

Migration 23 adds server-recorded signed-in search events, selection events and the collection start timestamp. It does not backfill historical activity. Anonymous searches and administrator/driver/agent searches are not collected.

A successful signed-in customer search records customer ID, returned listing IDs (up to 100), result count and timestamp. It does not store search text, contact details, location coordinates or documents. The response includes an opaque measurement ID. Choosing a returned property with available slots submits a selection event. Its endpoint verifies ownership, membership in the original results and a 24-hour measurement window. Retries are deduplicated. Measurement delivery failure does not block booking.

“No selection” may reflect telemetry failure, later action, another channel, unavailable slots or true abandonment. The report cannot distinguish those causes. It does not attribute bookings or purchases to searches. Search-to-booking attribution and anonymous session analysis are not implemented.

## Authorization, evidence and persistence

- Only administrators can generate operations-intelligence reports and inspect `/api/admin/analytics/evidence`.
- Existing agent history remains owner-scoped. History is additionally filtered by current role so demoted administrators cannot retrieve saved business snapshots through list responses.
- Report snapshots use a SQLite read transaction. Node inputs cannot be supplied as browser-provided counts, amounts or findings.
- Evidence categories are a server-owned whitelist; values never become SQL identifiers. Records exclude passwords, contacts, private document contents, pickup codes and payment references.
- Read-only evidence inspection uses POST with existing JSON/same-origin protections. Bodies accept category, date range and a bounded non-negative offset; page size is fixed at 50.
- Saved reports share the existing assessment rate limit, payload-bound idempotency, expiry, review history and restart recovery. Expired reports remain timestamped historical snapshots; a new report loads fresh records.
- Measurement and assessment retention follow the deployment database retention policy. There is no new external analytics provider or automatic training system.

## Validation

`tests/business-analytics.test.js` verifies date boundaries, conversion denominators, package deduplication, current-state semantics, currency separation, payout allocations, friction thresholds, evidence pagination, measurement provenance, duplicate selections, admin authorization and role demotion. `tests/analytics-browser.cjs` covers report generation, findings, source inspection, date changes, saved snapshots, mobile layout and logout privacy.

AI Critic/Reasoning Verification and cross-service Data Quality remain the next separate agent phase, followed by shared Memory & Learning. This reporting release does not claim those capabilities.
