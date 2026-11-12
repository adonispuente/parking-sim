# M3 start — bounded S0–S2 execution

SPARTAN · 2026-11-09

Commander: “deprioritize test and then continue, the flow of things looks good and I can't find and grid locks now.” Continue M3 without blocking on field calibration of M2. M2 remains provisional, not calibrated. Skip the extra C East production-preemption test; preserve the accepted repair. Full source-reviewed packet is shared by SPARTAN as `handoffs/m3-layout-start-ccc4.md`; this project copy records the execution contract.

## Ownership / order
- QWEN: only S0 tooling/output under `research/runs/m3-layout-baseline/`, no source, package, map or test-file edits. Capture actual ordered generated vehicle paths and shuttle circuit/leg geometry with stable IDs, source hashes, preset/config and Node version. Repeat identical capture twice, compare and publish. Raw source trace hashes alone are insufficient.
- CLAUD: sole application owner for S1/S2 from `research/runs/m3-layout-claud/plan.md`. Build separate named LabelMe overlay, pure loader, checker, templates/docs, then behavior-equivalent parameter migration. Obtain pre-edit generated-path baseline first; use QWEN's returned capture tooling before migration. Do not claim it returned before it does.
- SPARTAN: coordinate and independently accept handback. S3 display and further slices follow acceptance, not automatic expansion.

## Required plan corrections
1. C throat xMin955/xMax1015/tailY140/stagingTarget[986,162] is a provisional staging exclusion, not an observed physical median footprint. Do NOT make that whole box enforced `nodrive`. Preserve current source-derived nose/entry/exit references. Leave physical island geometry unknown until evidenced.
2. Preserve Feeder semantics exactly: direct checks require BOTH endpoints x<52 with dy>.001; grid checks reject any dy>0 from START x<52, including crossing the boundary. Name these parameters/helpers without pretending the half-plane is surveyed lane geometry.
3. Pure overlay loader must not import foundational routing and create a cycle. Separate obstacle validation.
4. Width_ft cannot be compared to pixel/world vehicle sizes without explicit conversion and estimated-scale disclosure. No field safety/body-clearance certification from centerlines.
5. Verify actual LabelMe config features; don't promise unsupported description dropdowns. Templates are acceptable.
6. Explicitly list runtime-consumed features versus advisory overlay drawings. No generalized routing/no-drive rewrite in S2. A deterministic SVG review artifact is acceptable instead of introducing a PNG stack.

## Narrow gate
Run real `layout:check`, named invalid-input rejection, generated-path equality before/after, `npm run build`, and existing production C300/11AM/.05-second/demand smoke (inspect `research/runs/c-east-independent-b606/production-probe.mjs` arguments first). Report departures/routing issues/shuttle progression. No new broad tests or suite cleanup. Resolve real changed-path failures rather than ignoring them.

Protect B section-weighted exits and approved northern-row direct departure; C staffed access, exits and #64 shuttle-priority dependency release; A gates/cohorts; safe-point dispatch and rewind. No source JSON rebinding, invented C detour, reversed inbound route, styling, people, new staffed-position policy or calibration claim.

Status: execution scope saved; assignments pending handoff/return. No implementation completed or app source edited by SPARTAN this pass.
