# Customer Domain FDMP Design

This document defines the target only. It contains no implementation.

## Customer

```text
CustomerRepository
→ CustomerService
→ CustomerStore
→ CustomerRenderer
→ CustomerRouter
→ CustomerFactories
```

### CustomerRepository
Exclusive owner of `profiles` and `invoice_customers`, tenant filtering, customer matching, `portal_user_id` and mapping to one `CustomerDomainModel`.

### CustomerService
Owns validation, normalization, duplicate detection, guest-to-registered conversion, account rules, lifecycle hooks and errors.

### CustomerStore
Owns private immutable state, loading/error state, selection and keyed changes. It imports no other Store.

### CustomerRenderer / Factories
Renderer owns assigned DOM zones only. Factories own card/row construction, form population, serialization and UI rollback.

## Address

```text
AddressRepository
→ AddressService
→ AddressStore
→ AddressRenderer
```

A mutable address book may be introduced, but historical checkout, order and invoice JSONB snapshots are immutable and never updated retroactively. The model prepares `shipping_address_snapshot` and `billing_address_snapshot` contracts.

## Order

```text
OrderRepository
→ OrderService
→ OrderStore
→ OrderRenderer
→ PortalOrderPresenter
```

OrderRepository owns header, immutable order lines, status history, tracking and read models. OrderService owns valid transitions, fulfillment and cancellation/refund rules. Inventory and Product Stores are never imported; asynchronous EventBus contracts are used.

## Invoice

```text
InvoiceRepository
→ InvoiceService
→ InvoiceStore
→ InvoiceRenderer
→ InvoiceDownloadPresenter
```

InvoiceRepository owns invoice RPCs and sequence allocation. Invoice numbering remains database-locked through `commerce_issue_invoice` / `commerce_create_invoice_snapshot`; frontend counters are prohibited.

## Read models

- `StorefrontCustomerPricingDTO`
- `PortalCustomerReadModel`
- `PortalOrderReadModel`
- `PortalInvoiceReadModel`

Each exposes the minimum fields required for its consumer.

## Security

- organization-scoped repository queries;
- ownership checks in addition to tenant membership;
- no direct storefront `profiles` reads;
- no public `select('*')`;
- service-role server-side only;
- customer matching never by email without tenant context;
- immutable fiscal and shipping snapshots;
- deep-frozen Store snapshots;
- no PII in logs;
- secure, ownership-checked invoice downloads.

## Migration sequence

1. Customer Repository / Service / Store foundation.
2. Controlled bridge to existing admin UI.
3. Customer Renderer and Factory ownership.
4. Direct `profiles` / `invoice_customers` calls removed outside repository.
5. Address Domain and snapshot contracts.
6. Order Domain and immutable order items.
7. Invoice Domain split.
8. Portal read models.
9. Legacy removal and permanent CI guards.