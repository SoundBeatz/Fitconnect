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

## Generation flow v1

1. Customer presses `AI-avatar genereren`.
2. `my-twin-generate` revalidates user JWT and resolves only the caller's AI avatar/source version.
3. Identity profile is created/refreshed server-side.
4. A single active generation job is created or resumed.
5. Without `MY_TWIN_RENDERER_URL`, job becomes `awaiting_renderer` and **no image leaves FitConnect**.
6. With a certified renderer, FitConnect downloads the private source server-side and sends it to the configured render adapter with the canonical prompt contract and consistency seed.
7. Renderer output must be JPEG/PNG, pass magic-byte and <=5 MB checks, then is stored privately.
8. A new `avatar_versions` record is created and `user_avatars.avatar_image/status/active_version` move atomically through the controlled backend flow.
9. Portal renders the ready canonical output with a subtle idle/breathing presentation.

## Renderer adapter contract

Environment:
- `MY_TWIN_RENDERER_URL` — required for actual generation
- `MY_TWIN_RENDERER_API_KEY` — optional server-only bearer secret

Request: multipart POST with identity reference image, canonical prompt, prompt revision, consistency seed, render contract and job id.

Response v1: synchronous raw `image/jpeg` or `image/png`, max 5 MB.

Never expose renderer credentials or private Storage paths as public URLs.

## Status model

Avatar: `draft | uploaded | processing | ready | failed`

Generation job: `queued | awaiting_renderer | rendering | ready | failed | cancelled`

## Next layer

After the renderer is certified and Canonical V1 can be approved, add Body State Engine fields sourced from measurements and create comparison/timeline versions. Identity parameters stay fixed; only body-state parameters may change.
