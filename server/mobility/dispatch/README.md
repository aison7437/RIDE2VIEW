# Dispatch Authority

Deterministic authoritative backend for Ride2View mobility execution. It revalidates paid/confirmed bookings and approved drivers, serializes assignment writes with SQLite BEGIN IMMEDIATE, persists assignment leases, prevents one active driver assignment from being reused, and validates state transitions.

Mobility Intelligence recommendations are inputs only; they are never treated as authorization.

No live GPS, maps, traffic, SMS/WhatsApp/push or EV intelligence is implemented in this slice.
