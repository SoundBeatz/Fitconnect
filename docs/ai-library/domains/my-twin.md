# My Twin Domain Memory

**Evidence class:** GIT_VERIFIED + RUNTIME_VERIFIED where noted

## Purpose

My Twin is FitConnect's longitudinal visual body-state domain. It must preserve one recognizable user identity across versions while allowing later body-state changes (weight, body fat, muscle mass, measurements) to be rendered and compared.

## Canonical ownership

- User-level avatar owner: `public.user_avatars`
- Version history owner: `public.avatar_versions`
- Canonical identity contract: `public.my_twin_identity_profiles`
- Generation workflow/job owner: `public.my_twin_generation_jobs`
- Private media bucket: `avatars`
- Secure source ingest Edge Function: `my-twin-image-ingest`
- Canonical generation gateway: `my-twin-generate`
- Internal OpenAI renderer: `my-twin-render-openai`
- Portal UI: `portal/twin/`

Do not introduce duplicate compatibility columns when runtime canonical names already exist.

## Canonical avatar schema contract

`user_avatars` uses:
- `user_id`
- `avatar_type`
- `gender`
- `suit`
- `avatar_image`
- `source_photo`
- `status`
- `active_version`
- source/processed audit metadata

`avatar_versions` uses:
- `avatar_id`
- `version`
- `avatar_image`
- measurement/body-state fields where applicable
- source/processed audit metadata
- notes

Versions are linked through `avatar_id`, never through an invented `user_id` column.

## Identity contract v1

My Twin deliberately does **not** store biometric embeddings or facial vectors. Reproducibility uses:
- secured source image SHA-256
- monotonic `identity_revision`
- fixed `prompt_revision`
- fixed render contract (pose/camera/background/suit/lighting)
- stable per-identity `consistency_seed`

When a secured source photo hash changes, `identity_revision` increments.

## Secure image flow

1. Browser accepts JPG/PNG/WebP up to 50 MB.
2. Browser decodes, resizes to max 2048 px and converts to <=4 MB JPEG.
3. Heavy original remains on-device and is not persisted.
4. `my-twin-image-ingest` revalidates JWT, origin, rate limit, JPEG magic bytes/dimensions and strips JPEG metadata.
5. Sanitized source is stored privately in `avatars/<user>/processed/...`.
6. `user_avatars` + `avatar_versions` are updated through the canonical schema.

Client source ingest remains JPEG-only after normalization. Generated derivatives may be validated JPEG or PNG.

## Generation flow v1

1. Customer presses `AI-avatar genereren`.
2. `my-twin-generate` revalidates user JWT and resolves only the caller's AI avatar/source version.
3. Identity profile is created/refreshed server-side.
4. A single active generation job is created or resumed; new jobs are capped at 5 per rolling 24 hours per user.
5. Gateway downloads the private sanitized source server-side and calls only the internal `my-twin-render-openai` function using service-role authentication.
6. The renderer validates that the caller token equals the backend service-role secret before any provider call.
7. Renderer sends the image edit request server-to-server to OpenAI GPT-Image-2 (`/v1/images/edits`) with the fixed canonical prompt, portrait output size and medium quality.
8. `OPENAI_API_KEY` is the only provider secret. It exists only in Supabase Edge Function secrets; it is never sent to the browser or persisted in application tables/log payloads.
9. Renderer output must be JPEG/PNG, valid magic bytes and <=5 MB before returning to the gateway.
10. Gateway revalidates output, stores it privately, creates the next `avatar_versions` record, and moves `user_avatars.avatar_image/status/active_version` to the new canonical render.
11. Portal renders the ready canonical output with a subtle idle/breathing presentation.

## Renderer contract v1

Current production renderer target: OpenAI `gpt-image-2` image-edit endpoint.

Security boundary:
- browser can call `my-twin-generate` with user JWT;
- browser cannot call renderer successfully because `my-twin-render-openai` additionally requires the exact server service-role token;
- provider key is `OPENAI_API_KEY` server-side only;
- provider response is revalidated before persistence.

Current render defaults:
- size: `1024x1536`
- quality: `medium`
- canonical front-facing full-body pose
- fixed dark studio + softbox lighting
- fitted black FitConnect-style performance outfit without third-party/readable branding
- identity preservation prioritized; no beautification, de-aging, slimming or artificial muscular exaggeration

## Private media contract

`avatars` bucket runtime contract:
- `public = false`
- object limit: 5 MB
- allowed MIME: `image/jpeg`, `image/webp`, `image/png`

The PNG allowance exists specifically for validated generated renderer output. It does not weaken the source-photo ingest contract, which still accepts only the browser-normalized JPEG at the authenticated ingest function.

## Incident: generated PNG storage mismatch

Live GPT-Image-2 calls returned HTTP 200, but `my-twin-generate` then failed with `OUTPUT_STORAGE_FAILED`. Runtime inspection proved the private bucket allowed only JPEG/WebP while the renderer returned a valid PNG. Migration `202608290008_my_twin_generated_png_storage_v1.sql` added PNG to the bucket allowlist while preserving private visibility and the 5 MB limit.

## Status model

Avatar: `draft | uploaded | processing | ready | failed`

Generation job: `queued | awaiting_renderer | rendering | ready | failed | cancelled`

## Operational activation

The existing Supabase `OPENAI_API_KEY` has been runtime-proven usable by live `my-twin-render-openai` HTTP 200 calls. Do not rotate or replace it without explicit key-ownership analysis because other server functions may share the same secret name.

## Next layer

Re-run and visually certify Canonical V1 after the storage repair. Then add Canonical Approval + Body State Engine fields sourced from measurements and create comparison/timeline versions. Identity parameters stay fixed; only body-state parameters may change.
