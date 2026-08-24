# Incident — Invoice Payment State Drift

**Date:** 2026-08
**Status:** Resolved / prevention active

## Symptom
A webshop invoice could contain a valid `paid_at` and an authoritative Mollie payment with status `paid`, while the invoice itself still reported `payment_status='unpaid'`.

## Root cause
`commerce_create_invoice_snapshot` returned an already-existing invoice without reconciling its payment state from the proven paid checkout payment.

## Fix
- Reconcile an existing invoice when the linked payment is authoritatively paid and amount/identity match.
- Protect draft/credited/void semantics.
- Enforce paid invoice integrity (`payment_status='paid'` requires `paid_at`).
- Keep reconciliation in the invoice/payment backend owner, not BI/UI.

## Verification fingerprint
Payment-to-invoice mismatch query must return `0` for proven paid linked payments.

## Prevention law
Any idempotent create-or-return RPC that returns an existing financial record must reconcile authoritative lifecycle state before returning it when safe and deterministic.
