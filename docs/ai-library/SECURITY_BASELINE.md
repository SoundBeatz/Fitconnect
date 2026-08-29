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
- Internal authorization/tenant helpers are removed from ordinary authenticated RPC exposure when no direct client contract exists. This includes `command_center_is_admin`, `commerce_current_organization`, `is_fitconnect_admin`, `module_registry_is_admin`, `module_registry_is_member`, `commerce_is_member`, `customer_current_organization` and `commerce_current_supplier_snapshot`.
- `is_admin()` remains an intentional authenticated login/bootstrap authorization contract; anon remains denied.
- Remaining authenticated SECURITY DEFINER RPCs are classified in `docs/ai-library/SECURITY_DEFINER_CLASSIFICATION.md`; warnings are not treated as defects without contract analysis.
- My Twin image intake accepts source files up to 50 MB only at the browser boundary; the heavy original is normalized locally and is never persisted by FitConnect.
- My Twin sends only a <=4 MB JPEG intermediate to the authenticated `my-twin-image-ingest` Edge Function. The function revalidates JWT/user identity, origin, magic bytes, JPEG dimensions and rate limits before persistence.
- My Twin Edge CORS allowlists FitConnect origins and supports the request headers negotiated by the live Supabase browser client; JWT verification remains enabled.
- My Twin avatar Storage is private and direct authenticated INSERT/UPDATE/DELETE policies are removed. Processed avatar files are written only server-side through the service role after validation.
- My Twin server-side processing strips JPEG metadata segments in pure TypeScript, records SHA-256/processing metadata and stores the sanitized JPEG privately. This avoids a WASM startup dependency that previously crashed the endpoint before CORS handling.
- My Twin avatar bucket provisioning is idempotent: deployment guarantees the private `avatars` bucket exists with JPEG/WebP MIME and 5 MB object-size limits before portal use.
- My Twin upload abuse protection remains fully denied to anon/authenticated, while `service_role` has only the required `SELECT`, `INSERT`, `DELETE` table privileges plus identity-sequence usage for the canonical Edge Function rate-limit/audit flow.
- My Twin persistence follows the runtime canonical schema: `user_avatars` owns the user avatar (`gender`, `suit`, `source_photo`, `status`, `active_version`) and `avatar_versions` is linked through `avatar_id`. The Edge Function receives only the minimum service-role DML needed for this server-side contract; browser ownership remains RLS-controlled.
- My Twin Canonical Identity Engine v1 stores no biometric embeddings. Identity continuity is represented by source SHA-256, monotonic identity revision, prompt revision, a fixed render contract and a random consistency seed.
- `my_twin_identity_profiles` and `my_twin_generation_jobs` are client read-only through owner-scoped RLS; all mutations are backend-only through `service_role`.
- `my-twin-generate` requires gateway JWT, revalidates the authenticated user, resolves only that user's canonical avatar, keeps provider credentials server-side and validates renderer MIME/magic bytes/output size before private persistence.
- Renderer integration is fail-closed: when `MY_TWIN_RENDERER_URL` is absent the job becomes `awaiting_renderer`; no source image is sent to any external provider.
- The identity-profile maintenance trigger is `SECURITY INVOKER` and direct execute is revoked from public/anon/authenticated.

## Intentional alternative-boundary endpoints

Some public checkout/webhook functions may use `verify_jwt=false` only with explicit alternative controls such as HMAC/status tokens, nonces, rate limits, origin controls, or provider verification.

## Open/accepted items

- My Twin renderer provider certification remains OPEN until a server-side render adapter is configured and tested for data retention, access, output consistency and deletion guarantees.
- Leaked Password Protection: OPEN / requires Auth management capability or manual setting.
- Two SECURITY DEFINER helpers remain classified as `INTERNAL / no direct client contract found` and require dedicated compatibility testing before privilege revocation: `commerce_cart_totals`, `commerce_search_products_for_bundle`.
- Legacy unscoped customer profiles: isolate until tenant provenance is provable.
- Mollie LIVE: blocked pending explicit TEST E2E and production certification.

## Required regression roles

For privilege/RLS changes test where relevant as anon, ordinary authenticated customer, tenant member, admin and service/backend role.
