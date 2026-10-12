# V10-G · Maps and 3D neighborhood previews

The product uses one progressive map renderer at `js/maps.js`, shared by Ride2Go booking previews and consented trip tracking. It starts in accessible **2D** mode; 3D is opt-in. Google Maps JavaScript API is loaded only on demand. The authenticated server route `GET /api/maps/config` returns only the **browser-restricted** Google Maps JavaScript API key. Do not put a server credential, Google Routes secret, or unrestricted key there.

## Enablement
1. In Google Cloud, create a billing-enabled Maps project and establish billing alerts, quotas, and API limits.
2. Enable **Maps JavaScript API** (including the supported `maps3d` library), **Routes API**, and **Geocoding API** as needed.
3. Create a **browser API key**, restrict it to Maps JavaScript API and exact authorized HTTPS website referrers (production and staging). Supply it through `GOOGLE_MAPS_BROWSER_KEY` on the web server. This key is intentionally sent to the browser, so restrictions are essential.
4. Create a separate **server key** restricted to Routes API and Geocoding API and expose it only to the server as `GOOGLE_ROUTES_API_KEY`; ensure server/network restrictions as supported.
5. Restart the app and verify `/api/maps/config` reports `enabled:true`. The map initializes upon opening Ride2Go or tracking. Without the browser key, the UI displays a disabled-provider fallback and links to Google Maps for saved coordinates.
6. Pilot individual neighborhoods in Nairobi; 3D coverage varies. Turn on explicit quota limits and monitor actual billed usage. Do not assume 3D imagery displays an interior walkthrough.

## Authorization and data
Trip coordinates are read through existing account-scoped `/api/operations/trips` APIs. Location consent, current driver association, GPS freshness, and server-based ETA control remain unchanged. The map UI must **not** change journey price, payment verification, dispatch state or property ownership. Accepted fares remain immutable. All route coordinates shown are confirmed or explicitly saved through the existing navigation workflow; no invented routes or ETAs.

## Operational fallback
The site remains operational without Maps billing, the browser key, 3D coverage or Google API connectivity. Google Maps 2D and 3D images require an external provider and network access. A 2D-to-3D switch is a *visual exploration* tool and should not be mistaken for a driver navigation provider or photogrammetric house interior.

## Acceptance
Verify missing-key fallback; enabled-key 2D rendering; enabled-key 3D rendering in a covered Nairobi neighborhood; mobile rendering; trip owner isolation; driver consent and stale-position indicators; route/ETA accuracy; key referrer rejection from unapproved domains; usage monitoring. The repository does not contain Google credentials.
