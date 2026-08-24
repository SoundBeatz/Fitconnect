# FitConnect Durable Memory Protocol

**Status:** ENFORCED

## Objective
Engineering memory is reproducible, evidence-backed, compact, self-correcting and machine-verifiable. Memory never overrides runtime truth.

## Memory temperatures
- **HOT** `CURRENT_STATE.md`: resumable present; rewrite when state changes.
- **WARM** architecture/ownership/security/domains/decisions: stable contracts and rationale.
- **COLD** releases/incidents: append-only historical evidence.

## Evidence classes
`RUNTIME_VERIFIED`, `GIT_VERIFIED`, `DECISION`, `OPEN`, `HISTORICAL`. Git/runtime disagreement is deployment drift, never blended truth.

## Machine truth
`OWNERSHIP_REGISTRY.json` is the executable ownership map. Human ownership docs explain rationale. Both must agree. Missing referenced paths are a RED preflight.

## Mandatory write triggers
Architecture/FDMP ownership; tenant/security/auth/RLS; schema invariants; Edge deployment/security; payment/order/invoice/customer state machines; production baseline; reusable incidents; intentional exceptions.

## Mandatory gates
Every material change must pass:
1. `node scripts/ai-memory-guard.mjs`
2. `node scripts/fitconnect-preflight.mjs`
3. independent GitHub CI gates.

## Session bootstrap
Constitution -> memory bootstrap -> HOT -> machine ownership + relevant WARM -> relevant COLD -> live Git/runtime verification -> classify drift -> mutate.

## Session close
VERIFY -> classify evidence -> update memory -> release/incident/decision if triggered -> memory guard -> preflight -> CI -> GREEN.

## Anti-bloat
Reference code by path/function/migration/PR/commit; never copy source into memory. One fact has one canonical memory owner. Keep HOT concise. Incidents store root cause/detection/repair/prevention.

## Confidence rule
Unproven tenant, financial, security or production state is `OPEN`. Uncertainty never becomes fact.
