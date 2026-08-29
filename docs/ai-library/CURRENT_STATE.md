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
- My Twin Canonical Identity Engine v1 owns identity profiles, deterministic render contracts, generation jobs, version handoff and the JWT-protected `my-twin-generate` gateway.
- My Twin generation stores no biometric embedding/vector. Reproducibility uses source SHA-256, identity revision, prompt revision, fixed render contract and consistency seed.
- My Twin now has a dedicated internal renderer `my-twin-render-openai` targeting OpenAI GPT-Image-2 image editing. `my-twin-generate` calls this renderer server-to-server using service-role authentication; browser code never receives provider credentials.
- Renderer output is constrained to portrait canonical renders and revalidated for MIME/magic bytes/size before private persistence and version promotion.
- My Twin generation has a rolling 24-hour per-user creation cap and reuses active jobs to reduce duplicate provider calls.

## Known OPEN items

- My Twin renderer activation: `OPENAI_API_KEY` must be configured as a Supabase Edge Function secret. Current connector surface cannot manage Edge Function secrets, so this remains an explicit manual dashboard action. Never place the key in Git/frontend.
- Supabase Leaked Password Protection remains disabled; requires Auth management capability/manual dashboard action.
- Remaining authenticated SECURITY DEFINER advisor warnings require classification, not blind revocation.
- Legacy customer records without provable tenant evidence remain migration debt; never guess tenant assignment.
- Mollie LIVE activation remains blocked until explicit production certification; TEST mode is constitutional default.
- External perimeter controls (DNS/Hostinger/Vercel where applicable) require separate evidence-based certification.

## Next safe engineering direction

Activate the server-only `OPENAI_API_KEY`, certify the first Canonical My Twin render, then build Canonical Approval + Body State Engine/timeline versions on top of the fixed identity contract. Continue evidence-based platform security hardening in parallel without breaking intentional client contracts.

## Session rule

If this file disagrees with Git or runtime, reality wins. Classify the mismatch as stale memory, deployment drift or incident; repair both system and memory deliberately before GREEN.
