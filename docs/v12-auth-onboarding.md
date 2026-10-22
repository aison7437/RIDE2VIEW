# V12 — Customer Authentication & Onboarding

## Approved product contract
- Default registration: Kenyan phone number (+254) and a one-time SMS verification code.
- Alternative: email and password, followed by email verification.
- Both credentials can be linked to one customer account after proving control of each.
- Agent and driver approvals remain distinct from customer onboarding.

## Security and operational requirements
- Persist OTP challenges in a shared database (not process memory), store only keyed digests, expire after 5 minutes, invalidate after successful use, cap verification attempts and resend frequency, and prevent account enumeration.
- Integrate a real SMS provider and email delivery service with delivery status, credentials stored in server-side secrets, and appropriate consent.
- Issue secure HttpOnly cookies on the backend; never store session tokens or OTPs in browser localStorage or embed provider secrets in HTML.
- Configure an explicit same-origin API proxy or secure backend origin before enabling signup on the separately deployed static premium Vercel project.
- Require verification and rate limiting for credential linking and account recovery; do not automatically merge accounts solely by matching an email or phone string.
- Existing POST /api/auth/register and /api/auth/login are email/password APIs; they do not provide verified email or SMS OTP yet.

## Current implementation scope
This branch adds reusable Kenyan phone normalization and cryptographic OTP primitives with unit tests. It does **not** enable OTP delivery, registration endpoints, or a production signup experience. The next increment must implement persistent challenges, provider adapters, secure API endpoints and end-to-end tests before exposing registration controls.
