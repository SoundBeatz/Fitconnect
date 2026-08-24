# Incident — Maximum Power v1 mergeability

**Date:** 2026-08-24
**Class:** HISTORICAL / governance

## Detection
The first Maximum Power memory branch produced a PR reported as non-mergeable before certification.

## Response
No force merge was attempted. The experimental branch was reset to the certified `main` baseline and no runtime change was published.

## Lesson
Governance improvements must obey the same governance they enforce. Build from a fresh current baseline, keep the change isolated, require CI/preflight GREEN, and never bypass mergeability for memory/security infrastructure.

## Prevention
Maximum Power v2 is rebuilt from current `main` and adds executable preflight plus independent CI validation before merge.
