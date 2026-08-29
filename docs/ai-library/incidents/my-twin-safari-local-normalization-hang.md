# Incident — My Twin Safari local normalization hang

**Evidence class:** RUNTIME_VERIFIED
**Date:** 2026-08-29

## Symptom

On Safari 26.5.2, an authenticated customer could select a valid image and start My Twin upload, but the UI remained indefinitely on `Veilig opslaan…` / local image security processing.

## Runtime evidence

- The customer session and `user_avatars` reads were healthy.
- No request for the affected attempt reached `my-twin-image-ingest` v3.
- Therefore the stall occurred before network transport, inside browser-local normalization.
- The local decoder used `createImageBitmap()`, which was not reliable for this large-image Safari path.

## Repair

- Replace `createImageBitmap()` normalization with an `HTMLImageElement` + object URL decode path.
- Add a 20 second decode timeout.
- Add a 15 second canvas JPEG encode timeout.
- Add a 45 second Edge upload timeout.
- Surface three explicit progress phases: decode, normalize, private upload.
- Keep the 50 MB source boundary, 2048 px intermediate limit and server-side security validation unchanged.

## Guardrail

Browser-local preprocessing must always have bounded timeouts and must be tested on Safari as well as Chromium before My Twin upload changes are certified GREEN.
