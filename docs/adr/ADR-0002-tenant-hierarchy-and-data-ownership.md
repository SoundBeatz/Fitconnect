# ADR-0002 — Tenant Hierarchy and Data Ownership

- Status: Accepted
- Date: 2026-07-18
- Decision owners: FitConnect Architecture

## Context

FitConnect OS must support thousands of independent businesses, white-label deployments, multiple legal entities, multiple locations, multiple workspaces and users with scoped access.

The current database contains business tables in `public` and is not yet tenant-aware. Adding a simple `tenant_id` everywhere without a formal ownership model would create ambiguity around billing, branding, legal ownership, access control and cross-location operations.

## Decision

FitConnect adopts the following canonical hierarchy:

```text
Platform
└── Tenant
    ├── Branding
    ├── Subscription
    ├── Enabled modules
    ├── Domains
    ├── AI configuration
    └── Organisations
        ├── Legal entity
        ├── Tax profile
        ├── Billing identity
        └── Workspaces
            ├── Gym
            ├── Showroom
            ├── Dealer branch
            ├── Warehouse
            └── Service department
```

### Platform

The global FitConnect environment. Platform-level data is owned by FitConnect and is not tenant-scoped.

### Tenant

The commercial SaaS customer boundary. A tenant owns its subscription, white-label identity, enabled modules, domains and global configuration.

### Organisation

A legal or operational entity belonging to one tenant. An organisation may have its own legal name, chamber-of-commerce registration, tax information, billing details and country settings.

### Workspace

The operational access boundary within an organisation. Workspaces represent locations or departments and are the primary scope for day-to-day permissions and records.

### User

A person authenticated through Supabase Auth. A user does not directly own a tenant, organisation or workspace. Access is granted through memberships.

## Ownership rules

1. Every tenant-owned record must have an explicit owner.
2. Tenant-level records use `tenant_id`.
3. Organisation-level records use both `tenant_id` and `organisation_id`.
4. Workspace-level records use `tenant_id`, `organisation_id` and `workspace_id` where operational isolation is required.
5. Platform reference data must be clearly marked as platform-owned and must not carry a fake tenant.
6. Cross-tenant access is denied by default.
7. Cross-organisation access inside one tenant requires explicit permission.
8. Cross-workspace access requires explicit membership scope or an elevated tenant role.

## Data classification

### Platform-owned

Examples:

- supported countries
- currencies
- platform module catalogue
- global release metadata
- system migration metadata

### Tenant-owned

Examples:

- branding
- enabled modules
- domains
- subscription configuration
- AI provider settings

### Organisation-owned

Examples:

- legal identity
- tax profiles
- business addresses
- invoices issued by the organisation

### Workspace-owned

Examples:

- leads assigned to a branch
- gym members at a location
- equipment inventory
- appointments
- service requests

### User-owned

Examples:

- personal profile preferences
- body measurements
- private training progress

User-owned records inside a tenant must still be tenant-scoped when they are part of a tenant service.

## Existing database migration strategy

Existing `public` tables will not be renamed or moved immediately.

Migration will be additive and phased:

1. Create tenancy foundation tables.
2. Create memberships and role assignments.
3. Add nullable ownership columns to existing tables.
4. Backfill ownership using deterministic migration logic.
5. Add indexes and foreign keys.
6. introduce new RLS policies.
7. validate application behaviour.
8. make ownership columns `NOT NULL` only after successful backfill and verification.

No destructive rewrite is allowed during the transition.

## Consequences

### Positive

- clear commercial and legal ownership
- scalable white-label support
- consistent RLS design
- support for multi-location customers
- future mobile and API clients share one model

### Costs

- existing tables require phased backfill
- current `profiles.role` cannot remain the final authorization model
- business queries must carry tenant context
- test coverage must include tenant-isolation scenarios

## Rejected alternatives

### One organisation equals one tenant

Rejected because larger customers may operate multiple legal entities under one subscription and brand.

### Tenant and workspace only

Rejected because legal and fiscal ownership cannot be modeled reliably without organisations.

### Separate database per customer

Rejected as the default because it increases operational cost and makes platform-wide releases, analytics and support significantly harder. Dedicated environments may remain an enterprise deployment option later.
