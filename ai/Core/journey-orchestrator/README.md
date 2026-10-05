# Ride2View Journey Orchestrator

The Journey Orchestrator is the coordination control plane for Ride2View AI capabilities. It builds and executes dependency graphs, validates specialist-agent results, blocks downstream tasks after critical failures, persists journey checkpoints through a storage abstraction, and exposes a root-cause debug view.

## Non-goals

It is not a payment processor, booking database, dispatch database, property search engine, or replacement for the Lifestyle Agent. Authoritative payment, booking, availability and driver states must continue to come from deterministic backend services.

## Current integration

Public search uses the read-only discovery workflow (Lifestyle → Property). The registry contains 14 specialists; recommendations do not assert authoritative booking, payment or dispatch facts.

Signed-in assistant assessments use `server/agents/runtime.js`, a SQLite store adapter with account isolation, token-fenced execution leases, versioned review and explicit restart recovery. See `docs/agent-workflows.md` for the capability matrix and limits. The generic property-viewing graph remains a composition contract, not an autonomous production checkout.

## Contract

Specialist adapters expose `execute(task, context)` and should return a versioned envelope containing task ID, journey ID, status, data, confidence, provenance/source, timestamp, warnings, confirmation requirement and structured errors.

## Reliability

- directed acyclic graph validation
- dependency blocking
- bounded timeouts
- explicit failure provenance
- resumable store abstraction
- safe unavailable-agent states
- concurrency for independent ready nodes

The default store is in-memory and is **not production durable**. The signed-in assessment runtime supplies a durable SQLite adapter. Real side effects still belong to their domain authorities.
