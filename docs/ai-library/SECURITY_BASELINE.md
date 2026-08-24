# Security Baseline

**Baseline reference:** `72e816684c60ab5b36c90a5449f5d36d641ac5db`

## Green / verified controls

- RLS is treated as a mandatory boundary for client-accessible tenant data.
- Checkout account type is database-enforced; private checkout cannot persist business fields.
- Checkout trigger function is not executable by anon/authenticated.
- Wishlist authenticated persistence is RLS-protected and anon-denied.
- Quote number sequence table is internal-only with explicit client deny policy.
- Customer Admin runtime resolves/uses explicit tenant context; ambiguous tenant state fails closed.
- New checkout profiles bind to checkout organization; silent tenant reassignment is blocked.
- Customer360 admin mutations enforce target customer tenant membership.
- Supplier snapshot helper enforces tenant/customer quote context.
- `commerce-update-order` is JWT gateway protected plus internal admin/tenant enforcement.
- `commerce-download-invoice` is JWT gateway protected plus user/ownership enforcement.
- Mollie webhooks verify payment state server-to-server and reconcile authoritative metadata/amount/currency.
- Payment/invoice reconciliation hardening prevents proven paid webshop payments remaining unpaid on invoice state.
- Internal `command_center_is_admin()` and `commerce_current_organization()` are removed from ordinary authenticated RPC exposure.

## Intentional alternative-boundary endpoints

Some public checkout/webhook functions may use `verify_jwt=false` only with explicit alternative controls such as HMAC/status tokens, nonces, rate limits, origin controls, or provider verification.

## Open/accepted items

- Leaked Password Protection: OPEN / requires Auth management capability or manual setting.
- Remaining authenticated SECURITY DEFINER warnings: CLASSIFY; do not revoke solely to silence advisor.
- Legacy unscoped customer profiles: isolate until tenant provenance is provable.
- Mollie LIVE: blocked pending explicit TEST E2E and production certification.

## Required regression roles

For privilege/RLS changes test where relevant as anon, ordinary authenticated customer, tenant member, admin and service/backend role.
