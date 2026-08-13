# FitConnect AI Incident Library

## Incident: Command Center Auth Bootstrap / Redirect Loop

**Incident ID:** FC-AUTH-2026-08-13-001  
**Date:** 2026-08-13  
**Severity:** P0  
**Status:** RESOLVED / PRODUCTION VERIFIED  
**Affected surface:** `/admin/` Command Center only  
**Unaffected surfaces:** public website and authenticated customer/client portal

## Problem

After a valid user session entered the FitConnect Command Center, the admin page immediately began rapidly flickering. If allowed to continue, the browser generated a request storm and Hostinger Edge eventually returned HTTP 429.

The 429 was secondary damage, not the primary defect.

Observed pattern:

`valid login -> /admin/ -> early admin bootstrap failure -> login/admin navigation cycle -> repeated bootstrap reads -> request storm -> Hostinger 429`

Supabase remained reachable and the repeated API reads returned HTTP 200. This proved that the primary failure was in the Command Center client bootstrap/auth lifecycle rather than Supabase availability or the customer portal session.

## Contributing Conditions

1. The Command Center contained overlapping authentication ownership. Both `auth-flow.js` and legacy logic in `admin.js` performed session/admin checks and redirects.
2. Legacy `/admin/login.html` redirect behavior could participate in a login/admin ping-pong cycle.
3. The admin authorization bootstrap depended on `window.CustomerRepository` being available very early in the parser lifecycle.
4. `auth-flow.js` injected repository foundation scripts during parsing while authorization could start before the canonical repository had completed execution.
5. When `CustomerRepository` was unavailable during that narrow bootstrap window, authorization failed before the expected admin profile query was reached.
6. The central login still saw a valid admin session and could route back into `/admin/`, repeating the failure rapidly.
7. Old asset cache identifiers and earlier deployment drift complicated diagnosis but were not the final root repair.

## Root Cause

The decisive root cause was an **admin authorization bootstrap ordering race** combined with **multiple auth owners**.

The canonical `CustomerRepository` was not guaranteed to exist at the exact moment the central admin authorization flow needed `getAuthorizationProfile(userId)`. A transient bootstrap failure could therefore occur before normal Command Center authorization completed. Because the authenticated session itself remained valid, routing could immediately return the user to the Command Center and restart the cycle.

## Solution

### Repair 1 — Single Admin Auth Owner

PR #147 removed the duplicate legacy authorization ownership from `admin/admin.js`.

Canonical rule:

- `auth-flow.js` owns Command Center authentication and authorization.
- `admin.js` MUST NOT independently perform a competing `getSession()` / role guard / login redirect.
- Command Center application initialization waits for the central authorization state/event.

Production merge commit:

`60000432bc6f1a8f0de26390df81d60171e9e1a1`

### Repair 2 — Authorization Bootstrap Compatibility Shim

PR #148 added a temporary **read-only `CustomerRepository` bootstrap shim** to `shared/supabase-config.js`.

The shim provides only the authorization method required during early bootstrap:

`getAuthorizationProfile(userId)`

It performs the existing read against `profiles` and does not add database writes, role escalation, RLS changes, payment changes or permission changes.

When the canonical `admin/customer-repository.js` executes, it replaces the temporary shim with the full repository implementation.

Production merge commit:

`ba21fa74264d7f31ef6248ba3e9bc171cd6e6614`

After deployment of PR #148, the Command Center opened stably and the flicker/request storm stopped.

## Security Properties Preserved

- No RLS weakening.
- No admin-role broadening.
- No authentication bypass.
- No service-role exposure.
- No payment/security boundary changes.
- Authorization profile lookup remains read-only.
- Canonical repository ownership remains the final runtime owner after bootstrap.

## Diagnostic Lessons

1. **429 is not automatically the root cause.** Determine what is generating the traffic before tuning rate limits.
2. If the public site and customer portal are stable but `/admin/` loops, isolate the admin auth/bootstrap path first.
3. Repeated Supabase HTTP 200 reads can indicate a client reload/redirect loop rather than a database problem.
4. Authentication must have one canonical owner per application surface.
5. Parser-time dynamic script injection MUST NOT be assumed to make dependencies synchronously available to authorization code.
6. Critical authorization dependencies must be deterministic before authorization starts.
7. Never repair an authorization bootstrap race by weakening RLS or role checks.
8. Stop a request storm quickly during diagnosis to avoid secondary Hostinger/CDN 429 throttling.
9. Production branch/deployment provenance must be verified before judging whether a code hotfix is live.

## Mandatory Regression Tests

Any future modification to Command Center authentication, Supabase bootstrap, CustomerRepository, admin routing or script load order MUST test:

1. anonymous user -> `/admin/` -> controlled login behavior;
2. authenticated customer -> `/admin/` -> denied without redirect loop;
3. authenticated admin -> `/admin/` -> one authorization cycle and stable Command Center;
4. authenticated customer -> `/portal/` -> remains stable;
5. admin refresh -> stable, no repeated navigation;
6. logout -> one deterministic redirect;
7. browser network log -> no repeated profile/theme/bootstrap storm;
8. production runtime -> no Hostinger 429 caused by client navigation loops.

## Prevention Rule

**LAW_ADMIN_AUTH_SINGLE_OWNER**

For the FitConnect Command Center there MUST be exactly one canonical authentication/authorization owner. Secondary modules MUST consume the resulting authorization state and MUST NOT independently redirect based on competing session checks.

**LAW_AUTH_BOOTSTRAP_DETERMINISM**

Every dependency required to decide authorization MUST be deterministically available before authorization executes. Parser-injected or lazy dependencies MUST NOT create a timing-dependent authorization boundary.

## Recovery Playbook

If Command Center flickering ever returns:

1. close the looping admin tab to prevent 429 escalation;
2. confirm public site and customer portal health;
3. inspect live API request cadence;
4. determine whether expected admin authorization reads are reached;
5. inspect login/admin redirect parameters;
6. verify only one admin auth owner is active;
7. verify `CustomerRepository.getAuthorizationProfile()` is available before authorization;
8. verify production is actually running the intended `hostinger-static` release;
9. repair the earliest failing boundary, not the downstream 429 symptom;
10. regression-test admin, customer portal and logout before declaring green.
