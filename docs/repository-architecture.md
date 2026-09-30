# Repository Architecture

Ride2View is organized by **product capability and execution responsibility**, not by country or continent.

## Top-level ownership

- `ai/` — recommendation and intelligence modules. AI may recommend, rank, explain, and diagnose; it does not assert authoritative execution facts.
- `server/` — deterministic authorities, persistence, HTTP APIs, validation, authorization, and operational state.
- `tests/` — automated contract, integration, persistence, security, and journey tests.
- `js/`, `css/`, `assets/`, `index.html` — web client and static assets.
- `scripts/` — repository and CI support utilities.
- `.github/workflows/` — CI and security analysis.

## Architectural rules

1. **AI recommends; policy validates; authorities execute.**
2. The Journey Orchestrator composes capabilities. Specialist agents must not become competing orchestrators.
3. Payment, assignment, reservation, delivery, order, and safety-enforcement facts are owned by their deterministic server authorities.
4. New markets must not duplicate application code into continent/country trees. Market-specific behavior belongs in explicit configuration or authoritative data when a real requirement exists.
5. Do not create empty placeholder directories. Git tracks files, not architectural intentions.
6. Existing public/API contracts must remain backward compatible until their callers are migrated and covered by tests.
7. External capabilities must remain explicitly unavailable/not configured until a real provider adapter exists.
8. Every structural refactor must pass the complete Ride2View CI suite and CodeQL before merging to `main`.

## Orchestration control plane

`ai/Core/journey-orchestrator/` is the Ride2View orchestration control plane. The former `ai/Core/orchestrator/` compatibility implementation was retired after `/api/search` migrated to the read-only property-discovery journey and its remaining test dependency was removed.

## Future market configuration

When Ride2View has genuine market-specific requirements, prefer a structure such as:

```text
config/
  markets/
    kenya.js
    rwanda.js
    uk.js
```

Create those files only when real configuration exists. Typical market configuration may include currency, timezone, enabled services, payment-provider selection, regulatory feature flags, and localization. Secrets and credentials must remain outside source control.

## Naming

Use lowercase kebab-case for new directories unless maintaining an existing compatibility path. Existing `ai/Core/` remains unchanged during the orchestration migration to avoid unnecessary path churn.
