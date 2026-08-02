# Product Cross-Domain Matrix

| Domain | Product dependency | Migration constraint |
|---|---|---|
| Brands | Product brand selection, display and filtering | Preserve current brand names while moving toward stable IDs |
| Suppliers | Product purchasing and editor selection | Product DTO must expose supplier reference without embedding supplier state |
| Inventory | `stock`, availability and bundle eligibility | Inventory updates require explicit events and transaction boundaries |
| Media | `images` array and `product-media` bucket | Storage operations must be isolated from ProductRenderer |
| SEO | SEO values currently embedded in `specifications` | Typed SEO value object required before schema migration |
| Combination Deals | Products, prices, VAT, stock and purchase price | Bundle domain consumes immutable Product projections; never Product DOM state |
| Shop | Active product catalogue, filters and pricing | Public read model must remain backward compatible during migration |
| Product Detail | Complete active product record by slug | Canonical normalized storefront DTO required |
| Cart / Checkout | Product ID, name, price, VAT and stock | Cart must retain stable IDs and server-side price verification |
| Orders | Product snapshots and SKU | Historical order lines must not depend on mutable ProductStore state |
| Unified Invoicing | Product names, prices, VAT and line descriptions | Invoice lines remain immutable snapshots |
| Customer Portal | Orders, equipment and product references | Portal consumes read projections only |
| Command Center Intelligence | Product counts and stock totals | Dashboard becomes a Store consumer after ProductStore certification |

## Boundary decision

Products is the aggregate root for product identity and commercial presentation, but it does not own Brand, Supplier, Inventory transaction history, Bundle, Order or Invoice state.

Cross-domain communication must use immutable projections or explicit events, never shared global arrays or direct DOM inspection.