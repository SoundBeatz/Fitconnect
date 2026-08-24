# FitConnect Durable Engineering Memory

This library is the persistent, repository-owned memory for AI agents and developers working on FitConnect.

## Purpose

Prevent rediscovery, architecture drift, repeated incidents, false-green status and loss of context between sessions or agents.

## Read order

Start with `.ai.constitution.md` and `.ai.memory.md`, then read:

- `CURRENT_STATE.md` — latest verified baseline and open blockers.
- `ARCHITECTURE_INDEX.md` — where canonical architecture knowledge lives.
- `OWNERSHIP_REGISTRY.md` — domain/runtime/data ownership rules.
- `SECURITY_BASELINE.md` — current security posture and accepted limitations.
- `RELEASE_LEDGER.md` — chronological production/release evidence.
- `DECISION_LOG.md` — durable architectural decisions.
- `domains/` — domain-specific operational memory.
- `incidents/` — reusable failures, root causes and recovery playbooks.

## Update law

Update this library when a change materially affects architecture, ownership, security, production baseline, deployment provenance, migrations, or teaches a reusable lesson. Do not store secrets, transient debug noise, unverifiable claims or chat-only assumptions here.
