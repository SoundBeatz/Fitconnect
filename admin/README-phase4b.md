# Admin Control Plane v2 — Phase 4B

Adds a unified Commerce workspace navigation for Orders, Quotes and Invoices, plus a Vercel-style Command Palette (`Cmd/Ctrl + K`).

## Ownership boundary
- No auth changes
- No Supabase schema changes
- No payment changes
- No replacement router
- Navigation delegates to existing sidebar/data-view owners
- Quotes continue to be owned by `commerce-lifecycle.js`

## UX
- Shared Commerce sub-navigation in Orders, Quotes and Invoices
- Lifecycle cue: request → approval → payment → delivery
- Command Palette for direct navigation across Command Center modules
- Light/dark-mode compatible
