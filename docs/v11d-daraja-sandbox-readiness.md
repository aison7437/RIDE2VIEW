# V11-D: Daraja sandbox readiness boundary

The existing `mpesa` adapter accepts a **Ride2View-normalized** event signed with a shared-secret HMAC-SHA256. This is **not** Safaricom's native Daraja STK callback protocol or a Safaricom-issued signature. Do not configure a native Daraja callback URL to point directly at this endpoint or treat this test signature as provider authentication.

## Required before enabling real sandbox transactions

1. Configure a secure server-side Daraja OAuth client, shortcode, passkey and callback URL through secret management; never expose credentials to the browser or commit them.
2. Implement Daraja STK Push initiation with provider request IDs and persisted correlation to a Ride2View payment intent.
3. Accept native Daraja callback payloads only through a dedicated, provider-specific ingress with appropriate authenticity and reconciliation controls. Do not trust callback metadata alone as proof of settlement; reconcile checkout/request identifiers and transaction status using provider-supported verification mechanisms.
4. Map successful, failed and cancelled results explicitly. Verify amount, currency, booking and receipt uniqueness before authoritative payment confirmation. Reject ambiguous or missing identifiers.
5. Test success, cancellation, insufficient funds, duplicate callbacks, altered amounts, callback-before-initiation acknowledgement, provider timeouts, and recovery after worker interruption against Safaricom's sandbox.
6. Restrict outbound credentials, add structured observability without logging tokens or personal payment details, and run the V10-B operational acceptance suite on deployed staging.

Until these controls are implemented and externally verified, only the deterministic normalized-event adapter and its tests are supported. EV functionality remains out of scope.
