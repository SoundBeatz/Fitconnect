# FitConnect Software Architecture Specification

Version: 1.0.0-draft
Status: Active design authority
Scope: FitConnect white-label SaaS platform

## 1. Product definition

FitConnect is a modular, API-first, multi-tenant SaaS platform for the fitness, gym, equipment, commerce and service market. The platform must support:

- a responsive web application;
- installable iOS and Android applications;
- white-label distribution;
- multiple tenants, brands, organizations and workspaces;
- modular subscriptions and entitlements;
- internationalization;
- secure API access;
- extensible AI services;
- enterprise-grade auditing and tenant isolation.

FitConnect is not treated as a collection of pages. It is treated as one software platform with multiple presentation clients.

## 2. Architectural principles

1. API-first: presentation clients do not own business rules.
2. Multi-tenant by design: tenant isolation is mandatory, not optional.
3. White-label by design: branding, domains, themes and enabled modules are data-driven.
4. Modular monolith first: strong domain boundaries without premature microservices.
5. Event-aware: important domain changes emit auditable platform events.
6. Secure by default: least privilege, RLS, scoped access and explicit permissions.
7. Migration-driven data model: production migrations are immutable.
8. Shared backend: web, iOS and Android use the same backend and domain logic.
9. Offline-tolerant mobile architecture: clients may cache non-sensitive data and sync safely.
10. Observability: logs, audit trails, errors and usage metrics are first-class platform concerns.

## 3. Platform hierarchy

FitConnect Platform

- Tenant
  - White-label brand
  - Subscription
  - Enabled modules
  - Domain configuration
  - Organizations
    - Workspaces
    - Members
    - Customers
    - Commercial records

A tenant is the top-level SaaS boundary. An organization is a business entity operating inside a tenant. A workspace is an optional operational subdivision such as a location, department, showroom, studio or branch.

## 4. Major product domains

### 4.1 Core Engine

- Asset Manager
- Cache Manager
- Config Manager
- Permission Manager
- Event Bus
- Audit and observability
- Feature flags
- Module registry

### 4.2 Design System

- Theme Engine
- Typography Engine
- Component Library
- Icon System
- Layout Engine
- Accessibility rules
- White-label theme tokens

### 4.3 Commerce

- Shop
- CRM
- Pricing
- Quotations
- Orders
- Payments
- Purchasing
- Inventory
- Returns and warranty

### 4.4 Gym Platform

- Product Database
- Configurator
- 3D Designer
- AI Advisor
- Quote Builder
- Installation and project planning

### 4.5 Customer Portal

- Customer account
- Orders and quotations
- Documents
- Service requests
- Warranties
- Project status
- Messaging

### 4.6 Command Center

- Platform administration
- Tenant administration
- Subscription and module management
- Operational dashboards
- Security events
- Usage analytics
- Support tooling

### 4.7 AI Services

- AI Sales
- AI Coach
- AI Designer
- AI Support
- AI Analytics

AI services must be tenant-scoped, auditable and configurable. Prompts, provider settings, usage limits and result retention must not be hardcoded into the UI.

## 5. Logical software layers

### Presentation layer

- Web application
- iOS application
- Android application
- White-label branded clients

### Application layer

- Use cases
- Validation
- Authorization orchestration
- Transaction boundaries
- API endpoints

### Domain layer

- Business rules
- Domain services
- State transitions
- Pricing and calculation rules
- Policies

### Data layer

- PostgreSQL / Supabase
- Object storage
- Search indexes
- Cache
- Audit and event records

### Infrastructure layer

- Authentication
- Email and notifications
- Payments
- AI providers
- Logging and monitoring
- CI/CD
- App Store delivery

## 6. Multi-tenancy rules

- Every tenant-owned business record must contain a tenant_id.
- Organization-owned records must also contain organization_id where applicable.
- Workspace-owned records contain workspace_id where applicable.
- Cross-tenant access is prohibited by database policy and application policy.
- Service-role operations must still validate tenant context.
- Unique constraints must generally be tenant-scoped.
- Public identifiers must not expose sequential internal IDs.
- Tenant deletion must use controlled retention and deletion workflows.

## 7. Identity and access model

The platform uses platform identity plus tenant membership.

Core concepts:

- authenticated user;
- profile;
- tenant membership;
- organization membership;
- role;
- permission;
- policy;
- entitlement;
- invitation;
- service account;
- API key.

Authorization must combine:

1. authentication status;
2. tenant membership status;
3. organization/workspace scope;
4. role permissions;
5. module entitlement;
6. record ownership or assignment rules.

## 8. White-label model

White-label configuration must support:

- brand name;
- logo and app icons;
- primary and secondary visual tokens;
- typography settings;
- custom domains;
- email sender identity;
- legal documents;
- locale and currency defaults;
- module visibility;
- support contact details;
- mobile application configuration;
- feature flags;
- marketplace or reseller identity.

Branding configuration must be stored as structured data and assets, not duplicated source code.

## 9. Web and mobile strategy

All clients use the same API and authorization model.

Web:

- responsive application;
- installable PWA where useful;
- administrative and operational workflows;
- shared design tokens.

Mobile:

- iOS and Android;
- push notifications;
- biometric session protection where supported;
- deep links;
- secure local storage;
- controlled offline cache;
- app-version compatibility checks.

No critical business rule may exist only in a mobile or web client.

## 10. API strategy

- Versioned API contracts.
- Tenant context required for tenant-owned operations.
- Idempotency for payment, order and import operations.
- Cursor pagination for large datasets.
- Consistent error envelope.
- Input validation at the API boundary.
- Rate limiting and abuse controls.
- Webhooks with signed delivery.
- API keys scoped by tenant, environment and permission.
- Backward-compatible evolution where possible.

## 11. Data and migration strategy

Production database migrations are append-only and immutable after execution.

Initial migration sequence:

1. 001_foundation.sql
2. 002_business_core.sql
3. 003_crm.sql
4. 004_product_catalog.sql
5. 005_inventory.sql
6. 006_purchasing.sql
7. 007_quotations.sql
8. 008_sales_orders.sql

Later domains receive new numbered migrations. Existing executed migrations are never rewritten to add later functionality.

## 12. Security baseline

- Row Level Security on tenant-owned tables.
- Least-privilege database grants.
- Explicit security-definer review for functions.
- Audit records for sensitive changes.
- Encrypted transport.
- Secrets outside source control.
- Signed URLs for private assets.
- Session expiry and revocation.
- Account lockout and abuse protection.
- Data-retention controls.
- GDPR-compatible export and deletion workflows.
- Environment separation for development, staging and production.

## 13. Subscription and module entitlements

A tenant subscription determines:

- enabled modules;
- usage limits;
- storage limits;
- user limits;
- AI credits;
- API access;
- white-label capabilities;
- support tier;
- feature flags.

Authorization must check both permission and entitlement. A user may have permission to use a module that the tenant has not purchased; access must then remain blocked.

## 14. Event and audit model

The Event Bus has two forms:

- in-process application events for UI and module coordination;
- persistent domain events for audit, integrations and asynchronous processing.

Persistent events should capture:

- tenant and organization context;
- actor;
- event type;
- entity type and entity id;
- timestamp;
- correlation id;
- safe metadata;
- processing status where applicable.

Audit logs and domain events are related but not identical. Audit logs answer who changed what. Domain events describe what happened in the business.

## 15. Deployment model

Required environments:

- local development;
- development;
- staging;
- production.

Each environment must have isolated configuration, database, storage and secrets. Database changes move through migrations. Releases must be traceable to a Git commit and application version.

## 16. Quality gates

A module is not complete until it has:

- documented domain scope;
- approved data model;
- migration;
- RLS and authorization rules;
- service/API layer;
- UI integration where applicable;
- validation;
- error handling;
- audit behavior;
- automated tests where practical;
- release metadata;
- verified runtime behavior.

## 17. Current architecture decision

FitConnect will start as a modular monolith using Supabase/PostgreSQL and a shared API/business layer. Domain boundaries must be clean enough to extract services later if scale, compliance or deployment requirements justify that change.

This document is the design authority for future database, API, web, mobile and white-label decisions. Changes require an explicit architecture revision rather than ad-hoc implementation.
