# Domain Memory — Customer

## Scope
Customer identity/profile, Customer360, communications, wallet, subscriptions and tenant relationship.

## Ownership
Client flow: `CustomerRenderer -> CustomerStore -> CustomerService -> CustomerRepository`.
Backend truth: `profiles` plus Customer360 tables/RPCs under server-side tenant enforcement.

## Current rules
- Customer Admin reads/mutations require explicit tenant context and fail closed when unavailable.
- Customer360 admin mutations validate that the target customer belongs to the active organization.
- Checkout is the source of tenant binding for newly authenticated commerce customers.
- Existing tenant assignment must never silently move to another organization.
- Legacy profiles without provable tenant evidence are migration debt, not permission to guess.
- Admin-wide profile visibility must not be allowed to turn an unscoped repository read into cross-tenant UI exposure.

## Legacy rule
Reconcile only when a single organization can be proven from authoritative domain evidence. Record ambiguous cases; do not auto-assign.
