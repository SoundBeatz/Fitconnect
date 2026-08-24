# Domain Memory — Invoice

## Scope
Invoice drafts, issuing, payment registration, checkout invoice snapshots, PDFs, downloads and issuer/customer snapshots.

## Ownership
Client flow: `InvoiceRenderer -> InvoiceStore -> InvoiceService -> InvoiceRepository`.
Backend: `commerce_invoices`, invoice number sequence, invoice RPCs, issuer snapshot and invoice Edge Functions.

## Current rules
- Invoice Admin runtime resolves organization from scoped authenticated profile; internal tenant helper RPC is not a frontend fallback.
- Draft create/update/issue/payment RPCs require admin authorization and active-organization scope.
- Issued invoice numbers are immutable business identifiers.
- Proven paid webshop payments reconcile invoice status/payment_status/paid_at only when authoritative payment identity and amount match.
- Paid invoices are downloadable; download states include issued/sent/paid/overdue while draft/void/credited remain excluded.
- `commerce-download-invoice` uses gateway JWT plus internal user and order ownership verification.
- Finance Intelligence consumes InvoiceStore rather than querying a competing invoice data owner.
