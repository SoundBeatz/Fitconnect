# My Twin Edge WASM Startup Crash

**Status:** RESOLVED
**Evidence class:** RUNTIME_VERIFIED

## Incident

`my-twin-image-ingest` version 2 returned HTTP 500 on the browser CORS `OPTIONS` preflight before request handling. Version 1 had returned 204. Production Safari therefore surfaced `Failed to send a request to the Edge Function` and no upload POST reached application code.

## Root cause

The function initialized ImageMagick WASM at module startup. A startup failure occurred before `Deno.serve()` could handle even OPTIONS requests, taking the entire ingest endpoint offline.

## Repair

- Removed the ImageMagick WASM startup dependency.
- Kept `verify_jwt=true` and internal user validation.
- Kept strict FitConnect origin allowlisting and made allowed request headers compatible with the live Supabase client preflight.
- Kept the 4 MB server ingress limit, JPEG magic-byte/dimension/pixel checks and rate limiting.
- Replaced WASM re-encoding with pure TypeScript JPEG metadata-segment stripping before private Storage persistence.
- Persisted sanitized output as `image/jpeg`; the `avatars` bucket already allows private JPEG and WebP objects with a 5 MB object cap.
- Deployed runtime version 3.

## Guardrail

Never place optional/heavy native or WASM initialization before the request handler of a production Edge Function unless cold-start failure has been explicitly tested. Health/CORS paths must remain executable independently of media-processing initialization.
