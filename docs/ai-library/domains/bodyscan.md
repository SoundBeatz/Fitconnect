# BodyScan Domain Memory

**Evidence:** GIT_VERIFIED + RUNTIME_VERIFIED

## Purpose
BodyScan is the measurement engine beneath My Twin. Measurements drive visualization; AI output never becomes measurement truth.

## Canonical ownership
- `body_scan_snapshots`: immutable-style body-state measurement moments and provenance.
- `body_scan_segments`: provider-neutral left/right arm, trunk and left/right leg composition when a scanner supplies it.
- `body_measurements`: legacy/current compatibility timeline retained during migration.
- `body_scan_progress`: wizard draft/progress only.

## Measurement contract
Core: height, weight, BMI.
Composition: body fat %, fat mass, lean mass, skeletal muscle, water, visceral fat, BMR, phase angle when supplied.
Circumference: neck, waist, abdomen/belly, hip. These are first-class inputs for body-state interpretation and ratios.
Segmental: left_arm, right_arm, trunk, left_leg, right_leg with lean/fat data when actually measured/imported.

## Provenance
Every canonical snapshot carries field-level provenance. Supported semantics include measured, imported/device, calculated and estimated. AI visualization is not a measurement source.

## Derived v1
- BMI is calculated from measured height/weight.
- US Navy body-fat estimate is CALCULATED, never labelled measured.
- Fat mass and lean mass derived from a calculated body-fat value are CALCULATED.
- Waist-to-height and waist-to-hip ratios are CALCULATED from measured circumferences.

## Security
Both canonical tables have RLS. Authenticated customers can only select/insert/update rows whose `user_id = auth.uid()`. Segment writes additionally require the parent snapshot to belong to the caller. Anon has no table privileges.

## Provider abstraction
Do not couple My Twin to InBody, DEXA or another vendor. Provider data maps into the canonical snapshot/segment contract. Missing provider fields remain null; never fabricate them.

## UI v1
BodyScan completion renders a premium Body Composition Map with top-level composition, circumference anchors, calculated ratios, provenance labels and a body silhouette. Future segmental scanner data will attach interactively to the silhouette.

## Next
Add historical Start/Current selector, segmental scanner importer/API adapter, interactive region detail, trend charts, then bind a selected snapshot ID to a generated My Twin Body State version.