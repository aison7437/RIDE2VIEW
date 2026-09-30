# Payment Authority

Deterministic authoritative financial boundary for Ride2View. It owns payment state transitions and manual verification against the existing SQLite ledger. It validates exact amounts, enforces unique transaction references, uses SQLite BEGIN IMMEDIATE for serialized mutations, and keeps payment confirmation separate from Transaction Intelligence.

The current provider remains manual administrator verification. No M-Pesa, card, wallet, crypto, webhook, refund-provider or reconciliation integration is claimed in this slice.
