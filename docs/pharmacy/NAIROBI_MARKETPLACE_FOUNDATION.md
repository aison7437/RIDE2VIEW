# Ride2View Pharmacy — Nairobi marketplace foundation

Status: architecture proposal only; no production pharmacy transactions authorized.

## Scope
Launch geography: Nairobi County, Kenya. Marketplace operator: Ride2View.
Participating entities: independently licensed pharmacy premises, subject to manual verification.
The platform provides discovery and partner profile management, not professional dispensing.

## Release 0 — informational directory
- Customer: search pharmacy partner profiles by Nairobi area; show verification status, address, contact channels and last-reviewed date.
- Partner: submit an application with business/premises identity, registration and licensing evidence through a future access-controlled onboarding service.
- Admin: review evidence, approve/reject/suspend a partner, record reviewer and reason, track license expiration.
- Never label an applicant as verified until an authorized reviewer confirms evidence with the relevant regulator.
- Public data must be allowlisted; do not publish license documents, personal identifiers, or internal review notes.

## Explicitly prohibited until later approval
No prescription uploads, medicine-specific ordering, dispensing, medicine checkout, patient records, payment collection, or medicine delivery booking. No automated medical advice or representations that Ride2View itself is a pharmacy.

## Trust boundary
- Separate pharmacy authorization scopes from property and mobility roles.
- Dedicated pharmacy partner and verification data; audit every status transition.
- Only verified, unexpired, non-suspended premises are publicly discoverable.
- An expiry, revocation or suspension must remove the verified badge and directory eligibility.
- No self-approval. Reviewer and applicant identities must be distinct.
- Rate-limit applications and searches, encrypt sensitive application documents at rest, enforce retention limits.
- Use a transactional outbox for state-change events and audit delivery when backend workflows are introduced.

## Proposed partner state machine
DRAFT -> SUBMITTED -> UNDER_REVIEW -> VERIFIED
UNDER_REVIEW -> REJECTED
VERIFIED -> SUSPENDED | EXPIRED
SUSPENDED -> UNDER_REVIEW
EXPIRED -> UNDER_REVIEW
All transitions require authorization and durable audit entries; expiry should be checked against a trusted clock.

## Geographic model
Store county_code=047 for Nairobi; keep ward/subcounty optional until authoritative address normalization is implemented.
Do not treat an arbitrary map pin as proof of a licensed premises.

## Regulatory decision gate
Before live onboarding or public verified claims, obtain Kenyan legal and professional regulatory review covering Pharmacy and Poisons Board verification, advertising restrictions, consumer protection, data protection obligations, and any intermediary or delivery licensing implications.

## Acceptance gates
1. Preview remains read-only with no regulated transactions.
2. Dedicated mini-app can be built and deployed without modifying core property booking logic.
3. Tests cover verification state transitions, authorization, expiry, public-data allowlist and audit atomicity.
4. Browser tests cover 390px, 768px and desktop widths, keyboard navigation, and zero unauthorized API calls.
5. Legal sign-off and documented operational runbooks precede public partner onboarding.

## Existing prototype
The pharmacy UI prototype remains on draft PR #100 (feat/pharmacy-figma-frontend-preview). This foundation branch deliberately starts from main to avoid merging an unreviewed prototype.
