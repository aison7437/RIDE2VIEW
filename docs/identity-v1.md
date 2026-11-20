# Identity V1 — unified sign-in and workspace directory

## Status
This is a **compatibility foundation**, not full multi-role authorization. Its goal is to provide one account gateway while preserving existing backend authorization and onboarding procedures. It does **not** merge duplicate customer/agent/driver accounts, provision organizations, grant new memberships, or activate pharmacy transactions.

## Implemented

- Next.js `/account` presents **phone OTP** via existing `POST /api/auth/phone/challenges` and `POST /api/auth/challenges/verify`, or **email/password sign-in** via existing `POST /api/auth/login`.
- Existing verified contact and session mechanisms remain authoritative; session cookies remain HttpOnly, SameSite=Strict and Secure where the configured deployment requires it.
- `GET /api/auth/me` retains all existing fields and additionally returns `access`, a server-derived workspace directory. The account UI does **not** trust a client-supplied role.
- Existing role dashboard routes at `/customer`, `/driver`, `/agent`, `/admin` are unchanged. Their API calls continue enforcing the legacy `users.role` and domain-specific eligibility checks.
- New users created via the gateway's phone flow are **customers only**. Professional/admin enrollment is not accessible from this gateway.
- Driver, property-agent and pharmacy application labels are **informational, non-actionable placeholders**. They do not grant permission.
- Web navigation includes an Account entry. The old role dashboards remain directly accessible by authorized users.

## Current API `access` shape

```json
{
  "defaultWorkspace": "customer",
  "workspaces": [{
    "key": "customer",
    "label": "Customer",
    "path": "/customer",
    "membership": "PRIMARY_LEGACY_ROLE",
    "operationalStatus": "IDENTITY_VERIFIED",
    "contactVerified": true
  }],
  "applications": [
    {"key": "driver", "status": "NOT_STARTED", "selfServiceEnabled": false},
    {"key": "agent", "status": "NOT_STARTED", "selfServiceEnabled": false},
    {"key": "pharmacy", "status": "NOT_STARTED", "selfServiceEnabled": false}
  ],
  "phase": "LEGACY_PRIMARY_ROLE_ONLY",
  "multiRoleEnabled": false
}
```

Example only; actual values depend on the authenticated account. A workspace link advertises the correct starting dashboard, **not eligibility to perform operations**.

## Deployment gates
- The web app requires the backend to be accessible at the same origin for `/api/auth/*`. Connecting the Next.js deployment to the API, cookie scope and secure origins must be verified before announcing sign-in as operational.
- Phone OTP only works if the server has an enabled SMS verification provider and OTP secret; no codes are fabricated on the frontend.
- Account session discovery must return 401 on unauthenticated calls. Other failures must be displayed as **service unavailable**, not misinterpreted as a logged-out session.
- Do not enable any pharmacy seller onboarding, prescriptions, inventory access, or payment routing here. Pharmacy entry is regulatory-gated and requires explicit future approvals.
- No authorization decision should ever rely solely on UI navigation or `access.workspaces`. A user can always forge frontend input. Domain endpoints must verify roles, organization scopes, current documentary approvals, and permissions.
- All modifications to a person's active professional or privileged roles must be server-authorized, auditable and subject to separate review. **No self-service role escalation**.

## Future Identity V2 (not implemented)
- Versioned migration for immutable subject identity, explicit organization membership with approval status, scoped role assignments, review evidence references, expiration/revocation, and security/audit events.
- Professional role applications, document review, operational eligibility, administrative MFA and step-up auth.
- Backend-wide authorization policy upgrade from the single legacy `users.role` to context-aware membership checks across bookings, property listings, dispatch, payments, and future pharmacy modules.
- Controlled migration of existing accounts to a single subject identity, verified contact linking and collision handling. No automatic merge by similar name, email or phone.
- Safe workspace switching for people holding multiple **explicitly authorized** roles, with server-bound session context and independently enforced API permissions.

## Validation
Run `npm test`, `npm run check:api`, `npm run test:acceptance` and the Next.js frontend workflow before merge. Review the security assumptions above. Do not merge a draft PR until required checks pass.
