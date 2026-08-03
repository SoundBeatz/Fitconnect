# ADR-0001 — Domain-driven modular architecture

- **Status:** Accepted
- **Date:** 2026-07-18
- **Decision owners:** FitConnect Product and Architecture

## Context

FitConnect already contains functionality for profiles, products, leads, customer equipment, training plans, body data, community content and site theming. The platform must grow into a multi-tenant white-label SaaS product without destabilising the existing application.

Moving all existing tables into new PostgreSQL schemas immediately would create unnecessary operational risk. Keeping all future logic as unrelated objects in `public` would, however, create increasing coupling.

## Decision

FitConnect adopts a domain-driven modular architecture.

Initial logical domains are:

- Core
- Identity and Access
- CRM
- Commerce
- Gym
- Community
- CMS
- Customer Portal
- Command Center
- AI Services

Existing database objects remain in place until a reviewed migration provides measurable value and a safe transition path. Logical domain ownership is introduced immediately through documentation, service boundaries, naming and API contracts.

Physical PostgreSQL schemas may be introduced later through separate ADRs and migrations.

## Rules

1. Every new object has one owning domain.
2. Cross-domain dependencies must be explicit.
3. Shared infrastructure belongs to Core.
4. UI code may not bypass security or ownership boundaries.
5. Existing `public` tables are not moved merely for cosmetic consistency.
6. Schema migrations require compatibility and rollback planning.

## Consequences

### Positive

- Existing functionality remains stable.
- New modules gain clear ownership.
- Multi-tenancy can be introduced incrementally.
- Web and mobile clients can share backend contracts.
- A future physical schema split remains possible.

### Costs

- Logical and physical organisation will temporarily differ.
- Documentation must track ownership carefully.
- Some legacy objects may need adapters before full domain separation.

## Follow-up decisions

- ADR-0002: Tenant hierarchy and data ownership
- ADR-0003: Authentication, memberships and RBAC
- ADR-0004: Database schema strategy
- ADR-0005: White-label configuration model