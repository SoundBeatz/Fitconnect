# FitConnect OS — Vision

**Status:** Accepted  
**Version:** 1.0.0  
**Scope:** Entire platform

## Mission

FitConnect OS is an international, modular, multi-tenant and white-label SaaS platform for fitness companies, dealers, distributors, service organisations and related businesses.

FitConnect is not developed as a collection of websites. It is developed as a platform with shared core services, stable APIs and independently extensible business domains.

## Platform model

```text
Platform
└── Tenant
    └── Organisation
        └── Workspace
            └── Users and memberships
```

## Product pillars

- Multi-tenant by design
- White-label without separate codebases
- API-first business logic
- Secure by default
- Modular domain architecture
- Web and native-mobile ready
- Internationalisation ready
- AI as an independent service layer
- Auditable and observable operations
- Reproducible database migrations

## Platform domains

```text
FitConnect OS
├── Core Engine
├── Identity and Access
├── Design System
├── CRM
├── Commerce
├── Gym Platform
├── Customer Portal
├── Community
├── CMS
├── Command Center
└── AI Services
```

## Scale assumptions

Architecture and implementation decisions must remain suitable for:

- 10,000+ tenant organisations;
- millions of records;
- multiple countries and languages;
- multiple currencies and tax systems;
- multiple brands and custom domains;
- web, iOS and Android clients.

## Non-goals

FitConnect will not use:

- tenant-specific forks;
- irreversible manual database changes;
- frontend-only permission enforcement;
- hard-coded brands, currencies, languages or taxes;
- temporary production shortcuts;
- business logic tied to one user interface.

## Source of truth

The repository, approved architecture decisions and numbered migrations are the technical source of truth. Chat conversations, dashboard changes and manual SQL runs must be consolidated into repository documentation and migrations.