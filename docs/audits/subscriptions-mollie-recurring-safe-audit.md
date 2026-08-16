# Subscriptions + Mollie Recurring — Ownership Audit

Date: 2026-08-16
Scope: read-only architecture audit. No schema, RLS, payment, webhook or production behavior changed.

## Existing certified owners

### Subscription domain
- `customer_subscription_plans` owns plan identity, price, currency, billing interval and credits per cycle.
- `customer_subscriptions` owns the customer/plan relationship and lifecycle state.
- Existing lifecycle states: `pending`, `active`, `paused`, `past_due`, `cancelled`, `expired`.
- Existing provider extension points: `provider`, `provider_customer_id`, `provider_subscription_id`.
- Existing admin assignment RPC creates a pending subscription; this remains the canonical assignment path.

### Wallet domain
- `customer_wallets` and `customer_wallet_ledger` own monetary/credit balance history.
- `subscription_credit` already exists as a canonical ledger entry type.
- Idempotency is already supported through `(organization_id, idempotency_key)`.

### Commerce payment domain
- `commerce-create-payment` owns normal one-off Mollie payment creation.
- `commerce-mollie-webhook` owns verified Mollie payment status ingestion.
- `commerce_payments` and `commerce_payment_events` own payment truth and webhook idempotency/audit.
- `commerce_record_payment_status` is the canonical payment-state mutation boundary.

## Gap

The repository has Mollie one-off payment infrastructure and a subscription model, but no bridge for Mollie Recurring:

1. Mollie customer creation/linking.
2. First payment / mandate establishment for a pending subscription.
3. Mandate identity/state persistence.
4. Mollie subscription creation after a valid mandate.
5. Recurring payment correlation to `customer_subscriptions`.
6. Verified webhook projection into subscription lifecycle.
7. Idempotent `subscription_credit` booking once per successfully paid cycle.
8. `past_due`, cancellation and expiry projection without allowing browser code to own payment truth.

## Ownership decision

Do **not** create a parallel subscription/payment domain.

- `customer_subscriptions` remains canonical subscription truth.
- Mollie IDs are provider references only, never domain identity.
- Payment truth remains server-side and webhook-verified.
- Browser/admin UI may request an operation but may never set `active`, `past_due`, `cancelled`, mandate state or paid-cycle state directly.
- Credits are booked only after verified paid provider events and must use deterministic idempotency keys.
- Existing one-off checkout remains untouched.

## Safe implementation sequence

### Phase B — provider bridge foundation
Add only the minimum provider fields/events required to correlate Mollie customer, mandate, subscription and recurring payments. Preserve existing tables and RLS ownership.

### Phase C — mandate bootstrap
Add a dedicated authenticated/server-authorized Edge Function that starts the first Mollie payment for an existing pending subscription. It must derive price/interval/customer server-side and reject arbitrary client amounts.

### Phase D — recurring webhook projection
Extend provider ingestion through a dedicated recurring webhook handler or a strictly separated branch in the existing handler. Every webhook must re-fetch the Mollie resource before mutation and use idempotent event recording.

### Phase E — cycle crediting
On a verified paid recurring cycle, book exactly one `subscription_credit` ledger entry using a deterministic provider-payment/cycle idempotency key.

### Phase F — Customer 360 controls
Expose start/retry/cancel actions only through server-owned operations. Customer 360 remains a projection/control surface, not the owner.

## Hard guards

- No Mollie secret in browser/static assets.
- No client-supplied subscription price, credits or organization ownership.
- No activation from redirect/return URL alone.
- No duplicate credit on webhook retry.
- No cross-tenant provider lookup or mutation.
- No reuse of normal checkout sessions as subscription identity.
- No mutation of existing one-off checkout behavior during the foundation phase.

## Audit result

**GO** for a bounded Mollie Recurring provider bridge. Existing architecture already contains the correct canonical subscription, wallet and payment owners. The next change should be a minimal provider-bridge foundation, not a rewrite.