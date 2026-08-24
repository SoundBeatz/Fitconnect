# FitConnect Durable Memory Protocol

**Status:** ENFORCED

## Objective
Make engineering memory reproducible, evidence-backed, compact and self-correcting. Memory never overrides runtime truth.

## Three memory temperatures

### HOT — CURRENT_STATE
Only facts needed to resume development now: current functional baseline, production posture, blockers and next safe actions. Rewrite when state changes; never use it as historical archive.

### WARM — domain / ownership / security / decisions
Stable architecture and engineering rules that explain how the platform works and why. Update only when the corresponding contract changes.

### COLD — releases / incidents
Append-only historical evidence. Never silently rewrite an incident or release. Corrections are new dated entries referencing the old record.

## Evidence classes
Every material memory statement SHOULD be classified mentally or explicitly as:
- `RUNTIME_VERIFIED` — observed in Supabase/deployed environment.
- `GIT_VERIFIED` — proven by repository content/commit.
- `DECISION` — approved architecture/governance choice.
- `OPEN` — known unresolved work/risk.
- `HISTORICAL` — prior state retained for learning.

When Git and runtime disagree, record deployment drift as an incident; do not average the two truths.

## Mandatory write triggers
Update durable memory when a change affects any of:
- architecture or FDMP ownership;
- tenant/security/auth/RLS/privileges;
- schema/migration invariants;
- Edge Function security or deployment contract;
- payment/order/invoice/customer state machine;
- production baseline or release certification;
- a reusable incident/root cause;
- an intentional exception that a future agent might otherwise 'fix'.

## Session bootstrap
1. Read constitution.
2. Read `.ai.memory.md`.
3. Read HOT state.
4. Read relevant WARM domain/ownership/security records.
5. Read matching COLD incidents.
6. Verify Git head and production runtime.
7. If memory disagrees with reality, classify the drift before mutation.

## Session close
Before GREEN:
1. Verify tests/runtime.
2. Decide which memory trigger fired.
3. Update HOT/WARM/COLD layer as appropriate.
4. Add release entry for material merged production work.
5. Run `node scripts/ai-memory-guard.mjs`.
6. Merge only when code truth, runtime truth and memory truth are coherent.

## Anti-bloat rules
- Never paste full source code into memory.
- Link by path/function/migration/PR/commit instead.
- One fact has one canonical owner document; other docs reference it.
- CURRENT_STATE stays concise.
- Incidents capture root cause, detection, repair and prevention — not chat transcripts.
- Decisions capture alternatives and rationale, not implementation noise.

## Confidence rule
If tenant assignment, financial reconciliation, security ownership or production state cannot be proven, store it as `OPEN`; never convert uncertainty into a fact.
