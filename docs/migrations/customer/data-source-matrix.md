# Customer Domain Data Source Matrix

## profiles

| Property | Finding |
|---|---|
| Source | `public.profiles` |
| Auth relation | `profiles.id = auth.users.id` |
| Admin reader | `admin/admin.js` |
| Portal reader | `portal/portal.js` |
| Storefront reader | `shop/shop.js` |
| Edge reader | `commerce-update-order` role check |
| Repository | none |
| Risk | identity, account, pricing and customer presentation combined |

Frontend readers filter by user id where applicable, but tenant ownership is not explicit in the browser queries and therefore depends on RLS.

## invoice_customers

| Property | Finding |
|---|---|
| Source | `public.invoice_customers` |
| Readers | `admin/admin.js`, `admin/invoicing.js` |
| Writer | `admin/invoicing.js` |
| Profile relation | `portal_user_id` |
| Tenant column | `organization_id` |
| Duplicate risk | high |

`saveCustomer()` decides inside the UI whether to update, upsert or insert an invoice customer. Customer matching and source selection therefore currently live in presentation/runtime code.

## addresses

Current representations:
- `profiles.address_line1`, `postal_code`, `city`, `country_code`
- `invoice_customers.address`, `postal_code`, `city`
- `commerce_checkout_sessions.billing_address` JSONB
- `commerce_checkout_sessions.shipping_address` JSONB
- `commerce_invoices.customer_snapshot` JSONB

Checkout and invoice snapshots are historical transaction records and must remain immutable. No standalone Address Repository was found.

## orders

| Property | Finding |
|---|---|
| Operational header | `commerce_checkout_sessions` |
| Line source | `commerce_cart_items` through `cart_id` |
| Payment source | `commerce_payments` |
| Status history | `commerce_order_status_history` |
| Admin reader/writer | `commerce-update-order` Edge Function |
| Admin UI | `admin/admin.js` |

The active order DTO is assembled in the Edge Function from checkout, payment and cart-item data. An independent immutable order-item aggregate was not proven.

## payments

| Dataset | Responsibility |
|---|---|
| `commerce_payments` | current payment state |
| `commerce_payment_events` | idempotent provider webhook journal |
| `commerce_payment_status_history` | status transitions |
| `commerce_refunds` | refund state |

`commerce_record_payment_status()` locks the payment, validates and updates status, writes history and marks checkout completed when paid.

## invoices

| Dataset / RPC | Responsibility |
|---|---|
| `commerce_invoices` | invoice header and fiscal snapshots |
| `commerce_invoice_number_sequences` | tenant/year numbering |
| `commerce_create_invoice_draft` | draft creation |
| `commerce_update_invoice_draft` | mutable draft update |
| `commerce_issue_invoice` | atomic fiscal issue |
| `commerce_create_invoice_snapshot` | idempotent webshop invoice creation |
| `commerce_register_invoice_payment` | payment registration |

`admin/invoicing.js` directly reads invoices, writes invoice customers, invokes RPCs and links `invoice_customer_id` after draft creation.