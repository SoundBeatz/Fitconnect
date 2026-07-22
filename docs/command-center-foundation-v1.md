# FitConnect Command Center Foundation v1.0

## Purpose

The Command Center is the governed intelligence layer of FitConnect OS. It turns operational data into a shared business picture, prioritized signals and traceable decisions.

## Intelligence loop

1. Source systems emit operational facts.
2. KPI definitions convert facts into comparable metrics.
3. Snapshots preserve the value, time window, dimensions and definition version.
4. Detection rules create deduplicated alerts.
5. Authorized users acknowledge and resolve alerts.
6. Every material action produces an immutable audit event.

## Data contracts

- `command_center_metric_snapshots`: tenant-scoped, time-bounded metric results.
- `command_center_alerts`: actionable signals with severity and lifecycle.
- `command_center_audit_events`: append-only investigation trail.

Raw commerce, customer, inventory or service records remain owned by their source modules. The Command Center never becomes a second system of record.

## KPI governance

Every production KPI must define:

- business name and stable `metric_key`;
- owner and intended decision;
- formula and source tables/events;
- tenant, workspace, currency and timezone behavior;
- grain and refresh interval;
- freshness and data-quality thresholds;
- definition version and effective date.

## Access model

All persisted intelligence is scoped by `organization_id`. Tenant members may only read their own intelligence. Platform administrators can investigate across tenants. Browser clients cannot create metric snapshots or audit events; these writes belong to trusted services and scheduled jobs.

## Delivery sequence

1. Executive Intelligence and operational priority engine.
2. Commerce and financial intelligence.
3. Customer, subscription and retention intelligence.
4. Inventory, purchasing and rental intelligence.
5. Service, SLA and workforce intelligence.
6. Platform observability, security and compliance.
7. Predictive intelligence and governed AI recommendations.
