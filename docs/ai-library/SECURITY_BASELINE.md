# Security Baseline

**Baseline reference:** re-verify current `main` at session start; SHA anchors are historical evidence only.

## Green / verified controls

- RLS is treated as a mandatory boundary for client-accessible tenant data.
- Checkout account type is database-enforced; private checkout cannot persist business fields.
- Checkout trigger function is not executable by anon/authenticated.
- Wishlist authenticated persistence is RLS-protected and anon-denied.
- Quote number sequence table is internal-only with explicit client deny policy.
- Customer Admin runtime resolves/uses explicit tenant context; ambiguous tenant state fails closed.
- New checkout profiles bind to checkout organization; silent tenant reassignment is blocked.
- Customer360 admin mutations enforce target customer tenant membership.
- Supplier snapshot helper enforces tenant/customer quote context and is no longer directly executable by authenticated clients.
- `commerce-update-order` is JWT gateway protected plus internal admin/tenant enforcement.
- `commerce-download-invoice` is JWT gateway protected plus user/ownership enforcement.
- Mollie webhooks verify payment state server-to-server and reconcile authoritative metadata/amount/currency.
- Payment/invoice reconciliation hardening prevents proven paid webshop payments remaining unpaid on invoice state.
- Internal authorization/tenant helpers are removed from ordinary authenticated RPC exposure when no direct client contract exists. This includes `command_center_is_admin`, `commerce_current_organization`, `is_admin`, `is_fitconnect_admin`, `module_registry_is_admin`, `module_registry_is_member`, `commerce_is_member`, `customer_current_organization` and `commerce_current_supplier_snapshot`.
- Remaining authenticated SECURITY DEFINER RPCs are classified in `docs/ai-library/SECURITY_DEFINER_CLASSIFICATION.md`; warnings are not treated as defects without contract analysis.
- My Twin image intake accepts source files up to 50 MB only at the browser boundary; the heavy original is normalized locally and is never persisted by FitConnect.
- My Twin sends only a <=4 MB JPEG intermediate to the authenticated `my-twin-image-ingest` Edge Function. The function revalidates JWT/user identity, origin, magic bytes, JPEG dimensions and rate limits before image decoding.
- My Twin avatar Storage is private and direct authenticated INSERT/UPDATE/DELETE policies are removed. Processed avatar files are written only server-side through the service role after validation.
- My Twin server-side processing strips metadata, converts accepted input to WebP, records SHA-256/processing metadata and keeps the Storage bucket capped at 5 MB per persisted object.
- My Twin avatar bucket provisioning is idempotent: deployment guarantees the private `avatars` bucket exists with the hardened MIME and object-size limits before portal use.
- My Twin upload abuse protection records server-only ingest attempts with no anon/authenticated table privileges and has an explicit restrictive deny-all RLS policy for client roles.

## Intentional alternative-boundary endpoints

Some public checkout/webhook functions may use `verify_jwt=false` only with explicit alternative controls such as HMAC/status tokens, nonces, rate limits, origin controls, or provider verification.

## Open/accepted items

- Leaked Password Protection: OPEN / requires Auth management capability or manual setting.
- Two SECURITY DEFINER helpers remain classified as `INTERNAL / no direct client contract found` and require dedicated compatibility testing before privilege revocation: `commerce_cart_totals`, `commerce_search_products_for_bundle`.
- Legacy unscoped customer profiles: isolate until tenant provenance is provable.
- Mollie LIVE: blocked pending explicit TEST E2E and production certification.

## Required regression roles

For privilege/RLS changes test where relevant as anon, ordinary authenticated customer, tenant member, admin and service/backend role.
