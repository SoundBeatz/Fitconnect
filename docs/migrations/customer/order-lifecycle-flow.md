# Customer Domain Order Lifecycle

## Proven current flow

```text
Storefront cart
→ localStorage: fitconnect-cart
→ checkout session
→ commerce_checkout_sessions
→ payment record
→ commerce_payments
→ provider webhook / server transition
→ commerce_record_payment_status()
→ commerce_payment_status_history
→ checkout status completed when paid
→ operational order status
→ processing / confirmed / picking / packed
→ shipped
→ shipping email
→ delivered / cancelled / returned
```

## Cart

Owner: `shop/shop.js`.

Persistence:
```text
localStorage['fitconnect-cart']
```

Items contain `productId` or `bundleId` and `quantity`. No server-side reservation was proven before checkout.

## Checkout

`commerce_checkout_sessions` contains customer identity, company, phone, email, billing and shipping snapshots, totals, payment provider, idempotency key and optional `sales_order_id`.

Checkout statuses:
- `open`
- `processing`
- `completed`
- `expired`
- `cancelled`

## Payment

Payment statuses:
- `created`
- `pending`
- `authorized`
- `paid`
- `failed`
- `cancelled`
- `expired`
- `refunded`
- `partially_refunded`

Provider event processing statuses:
- `received`
- `processed`
- `ignored`
- `failed`

Refund statuses:
- `pending`
- `processing`
- `succeeded`
- `failed`
- `cancelled`

## Operational order status

Validated by `supabase/functions/commerce-update-order/index.ts`:
- `processing`
- `confirmed`
- `picking`
- `packed`
- `shipped`
- `delivered`
- `cancelled`
- `returned`

On change, `commerce_order_status_history` receives organization, checkout id, from/to status, tracking data and actor id.

## Shipping

For `shipped`, carrier and tracking code are required. Tracking URL must use HTTPS. `shipped_at` is set and an idempotent `commerce_email_deliveries` record controls the Resend shipping email.

For `delivered`, `delivered_at` is set.

## Invoice moment

`commerce_create_invoice_snapshot()` can create one idempotent paid webshop invoice per checkout/payment and allocates a tenant/year invoice number. The concrete caller was not proven in the audited files.

## Inventory moment

Not proven:
- reservation at checkout;
- deduction after payment;
- release on cancellation;
- restoration on refund.

## Open lifecycle gaps

| Step | Audit status |
|---|---|
| Cart | proven |
| Checkout | proven |
| Payment status transition | proven |
| Processing / picking / packing | proven |
| Shipping email | proven |
| Delivered | proven |
| Cancelled / returned | proven |
| Refund payment state | proven |
| Refund order transition | not proven |
| Inventory reservation/deduction | not proven |
| Automatic invoice caller | not proven |
| Portal order timeline | not proven |