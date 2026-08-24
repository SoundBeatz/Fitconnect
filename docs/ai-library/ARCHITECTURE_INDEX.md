# Architecture Index

## Governing sources

- `.ai.constitution.md` — highest project-level engineering authority.
- `.ai.memory.md` — mandatory AI memory bootstrap/read order.
- `docs/migrations/customer/ownership-audit.md` — Customer-domain ownership audit.
- `docs/migrations/customer/data-source-matrix.md` — Customer data-source mapping.
- `docs/migrations/customer/order-lifecycle-flow.md` — Order lifecycle reference.
- `docs/ai-library/incidents/` — reusable production incident knowledge.

## Canonical application pattern

`Renderer -> Store -> Service -> Repository -> Backend`

Cross-domain integration should use explicit events/contracts. Direct database access must not be reintroduced where a repository boundary exists.

## Runtime truth hierarchy

1. Git `main` for intended code/migrations.
2. Deployment branch for static production provenance (`hostinger-static`).
3. Supabase migration history/schema/functions for deployed backend truth.
4. Edge Function deployment metadata for runtime version/JWT classification.
5. CI/workflow evidence for build/deploy gates.

## Core domains

See `domains/` for operational memory on Commerce, Customer, Order, Invoice and Payment. Additional domains should be added as they become active ownership boundaries.
