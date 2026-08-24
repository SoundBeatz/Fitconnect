# Domain Memory — Order

## Scope
Checkout-created orders, order status lifecycle, fulfilment, tracking, order history and admin order operations.

## Ownership
Client flow: `OrderRenderer -> OrderStore -> OrderService -> OrderRepository`.
Backend: `commerce_checkout_sessions`, cart items/payment joins for read models, `commerce_order_status_history`, and `commerce-update-order` for privileged mutations.

## Current rules
- Admin order runtime must load canonical Order modules before consumers such as Executive Intelligence.
- Repository response includes payments, items and a customer-compatible snapshot/shape expected by renderers.
- `commerce-update-order` requires gateway JWT, internal user validation, admin role and organization scope.
- Shipping requires carrier + tracking code; tracking URL must be HTTPS.
- Shipping email is idempotency-aware through delivery records.
- Finance/BI may consume OrderRepository state but must not become a second order owner.
