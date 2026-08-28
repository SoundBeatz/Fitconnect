# SECURITY DEFINER RPC Classification

**Status:** ACTIVE security memory
**Rule:** advisor presence alone is not a defect. Classification is based on runtime purpose, direct client contract, internal authorization and tenant/ownership checks. Repository search alone is insufficient to revoke a legacy RPC; production bootstrap/runtime behavior must also be proven.

## INTENTIONAL CLIENT API

These functions are intentionally callable by authenticated clients and contain explicit authorization/ownership boundaries:

- `is_admin` — production login/bootstrap authorization contract; authenticated EXECUTE required, anon denied.
- `commerce_admin_approve_quote` — admin + active organization + quote organization scope.
- `commerce_admin_create_quote` — admin + active organization.
- `commerce_admin_mark_notification` — admin + active organization + notification organization scope.
- `commerce_admin_update_invoice_issuer` — admin + active organization.
- `commerce_admin_update_quote` — admin + active organization + quote organization scope.
- `commerce_create_invoice_draft` — admin + active organization equals requested organization.
- `commerce_update_invoice_draft` — admin + active organization + draft-only mutation.
- `commerce_issue_invoice` — admin + active organization + invoice scope.
- `commerce_register_invoice_payment` — admin + active organization + allowed invoice states.
- `commerce_customer_accept_quote` — authenticated customer + own portal_user_id + approved/non-expired quote.
- `commerce_customer_reject_quote` — authenticated customer + own portal_user_id + approved quote.
- `customer360_admin_add_communication` — admin + active organization + target-customer tenant assertion.
- `customer360_admin_add_wallet_entry` — admin + active organization + target-customer tenant assertion + ledger validation.
- `customer360_admin_assign_subscription` — admin + active organization + target-customer tenant assertion + tenant-scoped active plan.
- `customer_admin_set_credit_package_active` — admin + active organization + package organization scope.
- `customer_admin_upsert_credit_package` — admin + active organization + input bounds + package organization scope.
- `module_is_enabled` — intentional authenticated server-side source of truth for module availability; authorization is membership/admin plus tenant activation rules.
- `redeem_fitkado` — authenticated self-service transaction; balance update and redemption records are scoped to `auth.uid()`.

## INTERNAL / NO DIRECT CLIENT CONTRACT FOUND

Repository search found no direct frontend RPC contract for these helpers. Each requires dedicated production compatibility proof before privilege changes:

- `commerce_cart_totals` — cart calculation helper with cart ownership/admin check.
- `commerce_search_products_for_bundle` — admin-only product search helper; legacy Deal Studio history exists and must be checked before revocation.

## ALREADY REMOVED FROM AUTHENTICATED RPC SURFACE

- `command_center_is_admin`
- `commerce_current_organization`
- `is_fitconnect_admin`
- `module_registry_is_admin`
- `module_registry_is_member`
- `commerce_is_member`
- `customer_current_organization`
- `commerce_current_supplier_snapshot` — remains SECURITY DEFINER for trusted internal quote/invoice callers, but authenticated clients cannot invoke it directly.

## Conversion rule

Do not convert a function from `SECURITY DEFINER` to `SECURITY INVOKER` merely to silence the advisor. Convert only after proving all referenced tables/policies support the exact same authorized behavior under caller privileges. Prefer revoking direct EXECUTE for true internal helpers while preserving definer semantics for trusted internal callers.
