# Mobility Intelligence Agent

Ride2View mobility decision specialist. It filters and ranks authoritative supply and returns a recommendation envelope. It never mutates assignment or trip state.

**Mobility Intelligence recommendations are not authoritative assignments.**

V1 implements deterministic segment eligibility, stale-location rejection, capacity/vehicle/driver hard filters, auditable ranking, provenance/confidence separation, and multi-stop representation. External maps, traffic, live GPS, forecasting, pooling marketplace, Care Rides and advanced economics remain NOT_CONFIGURED/INSUFFICIENT_DATA until authoritative providers/data exist. EV intelligence is intentionally excluded.
