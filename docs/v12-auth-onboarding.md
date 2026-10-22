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
V12 now includes persistent five-minute email and phone challenges, attempt/resend limits, one-use codes, HMAC digests, verified credential linking, email password recovery with prior-session revocation, HttpOnly session issuance, and customer-facing signup forms. The OTP and verification challenge are never stored in plaintext. Phone numbers are normalized to Kenyan `+254` format. Email verification uses Resend; SMS verification uses Africa's Talking. Both providers use server-only environment configuration and HTTPS API endpoints.

## Deployment configuration
Set `AT_USERNAME` and `AT_API_KEY` for a production Africa's Talking application. `AT_SENDER_ID` is optional and should only be set to a sender ID/shortcode registered for that account. Set `RESEND_API_KEY` and `R2V_AUTH_EMAIL_FROM` to a sender on a verified Resend domain. Set `R2V_AUTH_OTP_SECRET` to a random secret of at least 32 characters. Do not commit real values or expose them to browser projects.

`GET /api/config` reports which verification channels are configured. A channel stays disabled if its provider credentials or OTP secret are missing. Routes are `POST /api/auth/email/challenges`, `POST /api/auth/phone/challenges`, `POST /api/auth/email/link/challenges`, `POST /api/auth/phone/link/challenges`, `POST /api/auth/email/recovery/challenges`, and `POST /api/auth/challenges/verify`. Existing legacy users must verify their contact through the matching challenge flow before production password login. Agents and drivers still require their separate documentary review.

## Verification boundary
Automated tests use injected provider fakes and confirm challenge expiry, resend limits, attempt limits, single-use behavior, account linking, password recovery/session revocation, provider failure behavior, safe session cookies, restart persistence, and that raw OTPs are absent from the database. A live customer registration is not operational until the production secrets are installed, both provider accounts are active, Vercel/server origins are routed to the Node API, and staging tests receive real messages and complete signup, sign-in, sign-out, recovery, and cross-device persistence.
