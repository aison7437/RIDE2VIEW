# Identity V2: persistence foundation (non-operational)

This change introduces **migration 29**, isolated membership and organization tables, reviewer evidence and immutable audit events. It intentionally **does not** change any API authorization or add a user-facing role switcher.

## Data model
- `identity_organizations`: business entity kind (agency, fleet, pharmacy, platform), legal name, status.
- `identity_memberships`: subject user ID, organization scope, role, status, reviewer, approval timestamp, expiry, version. Scoped uniqueness prevents two simultaneous pending/approved/suspended memberships for the same user+organization+role.
- `identity_verification_records`: membership-specific documentary review metadata. Evidence is referenced, not embedded.
- `identity_membership_events`: append-only record of membership actions, actor and state transition.

## Deliberate safety constraints
1. All tables start empty. No implicit conversion of legacy `users.role`, no migration of contact identities, no auto-approval, and no pharmacy access.
2. Only a future explicitly reviewed, transactional membership service may create approvals. Merely inserting a membership record is insufficient for operating permissions.
3. Existing domain endpoints still authorize via their existing role and verification checks. Do not use these new tables to bypass them.
4. The database requires a reviewer and timestamp for approved memberships; future application policy must additionally check separation of duties, evidence validity, organization status, expiry and revocation.
5. Events cannot be modified or deleted through ordinary SQL UPDATE/DELETE. A privileged database administrator can still modify storage; operational audit integrity will require backups, external log retention and access controls.
6. Pharmacy role definitions are inert until professional registration, organization licensing, privacy controls, and regulatory authorization are implemented and independently reviewed.

## Rollout sequence
1. Review and merge Identity V1 PR #118 only after staging browser sign-in and OTP provider verification.
2. Review V2 schema migration separately; test migration on a copy of production data and verify rollback strategy before rollout.
3. Implement a service-only membership application lifecycle with strict approval authority, transactionally coupled audit events, and denial/revocation tests.
4. Add policy checks at each domain boundary, migrate existing roles in controlled batches, then enable multi-workspace switching after explicit approvals.
5. Test same-user multiple organizations, expired licence, suspended pharmacy, admin revocation, and stale-session denial.

**This branch targets V1's feature branch, not main. Do not merge it before V1 or claim multi-role RBAC is operational.**
