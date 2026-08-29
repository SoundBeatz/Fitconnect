# My Twin Edge Upload Transport Incident

**Evidence class:** RUNTIME_VERIFIED
**Date:** 2026-08-29

## Symptom

A signed-in customer could select and preview a My Twin source photo, but `Keuze opslaan` failed with `Failed to send a request to the Edge Function`.

## Runtime evidence

- `my-twin-image-ingest` was ACTIVE with `verify_jwt=true`.
- Edge logs showed successful browser `OPTIONS` preflight responses (`204`) for the ingest endpoint but no following `POST` for the failing upload attempts.
- Therefore the request failed in browser/transport before the Edge Function application body executed.

## Repair

- My Twin now uses a narrowly scoped transport adapter for `my-twin-image-ingest`.
- The adapter obtains the current authenticated session immediately before upload.
- Multipart upload is sent directly to the Edge endpoint with only `Authorization` and `apikey` request headers; browser-generated multipart `Content-Type` is preserved.
- HTTP error responses are parsed and surfaced to the UI instead of collapsing into a generic SDK transport error.
- Other Edge Function calls continue to use the canonical Supabase SDK invocation path.

## Guardrail

For browser Edge Function upload failures, distinguish transport/gateway failure from function-body failure using the sequence `OPTIONS -> POST -> function logs`. A successful preflight with no POST means the function body is not the first repair target.
