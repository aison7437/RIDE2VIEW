# Shared Memory & Learning

This phase adds the nineteenth registered specialist, Memory & Learning, and an opt-in memory store shared among an account's assistants. Learning means applying explicit property exclusions and reporting feedback counts. It does not mean model training, inferred personal traits, cross-account sharing or autonomous changes to operational policies.

## User flow

Open **Your assistants → Assistant memory** and enable memory. On a saved operational assessment, choose **Remember as helpful** or **Remember as not helpful**. Each assessment has one replaceable feedback entry. Customers can also choose **Exclude from future advice** for a property actually recommended in their own Property or Opportunity assessment.

Future property advice excludes those listings before Lifestyle, Property and Lead Qualification run. Opportunity advice applies the same exclusions. A direct assessment of an excluded property asks the customer to remove the exclusion or pause memory first. This does not hide listings from public search or prohibit bookings. Current profile preferences, publication eligibility, pricing and domain validation remain authoritative.

Run **Shared memory and learning** to see active feedback counts, explicit exclusions and their source references. The report has no confidence probability or claim of improved prediction accuracy. Each affected assessment records its memory version and exclusions. Resume preserves that snapshot but is rejected if memory has changed or its active evidence has expired; create a new assessment instead.

## Controls and retention

| Control | Behavior |
| --- | --- |
| Enable | Opt into saving and using explicit feedback; off by default |
| Pause | Stop applying memory to new assessments; keep saved entries |
| Forget this entry | Delete that active-store record; subsequent assessments stop using it |
| Clear memory and turn off | Delete all of the account's memory entries, including currently inaccessible ones, and disable memory |
| Expiry | Stop using an entry 90 days after its last explicit save; expired rows are pruned on the next successful memory mutation |
| Capacity | Maximum 200 retained entries per account; expired rows are pruned before capacity checks |

**Historical assessment snapshots remain in assessment history after pause, forget or clear.** These controls remove active memory, not assessment history or database backups. They do not erase customer profiles. There is no background deletion job or blanket account-erasure implementation in this phase.

Feedback counts summarize opinions; they do not change specialist weights or certify accuracy. Exclusions are applied as user instructions, not negative claims about a property. No free-text memories, inferred health/identity attributes, document contents, customer contacts or payment references are stored in memory entries.

## Access and consistency

Migration 24 adds `agent_memory_settings` and `agent_memory_entries`; prior migration identities/checksums remain unchanged. Entries record owner, role, source workflow/version, subject, bounded value and timestamps. All reads and writes are scoped to the authenticated account, including admins. Source assessment access is revalidated against current role and domain access; inaccessible entries cannot inform the active snapshot. Feedback on critiques and memory reports is rejected to avoid recursive feedback.

Every mutation requires the current memory version and runs in a SQLite transaction. Stale writes return 409 and roll back. Re-saving feedback replaces the existing entry rather than inflating counts. A memory change while an assessment runs prevents it from publishing a result based on the old memory. These assessments remain read-only and cannot book, pay, dispatch, publish or message.

## API

- `GET /api/agents/memory`: own settings and accessible entries.
- `POST /api/agents/memory/settings`: `{version, enabled}`.
- `POST /api/agents/memory/entries`: `{version, kind: "FEEDBACK", sourceWorkflowId, value: "HELPFUL" | "NOT_HELPFUL"}` or `{version, kind: "EXCLUDE_PROPERTY", sourceWorkflowId, listingId, value: "EXCLUDE"}`.
- `POST /api/agents/memory/entries/:id/forget`: `{version}`.
- `POST /api/agents/memory/clear`: `{version}`.
- `POST /api/agents/workflows`: `{workflow: "memory-learning", idempotencyKey}`.

No external connection is required. Browser controls use the existing session/same-origin protections, text-only rendering and account-change fences. Memory changes refresh the current controls to obtain the new version.

## Validation and remaining work

`tests/memory-learning.test.js` covers persistence/restart, migration upgrade, isolation, role changes, source membership, feedback replacement, exclusions across workflows, pause/forget/clear, expiry, capacity, transactional conflicts and in-flight fencing. `tests/memory-browser.cjs` covers the visible controls, feedback, exclusion behavior, reload, report, mobile layout and logout.

General semantic memory, outcome-trained rankings, experimentation, autonomous improvements and cross-service recommendations beyond explicit property exclusions remain separate capabilities. Other agents can collect assessment feedback and report it through Memory & Learning; their operational algorithms do not adapt to helpfulness counts.
