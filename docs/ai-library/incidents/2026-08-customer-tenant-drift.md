# Incident — Customer Tenant Drift

**Date:** 2026-08
**Status:** Source fixed; legacy debt remains isolated

## Symptom
Customer profiles created through authenticated checkout could remain with `organization_id = NULL`, while tenant context existed elsewhere in commerce data. Admin-wide profile visibility then made unscoped customer loading a white-label risk.

## Root cause
Checkout profile synchronization updated account/business fields but did not bind the profile to the checkout organization.

## Fix
- Checkout trigger binds an unscoped authenticated profile to `checkout.organization_id`.
- Existing profile tenant may not be silently reassigned.
- Customer Admin runtime requires explicit organization context.
- Customer360 admin mutations validate target customer tenant membership.
- Legacy records are migrated only when tenant provenance is unambiguous.

## Prevention law
Tenant identity must be written at the earliest authoritative creation/binding event. Do not rely on downstream inference as a permanent tenancy model.
