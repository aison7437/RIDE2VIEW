# AI Critic and Data Quality

The registry contains 22 specialist implementations plus the Journey Orchestrator. These two specialists use deterministic server-side rules and require no external inference provider. They produce recommendations and review records, never automatic operational repairs.

## AI Critic

Choose a completed, partial, reviewed or dismissed assessment from your own history, then run AI Critic. Expired and malformed historical journeys can also be examined. Critiques cannot target other critiques. The server rechecks the original workflow's current role and record access; even administrators cannot inspect another account's assessment. Saved inputs remain internal.

Checks cover node structure, output shape, source labels, confidence range, conflicting failure/success state, unsupported execution authority, analytics arithmetic and saved snapshot consistency. Specialist-specific checks compare property qualification, scheduling, driver selection, payment summaries and commerce quotes with their recorded inputs.

Selected live checks cover payment amount/status, public listing availability/price, saved customer preferences, the recommended slot's time and occupancy, and recommended inventory/price. These checks do not replace booking eligibility, complete calendar conflict checks, fresh dispatch or checkout validation. Current-state changes produce stale/unverifiable findings rather than asserting that the original assessment was wrong.

Findings identify the source workflow, version, node/path and SHA-256 journey hash. The hash fingerprints the reviewed content; it is not a digital signature. Source inspection shows the current saved assessment and both versions, which can differ after review. Missing provenance is incomplete evidence, not proof that advice is false. A matching source label or input does not establish external truth. Confidence values are not calibrated probabilities. Natural-language reasoning, legal evidence, provider truth and driving safety are not independently verified.

## Data Quality

Administrators can run a consistent database snapshot and inspect current matching records in pages of 50. Inspection is admin-only, uses a fixed whitelist of queries and exposes structured identifiers/state rather than document bytes or payment references. Inspection occurs later than the saved scan, so counts may change as operations continue.

The 16 rules check:

| Area | Rules |
| --- | --- |
| Viewing payments | Booking/payment amount mismatch; missing payment; missing active booking reservation |
| Commerce | Order/payment amount or currency mismatch |
| Finance | Ledger/payment amount or currency mismatch; positive-cash paid records missing a capture journal; reconciliation/ledger amount or currency mismatch; ledger entry missing reconciliation |
| JSON records | Invalid listing payload, driver profile, property-service case or workflow journey JSON |
| Verification | Approved publication lacking current marketing/ownership/publication checks; approved driver review with stale profile revision or expiry |
| Availability | Invalid slot timestamps or non-positive duration |
| Logistics | Delivered shipment without delivery proof or delivery-event evidence reference |

Counts can overlap and do not measure unique incidents. Missing historical journals warrant review, not an assertion that money is lost. Zero-cash viewing payments are excluded from the missing-journal rule. Expired reviews are not evidence of fraud. Public listing filters already enforce publication eligibility; a stale stored flag does not prove public exposure. These rules do not exhaust all schema relationships or inspect external ownership registries, banking systems, private documents or every driver evidence item.

`POST /api/admin/quality/evidence` accepts `{rule, offset}`. Workflow creation uses the existing `/api/agents/workflows` endpoint with `data-quality`, or `ai-critic` plus `targetWorkflowId`.

## Review and verification

Mark reviewed and Dismiss only acknowledge findings. Existing domain APIs remain responsible for corrections and current validation. Failed specialist results remain failures even if they request confirmation; they cannot become successful advice awaiting approval.

`tests/quality-critic.test.js` covers inconsistent amounts, missing evidence, legacy/zero-cash cases, pagination, malformed records, altered analytics, stale payment advice, owner/role isolation and failure propagation. `tests/quality-browser.cjs` covers admin scanning, evidence inspection, source selection, review persistence, mobile width and logout privacy.

Shared Memory & Learning is now implemented as a subsequent phase; see `shared-memory-learning.md`. No cross-account learning, autonomous corrections or new external connections are introduced.
