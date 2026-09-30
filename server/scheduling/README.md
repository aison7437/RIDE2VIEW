# Reservation Authority

Deterministic scheduling authority. Stores normalized UTC timestamps while requiring offset-aware ISO-8601 input. Uses BEGIN IMMEDIATE for atomic overlap checks and hold creation, idempotency keys, expiring holds, evidence-gated lifecycle transitions and immutable reschedule revisions. It does not fabricate external calendar availability, maps travel time, payment confirmation or resource availability.
