# Transaction Intelligence Agent

Deterministic transaction intelligence for Ride2View. It recommends expected charges and exposes platform/driver economics from versioned policy. It cannot mark money as received, verify provider callbacks, mutate the payment ledger, issue refunds, or authorize dispatch.

**Transaction Intelligence recommendations are not authoritative payment confirmations.**

V1 covers the existing viewing mobility tiers and KES pricing. External payment providers, taxes, discounts, waiting charges, return trips, RidePlate, logistics, commissions and multi-currency remain intentionally outside this first slice until authoritative rules/providers exist.
