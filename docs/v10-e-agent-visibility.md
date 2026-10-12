# V10-E — Agent visibility and monetization (staging)

Agent listing visibility is independent of customer viewing-credit memberships and transport tiers.

* Basic: free, 3 active listing slots, no sponsored placement.
* Professional: KES 2,499 per 30 days, 15 listing slots, no sponsored placement.
* Premium: KES 5,999 per 30 days, 50 listing slots and 5 manually selected sponsored properties.
* Enterprise: not available.

Paid memberships are **requests only** until an administrator verifies an actual distinct payment reference externally and activates the subscription. These endpoints do not initiate M-Pesa billing or implement automated renewals. Never activate a plan based on a client-supplied payment success message. Subscription cancellation revokes sponsored placements immediately; refunds require separate operational handling.

Public discovery may mark an eligible published property with `sponsored: true` and prioritize it within public listings. Search relevance and property verification remain authoritative: only server-verified published listings enter the boosted pool; sponsored placement does not affect verification, property recommendations or trust scores. The UI must visibly disclose sponsored placement.

API: `GET /api/agent-visibility/plans`, `GET /api/agent-visibility/mine`, `POST /api/agent-visibility/subscriptions`, `POST /api/agent-visibility/subscriptions/:id/cancel`, `POST /api/admin/agent-visibility/subscriptions/:id/activate`, `PUT /api/agent-visibility/properties/:id/featured` with boolean `featured`.

Before production: integrate signed provider callbacks with subscription-specific payment intents, reconcile financial events and refunds, add invoice/tax documentation, verify admin entitlement policies, load-test sponsored ranking, and complete staging browser and security acceptance. EV work remains on hold.
