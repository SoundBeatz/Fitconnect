# ADR-0004: Equal-Strength Modular Ecosystem

- Status: Accepted
- Date: 2026-07-18
- Decision owners: FitConnect Product and Architecture

## Context

FitConnect OS contains strategically visible engines such as Community, Journey and AI. These capabilities may become major acquisition, engagement and retention drivers.

However, their value depends on the reliability of every supporting engine: Identity, Tenancy, Permissions, Gym, Coach, Commerce, Media, Analytics, Integrations, Configuration, Audit and Events.

Prioritizing one visible engine while underbuilding its dependencies would create security gaps, broken user journeys, poor data quality, operational risk and technical debt.

## Decision

FitConnect OS will be designed as an equal-strength modular ecosystem.

No business engine is architecturally classified as unimportant or optional merely because it is less visible to end users.

The platform adopts the governing principle:

> The chain is only as strong as its weakest link.

This does not mean every engine receives equal development time in every sprint. It means every enabled engine must meet the quality, security, ownership and operational standards required by its role.

## Architectural rules

1. Engines have different purposes but equal responsibility for platform integrity.
2. Roadmap priority may vary; engineering quality gates may not.
3. Community and Journey may orchestrate experiences but may not take ownership of source data belonging to other domains.
4. AI may enrich every engine but may not bypass or replace domain rules.
5. Shared dependencies must be production-ready before dependent experiences are released.
6. A feature may not launch when one required link lacks adequate security, consent, auditability, resilience or testing.
7. Critical cross-domain flows require end-to-end contract tests.
8. Domain health and failure modes must be observable.
9. Degraded operation must be designed where possible so failure of a non-critical engine does not collapse the entire platform.
10. A module is only enabled for a tenant when its required dependency set is satisfied.

## Quality gate

Before an engine or major capability is released, it must demonstrate:

- clear ownership and boundaries;
- tenant-safe data isolation;
- permission enforcement;
- privacy and consent handling;
- validation and business invariants;
- audit events;
- API and event contracts;
- migration and rollback safety;
- automated tests;
- monitoring and operational response;
- documented dependencies and degraded behavior.

## Consequences

### Positive

- FitConnect can scale without sacrificing trust.
- High-engagement features are supported by dependable foundations.
- Teams can develop engines independently while preserving platform consistency.
- Weak links become visible before release rather than after incidents.
- Tenant-specific module activation becomes safer.

### Costs

- Some releases will take longer because dependencies must meet shared standards.
- Cross-domain contract testing and observability require additional engineering.
- Roadmap decisions must account for platform health, not only visible features.

## Example

Publishing a progress achievement requires a complete chain:

```text
Identity and consent
    ↓
Gym or Journey source record
    ↓
Media authorization
    ↓
Community publication
    ↓
Notification delivery
    ↓
Optional external social integration
    ↓
Analytics and audit
    ↓
Authorized AI interpretation
```

The capability is not release-ready when any required link is unsafe or unreliable.
