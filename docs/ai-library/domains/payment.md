# Domain Memory — Payment

## Scope
Checkout payment creation, payment status, Mollie webhooks, invoice payments and payment-to-order/invoice reconciliation.

## Current rules
- Mollie remains TEST until explicit production certification permits LIVE.
- Payment amount, currency, product identity, tax, availability, inventory and organization are server-authoritative.
- Public payment endpoints may use `verify_jwt=false` only with documented alternative boundaries.
- Create-payment/status flows use signed/short-lived tokens, one-time nonce/replay controls and rate limiting as applicable.
- Mollie webhooks verify payment state server-to-server and validate amount/currency/metadata/linked records before mutation.
- Processing must be idempotent.
- Client-supplied payment status is never authoritative.
- Payment/invoice mismatches are release-significant defects and must be reconciled at the canonical backend owner, not patched in dashboard logic.

## Production activation gate
Do not enable Mollie LIVE until TEST E2E, webhook, invoice, email, security, tenant, recovery and release gates are explicitly green.
