# Current State

**As of:** 2026-08-29
**Repository:** `SoundBeatz/Fitconnect`
**Last verified pre-change branch relationship:** `main == hostinger-static`

Repository SHAs are evidence anchors, never permanent claims. Every development session must re-read current GitHub and Supabase/deployment state before mutation.

## Platform state — HOT

- FitConnect Enterprise SaaS baseline active; FDMP v2 ownership remains mandatory.
- Durable engineering memory exists in-repository and is governed by `.ai.memory.md` + `MEMORY_PROTOCOL.md`.
- AI Memory Guard and FitConnect Engineering Preflight are mandatory CI/Definition-of-Done gates.
- Checkout Particulier/Zakelijk is database-enforced and new authenticated checkout profiles tenant-bind at source.
- Wishlist v1 has guest local persistence + authenticated RLS persistence.
- Central brands/categories exist; product invariants are database-enforced.
- Customer, Order, Invoice and Finance Intelligence use canonical stores/repositories.
- Order admin and invoice download Edge Functions use gateway JWT plus internal authorization.
- Public payment/webhook routes use nonce/HMAC/rate-limit/provider-verification boundaries where JWT is intentionally inappropriate.
- Payment-to-invoice mismatch count was last verified at 0 after reconciliation hardening.
- Internal tenant/auth helpers have been reduced from the authenticated RPC surface where safe.
- My Twin secure image intake is operational: source images up to 50 MB are normalized locally; only a <=4 MB metadata-stripped JPEG is persisted privately through `my-twin-image-ingest`.
- My Twin canonical persistence contract is aligned to runtime `user_avatars` + `avatar_versions` schema.
- My Twin Canonical Identity Engine v1 now owns identity profiles, deterministic render contracts, generation jobs, version handoff and a JWT-protected `my-twin-generate` gateway.
- My Twin generation deliberately stores no biometric embedding/vector. Reproducibility uses source SHA-256, identity revision, prompt revision, fixed render contract and consistency seed.
- My Twin renderer integration is provider-neutral. Runtime generation gateway is active, but the external server-side renderer remains OPEN until `MY_TWIN_RENDERER_URL` (and optional server-only key) is configured.

## Known OPEN items

- My Twin image renderer activation: configure a production render adapter/provider behind `MY_TWIN_RENDERER_URL`; never expose provider credentials to the browser.
- Supabase Leaked Password Protection remains disabled; requires Auth management capability/manual dashboard action.
- Remaining authenticated SECURITY DEFINER advisor warnings require classification, not blind revocation.
- Legacy customer records without provable tenant evidence remain migration debt; never guess tenant assignment.
- Mollie LIVE activation remains blocked until explicit production certification; TEST mode is constitutional default.
- External perimeter controls (DNS/Hostinger/Vercel where applicable) require separate evidence-based certification.

## Next safe engineering direction

Activate and certify the My Twin render adapter, then build canonical V1 approval + longitudinal body-state/timeline versions on top of the fixed identity contract. Continue evidence-based platform security hardening in parallel without breaking intentional client contracts.

## Session rule

If this file disagrees with Git or runtime, reality wins. Classify the mismatch as stale memory, deployment drift or incident; repair both system and memory deliberately before GREEN.
