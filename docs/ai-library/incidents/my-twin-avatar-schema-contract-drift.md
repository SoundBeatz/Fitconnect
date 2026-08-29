# Incident — My Twin avatar schema contract drift

**Evidence class:** RUNTIME_VERIFIED
**Date:** 2026-08-29

## Symptom

My Twin personal photo upload progressed through browser normalization and authenticated Edge ingress, then failed sequentially with backend errors including `Image security service unavailable` and `Avatarversie kon niet worden bepaald.`

## Root cause

The My Twin Edge Function and portal had drifted from the canonical production schema. Runtime tables use:

- `user_avatars`: `user_id`, `avatar_type`, `gender`, `suit`, `source_photo`, `status`, `active_version`
- `avatar_versions`: `avatar_id`, `version`, `avatar_image`

The newer client/Edge code incorrectly referenced non-existent compatibility-style fields such as `body_type`, `suit_style`, `source_photo_path`, `current_version` and `avatar_versions.user_id`.

A separate hardening change had also removed service-role DML required by the server-side ingest path.

## Repair

- Production Edge Function v4 aligned to the canonical schema.
- Version sequencing now resolves `user_avatars.id` then reads `avatar_versions` by `avatar_id`.
- Portal standard and personal avatar flows use canonical column names and valid status values.
- `service_role` receives only the DML needed by the authenticated ingest service.
- Browser/client RLS ownership controls remain intact.
- My Twin cache key advanced to force the corrected client contract.

## Prevention

Before changing a persistence contract, verify live `information_schema`, constraints, indexes and RLS and treat those as runtime truth. Repository code must not invent compatibility column names that are absent from the canonical schema. My Twin changes must validate the full chain: browser payload → Edge payload → table columns → RLS/privileges → reload/readback.
