# V11 role routing and install metadata

This increment introduces **role landing routes** at `/customer`, `/driver`, `/agent`, and `/admin`. These are not complete operational dashboards.

The browser checks `GET /api/auth/me` and displays only the matching role. This is **not an authorization boundary**: the existing backend must validate each privileged request, regardless of the displayed page. The client-side check does not protect server-rendered sensitive data; do not add sensitive data to these pages until server-side authorization is designed and tested.

An install manifest and SVG icon are included. A manifest alone is **not a fully installable/offline PWA**; service worker, cache safety and real-device testing remain outstanding.

No payment, booking, dispatch, approval, or EV logic is changed. Existing HTML UI remains the operational fallback.

## Next steps
- Generate and commit `apps/web/package-lock.json` with a verified dependency tree and change CI to `npm ci`.
- Verify role API contracts and test unauthorized API access server-side.
- Implement booking and role dashboards with acceptance tests.
- Add a service worker with no caching of account/payment responses.
