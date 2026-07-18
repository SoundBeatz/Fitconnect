# FitConnect OS Domain Model

## Purpose

This document defines the logical domains of FitConnect OS and the boundaries between them. It governs future database design, APIs, services, frontend modules and mobile capabilities.

## Platform philosophy

FitConnect OS is an ecosystem of cooperating engines. No business engine is treated as disposable or secondary.

The platform follows one non-negotiable principle:

> The chain is only as strong as its weakest link.

Community and AI are strategic growth engines, but their success depends on equally reliable identity, security, data ownership, commerce, coaching, media, analytics, integrations and operational foundations.

## Platform map

```text
FitConnect OS

Core Engine
├── Identity
├── Tenancy
├── Memberships and permissions
├── Configuration
├── Feature flags
├── Audit
├── Events
├── Notifications
├── Localization
└── Files and metadata

Experience and Business Engines
├── Journey Engine
├── Community Engine
├── Gym Platform
├── Coach Engine
├── Commerce Engine
├── CRM
├── Media Engine
├── Analytics Engine
├── CMS and White Label
├── Integration Engine
└── AI Services

Application Surfaces
├── Customer Portal
├── Coach Portal
├── Business Portal
├── Command Center
├── Public Web
└── Native Mobile Apps
```

## Domain principles

1. Every domain has a defined purpose and is a first-class part of the platform.
2. A domain owns its business rules and data contract.
3. Other domains may not write directly into another domain's tables without an approved service contract.
4. Shared infrastructure belongs to Core Engine.
5. User interfaces consume domain services and APIs; they do not define business rules.
6. New modules are tenant-aware, permission-aware and auditable from their first release.
7. Existing `public` tables remain supported during phased migration.
8. Community is a cross-platform experience layer, not an isolated feed.
9. Journey is the canonical record of personal growth, setbacks and achievements.
10. AI augments the platform but may never bypass permissions, consent, safety rules or domain ownership.
11. No engine may become a hidden single point of failure.
12. Every engine must expose health, audit and observability signals appropriate to its risk.

## Core Engine

### Identity

Owns the application representation of authenticated people and integration with Supabase Auth.

### Tenancy

Owns tenants, organisations, workspaces and ownership context.

### Memberships and permissions

Owns membership lifecycle, roles, permissions and access scopes.

### Configuration

Owns structured application settings with platform, tenant, organisation and workspace inheritance.

### Feature flags

Owns module availability, staged rollouts and controlled activation.

### Audit

Owns immutable security and business event records.

### Events

Owns domain-event contracts and reliable asynchronous processing boundaries.

### Notifications

Owns notification templates, user preferences, delivery records and provider routing.

### Localization

Owns supported languages, currencies, countries, time zones and formatting policies.

### Files and metadata

Owns file references, storage metadata, ownership, access scope and retention rules. Supabase Storage remains the underlying object store.

## Journey Engine

The Journey Engine is the canonical timeline of a person's development within FitConnect.

Responsibilities:

- goals and goal periods;
- milestones and achievements;
- progress moments;
- setbacks and recovery periods;
- body and performance progress references;
- training and nutrition journey references;
- product and equipment journey references;
- private reflections;
- coach-confirmed moments;
- visibility and sharing consent;
- AI-readable journey context under explicit authorization.

The Journey Engine does not duplicate source data from Gym, Commerce or Community. It stores durable timeline references and journey-specific meaning.

## Community Engine

Community is the social connection layer across the full FitConnect ecosystem.

Responsibilities:

- posts;
- comments and threaded discussion;
- reactions;
- follows and connections;
- groups and communities;
- mentions and hashtags;
- visibility audiences;
- moderation and reporting;
- feed ranking inputs;
- community challenges;
- sharing of authorized Journey, Gym, Nutrition, Coach and Commerce objects;
- outbound social-media sharing through Integration Engine.

A community post may reference an achievement, workout, meal, progress photo, video, product, training plan or personal story without taking ownership of the underlying domain object.

Current mapping includes `public.community_posts`.

## Gym Platform

Responsibilities:

- members and coaching relationships;
- training plans;
- workouts and exercise execution;
- body measurements and progress;
- nutrition plans and logs;
- locations;
- customer and user equipment;
- service requests;
- scheduling and programmes.

Current mapping includes tables such as:

- `body_measurements`
- `body_scan_progress`
- `customer_equipment`
- `customer_training_plans`
- `performance_intakes`
- `performance_profiles`
- `training_locations`
- `training_plans`
- `user_avatars`
- `avatar_versions`
- `user_equipment`
- `service_requests`

## Coach Engine

Responsibilities:

- coach profiles and credentials;
- coach-client relationships;
- assignments and caseloads;
- check-ins and feedback;
- programme review;
- coach notes with strict visibility controls;
- client communication;
- coaching outcomes and service delivery.

## Commerce Engine

Responsibilities:

- product catalogue;
- pricing;
- inventory;
- quotations;
- sales orders;
- invoices;
- payments;
- taxes;
- suppliers and purchasing;
- subscriptions and entitlements;
- shareable purchase and product references.

Current mapping includes `public.products`.

## CRM

Responsibilities:

- leads;
- contacts;
- companies;
- opportunities;
- pipeline stages;
- activities and assignments;
- conversion into tenants, customers, members or partners.

Current mapping includes `public.leads`.

## Media Engine

Responsibilities:

- images, videos and documents;
- upload sessions;
- transcoding and thumbnails;
- media variants;
- ownership and consent;
- access control and signed delivery;
- moderation status;
- retention and deletion;
- media references used by Community and Journey.

## Analytics Engine

Responsibilities:

- product analytics;
- tenant and business reporting;
- community engagement metrics;
- progress and outcome reporting;
- funnel and retention analysis;
- privacy-aware aggregate insights;
- read models that do not become transactional sources of truth.

## CMS and White Label

Responsibilities:

- pages and reusable sections;
- menus;
- theme and typography;
- tenant branding;
- domains;
- SEO metadata;
- transactional email identity.

Current mapping includes `public.site_theme_settings`.

## Integration Engine

Responsibilities:

- social-media connections;
- approved outbound publishing;
- inbound webhooks;
- wearable and health-platform connections;
- payment and accounting providers;
- partner APIs;
- OAuth token lifecycle;
- retries, idempotency and integration audit trails.

No external provider token may be exposed directly to browser clients.

## Customer Portal

The Customer Portal is an application surface, not an independent source of business truth. It orchestrates APIs from Core, Journey, Community, Commerce, Gym and Coach domains for customer-facing use cases.

## Command Center

The Command Center is the administrative application surface. It consumes permission-protected domain APIs for tenant, organisation and workspace operations.

## AI Services

AI Services form an independent intelligence and orchestration layer.

They may:

- read authorized domain data through contracts;
- understand a user's permitted Journey context;
- produce suggestions, classifications, summaries and generated content;
- support coaches, businesses and members;
- detect risk signals for human review where legally and ethically permitted;
- execute approved actions through validated domain commands.

They may not:

- bypass RLS, permissions, validation, auditing or business rules;
- silently publish Community content;
- infer consent;
- treat generated output as verified health or medical truth;
- become the sole owner of critical business data.

## Cross-domain communication

Preferred order:

1. synchronous domain service or API for immediate commands and queries;
2. domain events for asynchronous side effects;
3. read models for consolidated reporting;
4. direct cross-domain table writes are prohibited by default.

Example:

```text
Workout completed in Gym Engine
        ↓
Journey milestone created or updated
        ↓
User chooses to share
        ↓
Community post references milestone
        ↓
Media Engine serves authorized media
        ↓
Integration Engine optionally publishes externally
        ↓
Analytics records privacy-safe engagement
        ↓
AI may summarize or coach using authorized context
```

## Existing database transition

The current database is a valid production baseline, not a blank slate. Logical domain ownership will be introduced first in documentation, services and new code. Physical PostgreSQL schema separation is deferred until a measured benefit and migration plan justify it.

## Definition of a new engine

A new engine is considered architecturally ready only when it has:

- a documented scope and owner;
- business invariants;
- tenant and data ownership model;
- permission matrix;
- database design;
- API contract;
- domain events;
- audit events;
- privacy and consent rules;
- test strategy;
- migration and rollback plan;
- observability requirements;
- operational documentation.
