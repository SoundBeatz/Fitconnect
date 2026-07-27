# FitConnect Module Registry

## Purpose

The Module Registry is the authoritative control plane for every FitConnect OS module. It separates platform capabilities from tenant activation, subscriptions, workspace overrides and frontend navigation.

## Core model

- `platform_modules`: global module catalog and immutable module keys.
- `platform_module_dependencies`: dependency graph and minimum versions.
- `organization_modules`: tenant/workspace activation and configuration.
- `organization_module_events`: append-only audit history for module changes.

## Resolution rules

A module is available only when:

1. The catalog module lifecycle is `active`.
2. An activation exists for the organization or inherited organization scope.
3. The activation status is `enabled`.
4. A trial has not expired.
5. Required dependencies are available.
6. RLS confirms organization membership.

The database function `module_is_enabled(organization_id, module_key, workspace_id)` is the server-side source of truth for availability checks. Frontend checks are for presentation only and never replace backend authorization.

## Security

- Catalog records are readable by authenticated users.
- Tenant activation records are isolated by organization membership.
- Changes require Command Center administrator access.
- Every activation/configuration mutation is written to the audit table.
- Anonymous users receive no registry access.
- Service-role access remains available for subscription provisioning and controlled automation.

## Module lifecycle

`draft -> active -> deprecated -> retired`

Lifecycle changes are global platform decisions. Tenant status is independent:

`pending -> enabled -> suspended -> disabled`

## Module contract

Every registered module must define:

- stable `module_key`;
- semantic version;
- category and lifecycle state;
- dependency declarations;
- navigation route when applicable;
- icon key from the shared design system;
- configuration JSON schema;
- billing classification;
- tenant activation policy;
- permissions and audit behavior;
- database migrations and rollback guidance;
- tests and release notes.

## Initial registry

- Core Engine
- Commerce
- Combination Deals
- Unified Invoicing
- Customer Portal
- Command Center
- Gym Platform
- AI Services

## Integration sequence

1. Apply migration.
2. Generate/update Supabase database types.
3. Build Command Center module-management API.
4. Build tenant module overview and activation UI.
5. Connect navigation visibility to resolved access.
6. Connect subscription plans to provisioning.
7. Add dependency validation and automated tests.

## Non-negotiable rule

Hiding a route or navigation item is not authorization. Every protected backend operation must independently validate tenant membership, permissions and module activation.