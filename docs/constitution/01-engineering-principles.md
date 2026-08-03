# FitConnect OS — Engineering Principles

**Status:** Accepted  
**Version:** 1.0.0

## 1. Architecture before implementation

Every material change follows this sequence:

1. Architecture
2. Architecture Decision Record when required
3. Data model
4. Backend and API contract
5. Business rules
6. User experience
7. Implementation
8. Testing
9. Documentation
10. Release

## 2. Multi-tenancy

Tenant-bound data must have explicit ownership. Isolation is enforced in PostgreSQL through Row Level Security and is never delegated solely to the client application.

The target hierarchy is:

```text
Tenant → Organisation → Workspace → Membership
```

Tables that are not tenant-bound must be explicitly classified as platform-global.

## 3. Database changes

- Database changes are stored under `supabase/migrations/`.
- Applied migrations are immutable.
- Every later change receives a new migration.
- Production changes are never represented only by SQL Editor history.
- Migrations must be reviewable, ordered and reproducible.
- Destructive operations require a data-migration and rollback strategy.

## 4. Security

- RLS is enabled for exposed business tables.
- Policies use least privilege.
- The frontend is not a security boundary.
- `SECURITY DEFINER` functions require a fixed, reviewed `search_path`.
- Privileged operations are logged.
- Secrets are never committed to the repository.

## 5. API-first

Business logic must remain reusable by web, mobile and external clients. UI components may orchestrate calls but may not become the only implementation of business rules.

## 6. Domain ownership

Every table, API and service belongs to one primary domain. Cross-domain access occurs through defined contracts rather than incidental coupling.

## 7. White label

Branding, modules, domains, email identity, AI configuration and commercial entitlements are configuration data. A customer must not require a separate application fork.

## 8. Internationalisation

No production rule may assume one language, currency, country, tax rate or date format. Monetary values use explicit currency context. Tax calculations use versioned tax configuration.

## 9. Quality gates

A change is not complete until it includes:

- validation and error handling;
- security review where applicable;
- automated tests appropriate to its risk;
- documentation;
- migration and deployment notes;
- observability for critical operations.

## 10. No shortcuts

Placeholder behaviour, silent failures, duplicated policy logic and hard-coded production configuration are prohibited. Temporary exceptions require an ADR, owner and removal milestone.