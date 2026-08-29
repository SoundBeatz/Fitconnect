# My Twin generation quota counted platform failures

Date: 2026-08-29

## Incident
The initial My Twin generation guard counted every generation-job row created in the rolling 24-hour window. Three renderer jobs had already failed with `OUTPUT_STORAGE_FAILED` because the private avatars bucket did not yet allow validated PNG renderer output. Those historical platform failures consumed the same five-job quota as successful customer renders and caused a customer to receive `Dagelijkse My Twin generatielimiet bereikt` after the renderer/storage defect had been repaired.

## Resolution contract
The generation gateway uses two separate safety limits:
- maximum 5 successful/active customer generations per rolling 24 hours (`queued`, `awaiting_renderer`, `rendering`, `ready`);
- maximum 12 total job attempts per rolling 24 hours as a hard cost/abuse circuit breaker.

A failed platform job no longer consumes the normal five-generation customer allowance, but failed attempts still contribute to the larger hard circuit breaker so provider-cost abuse cannot become unbounded.

Audit history is retained; failed job rows are not deleted or rewritten to manufacture quota capacity.
