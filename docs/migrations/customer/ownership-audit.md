# Sprint C — Customer Domain Ownership Audit

**Mode:** READ-ONLY  
**Repository:** `SoundBeatz/Fitconnect`  
**Branch audited:** `hostinger-static`

## Executive finding

The Customer Domain has no independent FDMP chain yet. No canonical `CustomerRepository → CustomerService → CustomerStore → CustomerRenderer` exists. Ownership is distributed across `auth.users`, `profiles`, `invoice_customers`, checkout snapshots, `admin/admin.js`, `admin/invoicing.js`, `portal/portal.js`, `shop/shop.js` and Edge Functions.

## Dataset ownership

### auth.users
Supabase Auth owns session identity. It is referenced by `profiles.id`, carts and checkout `user_id`, invoice `created_by`, order history `changed_by` and refund `requested_by`.

### profiles
Direct readers:
- `admin/admin.js`
- `portal/portal.js`
- `shop/shop.js`
- `supabase/functions/commerce-update-order/index.ts` for role authorization

No Customer Repository isolates these reads.

### invoice_customers
Direct readers/writers:
- `admin/admin.js`
- `admin/invoicing.js`

`admin/admin.js` merges `profiles` and `invoice_customers` into one global `customers` array. Invoice-only records are represented ad hoc with `role: 'invoice_customer'`.

### checkout customer data
`commerce_checkout_sessions` owns transactional customer fields and immutable `billing_address` / `shipping_address` JSONB snapshots.

## Global state

### admin/admin.js
```js
let customers=[],equipment=[],trainingPlans=[],serviceRequests=[],commerceOrders=[],currentImages=[];
```
Active monolithic patterns:
- `loadAll()`
- `renderAll()`
- `renderCustomers()`
- `loadOrders()`
- `renderOrders()`
- `renderOrderDetail()`

### admin/invoicing.js
```js
let invoices=[],organizationId=null,currentInvoice=null,lines=[],scannerStream=null;
```
The file owns invoice state, database calls, serialization, business rules and DOM rendering.

### shop/shop.js
```js
let products=[];
let brands=[];
let bundles=[];
let activeSubcategory='';
let profile=null;
let cart=loadCart();
```
Cart state is persisted in `localStorage['fitconnect-cart']`.

## DOM ownership

| DOM zone | Current owner | Finding |
|---|---|---|
| `#customerRows` | `renderCustomers()` in `admin/admin.js` | direct `innerHTML`, merged customer sources |
| `#orderRows` | `renderOrders()` in `admin/admin.js` | rendering, filtering and listener binding combined |
| `#orderAdminDetail` | `renderOrderDetail()` in `admin/admin.js` | detail UI and submit ownership combined |
| `#invoiceRows` | `admin/invoicing.js` | direct rendering |
| `#invoiceStudio` | `admin/invoicing.js` | form, state and business logic combined |
| `#invoiceLineRows` | `admin/invoicing.js` | direct line rendering |
| portal customer summary | `portal/portal.js` | direct profile reads and DOM writes |

## Repository ownership status

| Dataset | Runtime owner | FDMP status |
|---|---|---|
| Profiles | admin, portal, shop, Edge Functions | legacy/distributed |
| Invoice customers | invoicing UI | legacy |
| Checkout customer snapshot | SQL + checkout runtime | partially isolated |
| Cart | storefront browser | legacy |
| Orders | checkout table + admin + Edge Function | hybrid |
| Payments | SQL/RPC/Edge Functions | server-oriented |
| Invoices | SQL RPCs + invoicing UI | hybrid |
| Portal customer read model | not found | missing |

## Primary ownership conflict

The same customer can exist as:
1. an Auth user;
2. a `profiles` row;
3. an `invoice_customers` row;
4. a checkout snapshot;
5. an invoice customer snapshot.

No canonical Customer Domain Model owns identity, tenant context, account type, contact data and lifecycle.