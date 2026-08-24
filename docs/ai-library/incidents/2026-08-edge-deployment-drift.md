# Incident — Edge Deployment Drift

**Date:** 2026-08
**Status:** Resolved for observed functions; release provenance remains mandatory

## Symptom
Repository source for `commerce-update-order` already returned payments and cart items, while the deployed Supabase Edge Function still ran an older response contract. Executive Intelligence and Order UI therefore received incomplete runtime data despite correct Git source.

## Root cause
Production Edge deployment had drifted behind repository state; deployment workflow provenance did not guarantee that the intended source/version was live.

## Fix
- Deploy exact repository source and all shared dependencies.
- Verify active Edge version and `verify_jwt` classification after deployment.
- Update deploy workflows so later releases preserve intended JWT gateway configuration.

## Prevention law
Never diagnose a production regression from Git alone. Compare intended source SHA/workflow with deployed Edge metadata and runtime contract before changing application logic.
