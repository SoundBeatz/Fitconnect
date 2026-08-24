# Release Ledger

Append-only release and production-baseline memory. Git/Supabase evidence remains authoritative.

## 2026-08-18 — Checkout account type baseline
- PR #191 merged.
- Merge commit `00140a5dfce8a650956655ba0c77381cb726724a`.
- Migration `202608180004_checkout_account_type_v1.sql` applied.
- Private/business field separation and database enforcement verified.

## 2026-08-18 — Checkout trigger privilege hardening
- PR #192 merged.
- Trigger RPC execution removed from anon/authenticated.

## 2026-08-18 onward — Commerce/catalog/runtime hardening
- PR #193 wishlist persistence.
- PR #194 product-detail wishlist entrypoint.
- PR #195 brand catalog reconciliation.
- PR #196 central category catalog.
- PR #197 product data constraints.
- PR #198 Order/Admin runtime bootstrap and contract repair.
- PR #199 Customer + Invoice FDMP runtime wiring.
- PR #200 payment/invoice reconciliation.
- PR #201 Finance Intelligence read-only consumer.

## 2026-08-21 onward — Tenant/security hardening
- PR #208 Customer Admin tenant scope.
- PR #209 supplier snapshot tenant guard.
- PR #210 checkout profile tenant binding.
- PR #211 legacy reconciliation / Customer360 target enforcement.
- PR #212 quote sequence explicit deny policy.
- PR #213 invoice-download JWT gateway + paid invoice download fix.
- PR #214 order-admin JWT gateway.
- PR #215 internal tenant helper RPC exposure removal.

## Baseline before durable memory bootstrap
`72e816684c60ab5b36c90a5449f5d36d641ac5db`

When a material production baseline changes, append the PR/merge SHA, migrations/deployments, verification evidence and any known limitations.
