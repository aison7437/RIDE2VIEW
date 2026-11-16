# V12 customer onboarding — first implementation slice

The premium static frontend now includes `account.html`, a mobile-friendly customer account page.

- Email/password registration calls `POST /api/auth/register` with `role: customer`.
- Email/password login calls `POST /api/auth/login` and uses a cookie-based session.
- Phone/OTP tab is intentionally disabled until a real SMS provider, hashed expiring OTP storage, resend throttling, attempt limits, delivery telemetry, and verification tests are implemented.
- The existing backend currently auto-marks customer accounts verified. **Email verification has not been implemented.**
- On a separate Vercel static origin, these calls cannot work until the backend is deployed and a same-origin `/api` proxy or equivalent secure origin/cookie architecture is configured. Merely deploying the HTML does not enable registration.
- This page is accessible at `/account.html`; integration into the premium navigation remains outstanding.
- Do not store OTPs in the browser or log them in production.
- Do not treat this as production-ready customer authentication.

Before enabling signups: deploy the backend, configure TLS and secure cookies, complete origin/CSRF review, add identity verification, end-to-end tests, and connect the premium dashboard to session state.
