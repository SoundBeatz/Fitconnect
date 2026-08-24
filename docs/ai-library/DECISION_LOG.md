# Decision Log

Append-only architectural decisions. Newer decisions may supersede older ones but should not erase history.

## ADR-001 — Repository-owned AI memory
**Date:** 2026-08-24
**Decision:** Durable FitConnect engineering memory lives in Git under `docs/ai-library/` with `.ai.memory.md` as bootstrap.
**Reason:** Chat memory is useful but not authoritative, inspectable, versioned or portable across agents.

## ADR-002 — Constitution remains highest project authority
`.ai.constitution.md` outranks convenience, speed and cosmetic green status. The AI Library interprets and operationalizes it; it does not override it.

## ADR-003 — Runtime truth is evidence-based
Git describes intended code; Supabase/deployment state describes deployed runtime. A session must verify both before declaring production green.

## ADR-004 — No guessed tenant migration
Legacy users without provable organization provenance remain unassigned until evidence exists. Data convenience must not create cross-tenant security debt.

## ADR-005 — Internal helpers are not public APIs
Authorization/tenant helper functions that exist only to support policies or SECURITY DEFINER implementations should not remain ordinary authenticated RPC endpoints unless an explicit client contract requires them.

## ADR-006 — Finance/BI is a consumer, not an owner
Command Center intelligence reads from canonical Order/Invoice/Customer ownership layers and must not create competing business-state ownership.

## ADR-007 — Alternative Edge security must be explicit
`verify_jwt=false` is not inherently insecure, but requires an intentional alternative boundary appropriate to endpoint class: nonce/HMAC/rate-limit, provider verification, or another documented mechanism.
