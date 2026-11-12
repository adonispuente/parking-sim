# QWEN M3 S0 baseline tooling — finished and reported (2026-11-09)

Bounded assignment per SPARTAN's M3 execution scope (`handoffs/m3-layout-start-ccc4.md`):
reusable generated-path capture/compare tooling in `research/runs/m3-layout-baseline/`,
no app-source edits, no broad testing.

## Exact reusable commands (project root)
```sh
node research/runs/m3-layout-baseline/capture.mjs <out.json> [ticks=24000] [dt=0.05] [service=eleven] [c=300]
node research/runs/m3-layout-baseline/compare.mjs <before.json> <after.json>   # exit 0 = all sections equal
```
Default capture = 20 min at the production 0.05 s step, 11 a.m. service, C at 300
(the accepted C300 scenario). 72000 ticks = 60 min.

## Current status (all verified this pass)
- **Tooling complete and working.** `compare.mjs` run on my two 20-min captures: exit 0, every section equal.
- **Determinism proven:** two identical runs produce the identical `all` hash (`9da6c510…`); 0 routing issues both.
- **Independent cross-check against CLAUD's S2 recorded captures:**
  - lanes (27) and connectorProvenance (38): geometry **byte-identical** after normalizing my document to his shape (my doc adds `length`/`nonpavement`/`source` and 1e-6 rounding; 0 records differ, max coordinate delta 0).
  - `vectorRoutes`, `circuits`, `zoneStaging`: hash-equal without normalization.
  - Re-running CLAUD's own `path-fingerprint.mjs` on the current tree reproduces his recorded all-hashes exactly: `6cd4b3ec…` (20 min) and `04d95ddd…` (60 min).
- **Tree state since CLAUD's S2 handback:** 39 src files unchanged; the three routing files (`parkingRoutes`, `pavementRouting`, `sourceRouting`) match his S2 `source-after` exactly. Only `layoutOverlay.js` changed (his checker-repair pass) plus the new S3 files `layoutGeometryCheck.js` / `layoutOverlayView.js`.
- **My 60-min capture:** 0 routing issues, C fully cleared (300/300).

## Honest label
This is a **cross-check against current (post-M3 S1–S2) code**, not a pre-M3 baseline: my S0 run started after CLAUD had already landed S1–S2, so his own pre-edit capture remains the pre-edit record. For any future change, the reusable workflow is: capture before the edit → edit → capture after → `compare.mjs` (exit 0 = no behavior change).

## For SPARTAN (S3 takeover context)
Your S3 display work touched `layoutOverlayView.js` (new) and `layoutOverlay.js` — neither is read by routing, and both 20/60-min generated geometries still match CLAUD's S2-recorded captures, so the traffic baseline is intact. Full suite not run (Commander deprioritized). Nothing in my write area beyond the scripts, this report, and the three capture JSONs.

## Files
`research/runs/m3-layout-baseline/`: `capture.mjs`, `compare.mjs`, `STATUS.md`, `current.json` (20-min), `current-run2.json` (determinism twin), `current-long.json` (60-min).
