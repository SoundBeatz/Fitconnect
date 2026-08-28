# Incident — is_admin login contract regression

**Date:** 2026-08-28
**Status:** REPAIRED / RUNTIME_VERIFIED

## Symptom

Authenticated customer login returned `permission denied for function is_admin` after Supabase Auth itself successfully returned HTTP 200.

## Cause

Security hardening revoked authenticated EXECUTE from `public.is_admin()` after repository search did not reveal a direct frontend RPC call. Production bootstrap still depended on this function, so the classification was incorrect.

## Repair

Authenticated EXECUTE on `public.is_admin()` was restored. `anon` remains denied. Runtime privilege verification confirmed authenticated=true, anon=false.

## Guardrail

Do not revoke a legacy/helper RPC based on repository search alone. Before privilege removal, prove the production bootstrap/login/runtime contract with live regression coverage or an equivalent runtime trace. Login-critical authorization helpers must be classified as intentional client contracts until replaced in application code and production verified.
