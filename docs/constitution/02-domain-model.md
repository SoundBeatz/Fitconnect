# FitConnect OS Domain Model

## Purpose

This document defines the logical domains of FitConnect OS and the boundaries between them. It governs future database design, APIs, services, frontend modules and mobile capabilities.

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

Business Domains
├── CRM
├── Commerce
├── Gym Platform
├── Community
├── CMS and White Label
├── Customer Portal
├── Command Center
└── AI Services
```

## Domain principles

1. A domain owns its business rules and data contract.
2. Other domains may not write directly into another domain's tables without an approved service contract.
3. Shared infrastructure belongs to Core Engine.
4. User interfaces consume domain services and APIs; they do not define business rules.
5. New modules are tenant-aware, permission-aware and auditable from their first release.
6. Existing `public` tables remain supported during phased migration.

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

## CRM

Responsibilities:

- leads;
- contacts;
- companies;
- opportunities;
- pipeline stages;
- activities and assignments.

Current mapping includes `public.leads`.

## Commerce

Responsibilities:

- product catalogue;
- pricing;
- inventory;
- quotations;
- sales orders;
- invoices;
- payments;
- taxes;
- suppliers and purchasing.

Current mapping includes `public.products`.

## Gym Platform

Responsibilities:

- members and coaching relationships;
- training plans;
- body measurements and progress;
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

## Community

Responsibilities:

- posts;
- comments;
- reactions;
- moderation;
- community media and visibility.

Current mapping includes `public.community_posts`.

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

## Customer Portal

The Customer Portal is an application surface, not an independent source of business truth. It orchestrates APIs from Core, Commerce and Gym domains for customer-facing use cases.

## Command Center

The Command Center is the administrative application surface. It consumes permission-protected domain APIs for tenant, organisation and workspace operations.

## AI Services

AI Services form an independent integration layer.

They may:

- read authorized domain data through contracts;
- produce suggestions, classifications and generated content;
- execute approved actions through validated domain commands.

They may not bypass RLS, permissions, validation, auditing or business rules.

## Cross-domain communication

Preferred order:

1. synchronous domain service or API for immediate commands and queries;
2. domain events for asynchronous side effects;
3. read models for consolidated reporting;
4. direct cross-domain table writes are prohibited by default.

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
- audit events;
- test strategy;
- migration and rollback plan;
- operational documentation.
