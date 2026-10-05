# Security, Market and Sales Intelligence

These three deterministic specialists bring the registry to 22 implementations plus the Journey Orchestrator. They run through the existing persisted assessment/review workflow and never change operational records or send messages. No external provider is required for the internal checks described here.

## Security Intelligence — administrators

Migration 25 begins aggregate request-failure collection. Minute buckets retain only timestamp, signal kind and count. The HTTP error boundary records failed sign-ins (401 on the login endpoint), authorization/origin denials (403), rate-limit responses (429) and server errors (5xx). Successful logins, submitted emails, credentials, request bodies, IP addresses and session tokens are not collected. Buckets older than 30 days are pruned on subsequent signal writes.

The report covers the previous 24 hours including the first whole minute. Review thresholds are 10 failed sign-ins, 10 access denials, one rate-limit response, one server error, or more than 10 unexpired sessions per account. These fixed thresholds are operational heuristics, not statistically calibrated attack detection. Session counts are not device counts. Evidence inspection exposes only aggregate buckets or account identifiers with session counts.

Telemetry errors do not alter the HTTP response. Their count is reported for the current process lifetime; it resets on restart. The collection-start timestamp is durable. No historical failures are invented. An empty report does not establish that a system is secure. This is not a penetration test, endpoint-security feed, malware detector or independently verified incident attribution. Account blocking and session revocation remain separate authorized actions.

## Internal Market Intelligence — administrators

The report groups currently public Ride2View inventory by normalized city, rent/sale and bedroom count. It shows listing counts, minimum/maximum/median asking prices in KES, and viewing requests created in the previous 30 days for that currently public inventory. Future-dated requests are excluded. Cancelled, declined and repeat requests remain part of this demand count and are disclosed as such.

Groups with fewer than five listings are labelled SMALL_SAMPLE; larger samples remain descriptive. Rent and sale prices are never combined. Rental periods are not standardized by this report and must be checked in the listing terms. Source inspection lists current public properties and their recorded asking prices, without owner contacts or private documents.

This is not a representative survey of Kenya's property market, transaction-price valuation, price trend, appreciation forecast or investment recommendation. External market datasets and historical inventory/price series remain unconnected. A listing that becomes unpublished leaves the current cohort; this can change a later report without any change in underlying historical requests.

## Sales Intelligence — property agents

Only open leads attached to properties currently owned by the requesting agent enter a new report. WON and LOST leads are excluded. Counts include all eligible open leads; the review queue shows at most 100, ordered by:

1. Cancelled/declined/expired request status or invalid/future lead timestamp: inspect the record and consent/status first.
2. Recorded NEGOTIATING stage: inspect outstanding authorized steps.
3. At least 48 hours since a recorded lead update: consider whether follow-up is appropriate.
4. Other open leads.

Within a priority, older recorded updates come first, followed by the request ID for deterministic ordering. This is a review order, not a conversion probability. It infers no financial capacity, creditworthiness or sensitive personal traits. The agent receives request/listing IDs, stage, request status, timestamp and elapsed hours; customer contacts and private lead notes are excluded. No customer is contacted and no lead stage is updated by the assessment.

## Evidence, access and review

The assistant UI provides source inspection for all three reports. `POST /api/intelligence/{security|market|sales}/evidence` accepts an optional `offset` and returns 50 records per page. Security also requires `category: "signals" | "sessions"`. Categories and scopes are fixed; callers cannot provide SQL or another account ID. Security/Market require admin access; Sales requires the agent role and scopes records by property ownership.

Saved reports remain owned by their creator, with existing current-role checks, versioned acknowledgement and 15-minute assessment expiry. Source inspection shows current records, which may differ from the stored report. Source records and aggregate statistics are advisory evidence, not proof of external facts. Mark reviewed only acknowledges the report.

## Verification and holds

`tests/intelligence.test.js` covers thresholds, protected data, role/owner isolation, clock bounds, market statistics, source eligibility, lead prioritization, pagination, telemetry storage failure and migration integrity. `tests/intelligence-browser.cjs` covers admin and agent reports, source inspection, review, mobile width and logout clearing. Existing end-to-end suites remain regression gates.

**EV work is on hold at the user's request:** EV Dealership Assistant, EV telemetry and EV-specific predictive coaching are deferred. This phase makes no EV feature changes.
