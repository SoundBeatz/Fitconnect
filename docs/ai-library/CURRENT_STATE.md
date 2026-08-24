# Current State

**As of:** 2026-08-24
**Repository:** `SoundBeatz/Fitconnect`
**Last verified pre-change branch relationship:** `main == hostinger-static`
**Latest durable-memory foundation merge:** `9386428cff5befd4191d9235258a95e41bf40196` (PR #216)

Repository SHAs are evidence anchors, never permanent claims. Every development session must re-read current GitHub and Supabase/deployment state before mutation.

## Platform state — HOT

- FitConnect Enterprise SaaS baseline active; FDMP v2 ownership remains mandatory.
- Durable engineering memory exists in-repository and is governed by `.ai.memory.md` + `MEMORY_PROTOCOL.md`.
- AI Memory Guard is being enforced as CI/Definition-of-Done to detect material changes without memory consideration.
- Checkout Particulier/Zakelijk is database-enforced and new authenticated checkout profiles tenant-bind at source.
- Wishlist v1 has guest local persistence + authenticated RLS persistence.
- Central brands/categories exist; product invariants are database-enforced.
- Customer, Order, Invoice and Finance Intelligence use canonical stores/repositories.
- Order admin and invoice download Edge Functions use gateway JWT plus internal authorization.
- Public payment/webhook routes use nonce/HMAC/rate-limit/provider-verification boundaries where JWT is intentionally inappropriate.
- Payment-to-invoice mismatch count was last verified at 0 after reconciliation hardening.
- Internal tenant/auth helpers have been reduced from the authenticated RPC surface where safe.

## Known OPEN items

- Supabase Leaked Password Protection remains disabled; requires Auth management capability/manual dashboard action.
- Remaining authenticated SECURITY DEFINER advisor warnings require classification, not blind revocation.
- Legacy customer records without provable tenant evidence remain migration debt; never guess tenant assignment.
- Mollie LIVE activation remains blocked until explicit production certification; TEST mode is constitutional default.
- External perimeter controls (DNS/Hostinger/Vercel where applicable) require separate evidence-based certification.

## Next safe engineering direction

Continue evidence-based security/tenant hardening, while preserving working commerce ownership and updating durable memory for every material contract/release/incident change.

## Session rule

If this file disagrees with Git or runtime, reality wins. Classify the mismatch as stale memory, deployment drift or incident; repair both system and memory deliberately before GREEN.
