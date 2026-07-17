# Sales Orders Core v1

Release status: repository release
Core version: 3.3.0
Module version: 1.0.0

## Scope
- sales-order model
- order numbering
- order lines
- order status workflow
- sales-orders service
- quotation-to-order conversion
- commercial bootstrap and deterministic loader
- runtime verification before `sales-orders:core-ready`

## Runtime gate
The loader loads all Sales Orders Core modules in a fixed order and executes `FitConnectSalesOrdersVerification.verify()`. The ready event is emitted only when all required globals and public Core methods are present. A failed verification throws and prevents the module from being marked ready.

## Database
`supabase/sales-orders.sql` remains the database installation source. Repository release does not itself execute SQL against a Supabase project. Database activation must be performed in the target Supabase environment before production CRUD is used.

## Out of scope
- Sales Orders UI
- picking
- packing
- shipping
- invoicing
