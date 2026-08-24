# Current State

**As of:** 2026-08-24
**Repository:** `SoundBeatz/Fitconnect`
**Production branch relationship at initialization:** `main == hostinger-static`
**Functional baseline at memory initialization:** `72e816684c60ab5b36c90a5449f5d36d641ac5db`

The SHA above is a historical anchor, not a permanent claim that it is still the current repository head. Every development session must re-read current GitHub/Supabase state before mutation and update this document when material platform state changes.

## Platform state

- FitConnect Enterprise SaaS baseline active.
- FDMP v2 ownership model remains mandatory.
- Checkout Particulier/Zakelijk is merged and database-enforced.
- Wishlist v1 is implemented with guest localStorage + authenticated RLS persistence.
- Central brand/catalog category structure exists and product invariants are database-enforced.
- Customer, Order, Invoice and Finance Intelligence runtimes are connected to canonical stores/repositories.
- Order admin and invoice download Edge Functions use gateway JWT plus internal authorization.
- Payment/webhook flows intentionally use alternative security boundaries where JWT is not appropriate.
- Payment-to-invoice mismatch count was verified at 0 after reconciliation hardening.
- New authenticated checkout profiles are tenant-bound at the source.
- Ambiguous legacy customer profiles must not be guessed into tenants.

## Known open items

- Supabase Leaked Password Protection remains disabled and requires an available Auth management capability or manual dashboard action.
- Remaining authenticated SECURITY DEFINER advisor warnings require classification, not blind revocation.
- Legacy customer records without provable tenant evidence remain migration debt.
- Mollie LIVE activation remains blocked until explicit production certification; TEST mode is constitutional default.
- External perimeter controls (DNS/Hostinger/Vercel where applicable) must remain evidence-based and separately certified.

## Session rule

Before changing anything, re-verify this file against current GitHub and Supabase. If reality differs, reality wins. Update the durable memory through a reviewed change when the difference is material to architecture, ownership, security, release provenance or operations.
