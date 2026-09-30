# Ride2View Journey Orchestrator

The Journey Orchestrator is the coordination control plane for Ride2View AI capabilities. It builds and executes dependency graphs, validates specialist-agent results, blocks downstream tasks after critical failures, persists journey checkpoints through a storage abstraction, and exposes a root-cause debug view.

## Non-goals

It is not a payment processor, booking database, dispatch database, property search engine, or replacement for the Lifestyle Agent. Authoritative payment, booking, availability and driver states must continue to come from deterministic backend services.

## Current V1

The first workflow models:

search/intent → property search → availability verification → viewing booking → payment verification → driver assignment → viewing completion.

Only the existing Lifestyle Agent is connected directly. Other specialist adapters intentionally return `UNAVAILABLE` until corresponding production services are integrated. This avoids fabricating external functionality.

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

The default store is in-memory and is **not production durable**. Integrate SQLite-backed journey state before using orchestration for real side effects.
