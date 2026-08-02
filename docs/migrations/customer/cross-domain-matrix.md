# Customer Domain Cross-Domain Matrix

| Source | Target | Current coupling | Risk |
|---|---|---|---|
| Auth | Profiles | shared UUID | profile combines identity and customer concerns |
| Profiles | Storefront pricing | direct browser query | no public pricing read model |
| Profiles | Portal | direct browser query | no portal customer read model |
| Profiles | Admin | direct browser query | no repository ownership |
| Profiles | Invoice customers | `portal_user_id` | duplicate identity and UI matching |
| Cart | Products | `productId` | browser state |
| Cart | Bundles | `bundleId` | browser state |
| Checkout | Customer | embedded fields | canonical customer id not required |
| Checkout | Addresses | JSONB snapshots | historical integrity, no Address Domain |
| Checkout | Payments | `checkout_session_id` | explicit FK |
| Checkout | Sales Orders | optional `sales_order_id` | active owner not proven |
| Orders | Cart items | `cart_id` | order lines remain dependent on cart |
| Orders | Notifications | Edge Function + delivery journal | shipping path proven only |
| Orders | Inventory | not proven | critical lifecycle gap |
| Payments | Checkout | SQL transition | payment completes checkout |
| Payments | Invoices | `payment_id` | snapshot RPC available |
| Invoices | Customer | JSON customer snapshot | historically correct |
| Invoices | Invoice customers | `invoice_customer_id` | linked by frontend after save |
| Invoices | Products | product selection in frontend | line details become snapshot |
| Invoices | VAT | line `tax_rate` | totals calculated frontend and SQL |
| Portal | Orders | not found in `portal.js` | portal order read model unresolved |
| Portal | Invoices | not found in `portal.js` | secure download ownership unresolved |
| AI | Invoice customer scan | `commerce-scan-customer` | recognition result flows directly into form |
| Command Center | Orders | `admin/admin.js` + Edge Function | monolithic UI owner |
| Command Center | Invoices | `admin/invoicing.js` | repository, state, rules and DOM combined |

## Isolation requirements for migration

- CustomerStore must not import ProductStore, InventoryStore, OrderStore or InvoiceStore.
- Cross-domain state changes use EventBus events and explicit DTOs.
- Order and invoice transaction snapshots remain immutable.
- Storefront and portal consumers receive minimum read models, never full admin/customer records.
- Customer matching always includes organization context.