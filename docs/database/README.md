# FitConnect OS — Database Blueprint v1.0

**Status:** Baseline in progress  
**Baseline date:** 2026-07-18  
**Source:** Live Supabase audit and existing repository

## Purpose

This document records the current database state before the multi-tenant Core Engine is introduced. It is a baseline, not a claim that every existing object already satisfies the target architecture.

## Confirmed current state

- 17 relations were identified in the `public` schema; the audit showed tables and no public views or sequences.
- Row Level Security is enabled on the audited public tables.
- 35 public-schema RLS policies were identified.
- 23 valid and ready public indexes were identified by the corrected index audit.
- 9 public foreign-key relationships were identified.
- Two public functions were identified: `is_admin()` and `rls_auto_enable()`.
- The `ensure_rls` event trigger calls `public.rls_auto_enable()` after supported table-creation commands.
- `profiles.id` is both the primary key and a foreign key to `auth.users(id)` with `ON DELETE CASCADE`.
- Installed extensions observed: `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, and `uuid-ossp`.

## Known public tables

The audit identified the following platform areas, including:

### Identity and commercial profile

- `profiles`

### CRM

- `leads`

### Commerce and equipment

- `products`
- `customer_equipment`
- `user_equipment`
- `service_requests`

### Gym and performance

- `body_measurements`
- `body_scan_progress`
- `performance_intakes`
- `performance_profiles`
- `training_plans`
- `customer_training_plans`
- `training_locations`
- `user_avatars`
- `avatar_versions`

### Community

- `community_posts`

### CMS and branding

- `site_theme_settings`

## Identity baseline

The audited `profiles` table contains business and customer attributes in addition to identity data, including:

- `id`
- `full_name`
- `phone`
- `role`
- `created_at`
- `account_type`
- `company_name`
- `chamber_of_commerce`
- `vat_number`
- `customer_tier`
- commercial display and discount settings

Existing constraints include:

- role restricted to the current `admin` and `customer` values;
- account type restricted to `private` and `business`;
- customer-tier validation;
- discount percentage range validation;
- price-display validation;
- foreign key to `auth.users`;
- primary key on `id`.

## Security baseline

### Strengths

- RLS is systematically enabled.
- Ownership policies commonly use `auth.uid()`.
- Administrative policies use a central `is_admin()` function.
- The administrative function is `STABLE SECURITY DEFINER` with a configured search path.
- Automatic RLS activation reduces the risk of accidentally creating exposed tables.

### Review items

- The complete definitions of all 35 policies must be stored in a machine-readable audit export.
- Execute privileges on privileged functions must be reviewed and reduced where unnecessary.
- Automatic RLS activation does not create policies; new tables can therefore become inaccessible until explicit policies are added.
- Existing profile roles are global and are not yet sufficient for tenant-, organisation- and workspace-scoped memberships.
- Existing business tables are not yet confirmed to carry tenant ownership columns.

## Target direction

The existing database remains operational. New platform foundations will be introduced incrementally:

```text
Tenant
└── Organisation
    └── Workspace
        └── Membership
            └── Role assignments and permissions
```

No existing table is moved or rewritten until a migration includes:

- compatibility analysis;
- data backfill;
- RLS transition;
- API impact analysis;
- verification queries;
- rollback or forward-recovery strategy.

## Next database deliverables

1. Complete machine-readable schema snapshot.
2. ADR-0002 for tenant hierarchy and ownership.
3. ADR-0003 for memberships and RBAC.
4. Baseline migration strategy for the pre-existing database.
5. First additive Core Engine migration.
6. RLS test matrix for anonymous, customer, staff and administrator contexts.