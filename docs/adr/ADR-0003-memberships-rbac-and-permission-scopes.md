# ADR-0003 — Memberships, RBAC and Permission Scopes

- Status: Accepted
- Date: 2026-07-18
- Decision owners: FitConnect Architecture

## Context

The current `profiles` table contains a simple role distinction such as `admin` and `customer`. That is sufficient for the current application but cannot represent enterprise access requirements such as:

- one user belonging to multiple tenants;
- different roles per organisation or workspace;
- temporary staff access;
- dealer, coach, service, finance and content responsibilities;
- least-privilege access;
- white-label tenant administration without platform administration.

A role stored directly on the user profile would make permissions global and would prevent safe multi-tenant operation.

## Decision

Authentication identity and authorization are separated.

```text
auth.users
└── profiles
    └── memberships
        ├── tenant
        ├── organisation (optional)
        ├── workspace (optional)
        ├── role
        └── status
```

### Profiles

`profiles` stores person-level and customer-facing profile information. It is not the final source of authorization.

### Memberships

A membership connects one user to one tenant and optionally narrows that access to an organisation or workspace.

A user may have multiple memberships.

### Roles

Roles are named permission bundles. Initial system roles are expected to include:

- `platform_admin`
- `tenant_owner`
- `tenant_admin`
- `organisation_admin`
- `workspace_manager`
- `coach`
- `sales`
- `service_agent`
- `content_manager`
- `finance`
- `member`
- `customer`

Role names are stable identifiers. Display names are localizable.

### Permissions

Permissions use explicit resource-action identifiers:

```text
products.read
products.create
products.update
products.delete
leads.read
leads.assign
members.read
members.manage
settings.theme.update
billing.invoices.read
```

Roles receive permissions through role-permission assignments.

### Scope hierarchy

Permission evaluation uses the following scope order:

```text
Platform
→ Tenant
→ Organisation
→ Workspace
→ Owned record
```

A broader scope does not exist implicitly. It must be granted by membership and role.

## Core authorization tables

The target model contains at minimum:

```text
memberships
roles
permissions
role_permissions
membership_roles
```

The precise physical model may combine `membership_roles` into `memberships` for the initial version when one role per membership is enforced. The API contract must allow future multiple-role support.

## Membership lifecycle

Memberships have explicit states:

- `invited`
- `active`
- `suspended`
- `revoked`

Only `active` memberships grant access.

Membership records must retain audit history when access is suspended or revoked. Hard deletion is not the default.

## RLS strategy

RLS policies must use centralized, security-reviewed helper functions rather than repeating complex joins in every policy.

Expected helpers include:

```text
current_user_id()
current_tenant_ids()
has_membership(tenant_id, organisation_id, workspace_id)
has_permission(permission_key, tenant_id, organisation_id, workspace_id)
is_platform_admin()
```

Helpers that use `SECURITY DEFINER` must:

1. set a safe `search_path`;
2. use fully qualified relations;
3. have minimal `EXECUTE` grants;
4. avoid user-controlled dynamic SQL;
5. be covered by tenant-isolation tests.

## Compatibility with current `is_admin()`

The existing `public.is_admin()` function remains temporarily supported for current application behaviour.

It will be treated as a legacy compatibility helper and must not become the authorization foundation for new modules.

Migration path:

1. introduce membership-based helpers;
2. migrate new policies first;
3. migrate existing admin policies incrementally;
4. verify all admin workflows;
5. deprecate the global profile role check;
6. remove only in a later explicit migration.

## Default-deny rules

- No active membership means no tenant access.
- No permission assignment means the action is denied.
- Frontend visibility never replaces backend authorization.
- Service-role access is restricted to trusted backend execution.
- Tenant admins cannot access platform administration.
- Tenant membership never grants access to another tenant.

## Auditing

The following authorization events must be auditable:

- invitation created, accepted or cancelled;
- membership activated, suspended or revoked;
- role assigned or removed;
- permission bundle changed;
- privileged action denied;
- platform administrator impersonation, when introduced.

## Consequences

### Positive

- users can safely belong to multiple businesses;
- roles vary by tenant and workspace;
- least privilege becomes enforceable;
- RLS and API authorization share one model;
- enterprise role expansion does not require changing `profiles`.

### Costs

- authorization queries become more complex;
- caching and helper-function performance require attention;
- migration from the current global role must be phased;
- automated permission-matrix tests become mandatory.

## Rejected alternatives

### Keep one global role on `profiles`

Rejected because roles must differ by tenant, organisation and workspace.

### Store permission arrays in JWT metadata only

Rejected because permission changes would be stale until token refresh and database RLS could not reliably treat JWT claims as the sole source of truth.

### Hardcode role checks in application code

Rejected because web, mobile, APIs and database policies would drift and create security inconsistencies.
