# Cart, checkout and account dashboards

This release implements the client and driver overviews as connected screens. The design preview remains separate. EV work remains on hold.

## Customer shopping

Ride Plate customers can add inventory from verified merchants, change quantities, remove items and restore the same account cart after reload, logout or server restart. Up to 50 distinct lines, 99 units per line and 10 merchants are supported. Cart versions prevent one browser from silently overwriting another browser's edits.

Review checkout presents per-item prices, merchant subtotals and the catalog-items total. A server-issued review expires after ten minutes. Placing the order rechecks the cart version, merchant verification, catalog publication, stock and each unit price. A changed price requires a new review even when offsetting changes leave the total unchanged. One transaction creates every merchant order and clears the cart. Repeating the same review returns the same checkout, including after a restart.

Checkout does not collect payment or reserve inventory. Stock reservation remains the existing inventory authority's post-payment responsibility. Delivery arrangements and any separate delivery charge must be agreed before collection; checkout does not invent delivery fees or fiscal invoices.

Order history displays 20 checkouts per page, with older-page loading, immutable reviewed item descriptions, current order/payment state and the status of an existing linked shipment. Unpaid orders can be reopened without creating a new order. Customer reads are owner-scoped; merchant reads expose only that merchant's orders. Payment references, private customer details and provider credentials are not exposed by history.

## Payment operations

A merchant or administrator can prepare its order for collection through the existing order, pricing and payment authorities. Preparation is resumable and rejects a changed reviewed price. An administrator records an actual received reference and exact amount; the existing payment authority enforces reference uniqueness and writes the ledger. A repeated verification is safe. If payment was recorded but order advancement was interrupted, the administrator can resubmit the same received reference to finish advancement.

Online Ride Plate collection is not connected. The customer screen explicitly instructs the customer to obtain collection instructions from operations. The existing operations collection adapter for viewing bookings, Ride2Go and property services is not presented as a commerce payment adapter. Preparing or placing an order never fabricates a successful charge.

The pre-existing `POST /api/rideplate/checkouts` contract remains available for compatibility. The new customer screen exclusively uses the reviewed-cart endpoints below.

## API

| Method | Path | Access |
| --- | --- | --- |
| GET / PUT | `/api/rideplate/cart` | Customer's versioned cart; PUT takes `version` and `items` |
| POST | `/api/rideplate/cart/review` | Customer; takes current cart `version` |
| POST | `/api/rideplate/cart/checkout` | Customer; takes server-issued `reviewId` |
| GET | `/api/rideplate/checkouts?offset=0` | Customer's paginated history |
| GET | `/api/rideplate/checkouts/:id` | Owning customer |
| GET | `/api/rideplate/merchant-orders` | Merchant's latest 100 orders, or administrator |
| POST | `/api/rideplate/merchant-orders/:id/prepare` | Owning merchant or administrator |
| POST | `/api/rideplate/merchant-orders/:id/verify` | Administrator; actual `reference` and `amount` |
| GET | `/api/dashboard` | Signed-in customer or driver, current account only |

Migration 26 adds `shopping_carts` and `shopping_reviews`. Earlier migrations and their checksums are unchanged. Completed reviews are retained for descriptions and replay; unused expired reviews are removed when the customer requests a fresh review. Existing checkouts appear in history after upgrade.

## Dashboard definitions

Client overview shows saved-property count, active viewing-package count, recorded KES viewing credits and checkout count. Public property cards use the same publication/verification eligibility authority as discovery, filtered by saved city, budget and rent/buy goal. Only supplied property photos are rendered. Upcoming requests include requested and accepted slots whose start time has not passed. Active Ride2Go requests, packages, account notifications and assistant links connect to the existing detailed workspaces.

Driver overview shows unexpired offers, completed transport trips, recorded KES earnings and assigned active packages. A viewing package counts as one completed trip only after the whole package is complete; companion stop bookings are excluded. KES earnings include earned, payout-pending and paid records; disputed and void entries are excluded from the headline. The detailed panel separates currencies and statuses. Recorded earnings are not represented as a withdrawable balance.

Availability changes and offer acceptance use the existing eligibility and dispatch authorities. Document state comes from current evidence review and expiry, and the overview links to vehicle/documents, trip progression, navigation and Driver Coach. It never fabricates location, live ETA, ratings or balances. Snapshot timestamps and explicit refresh controls identify freshness; server authorities revalidate all actions.

Both overviews use a desktop sidebar and compact scrolling mobile navigation. Existing detailed workspaces remain accessible. New dashboard and shopping responses are fenced against logout/account switching; production feedback is separate from preview toasts.

## Validation

`npm test`, `npm run check`, `npm run test:agent` and `npm run test:browser` cover the release. The shopping/dashboard suites exercise persistence and upgrade, stale versions, changed prices, stock and merchant eligibility, transaction rollback, replay, money bounds, payment authorization, account isolation, paginated history, driver counting, quantity edits/removal, mobile width, real offer acceptance and delayed responses after logout.

External provider activation remains deployment work. This release does not enable EV capabilities or assert that the entire original Ride2View vision is complete.
