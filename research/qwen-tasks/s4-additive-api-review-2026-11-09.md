# QWEN read-only review — M3 S4 additive position API

Date: 2026-11-09 · Reviewer: QWEN (researcher-2) · Scope per SPARTAN: `src/positions/index.js`, `src/layoutOverlay.js`, plus completed baseline tooling. No app edits, no broad tests, no S0 re-capture. All evidence below is from real runs this pass against the live tree.

## Verdict
**All five named API decisions hold against the landed code. No compatibility or safety gaps found in the changed surface.** The tree is byte-identical to SPARTAN's `research/runs/m3-s4-a2d7/source-final.sha256` (all 10 recorded files verified this pass — no post-landing drift). One tooling housekeeping item below (baseline re-anchor).

## Contract checks (each verified by live node --input-type=module probes)

| Decision | Landed code | Result |
|---|---|---|
| POSITIONS stays 8 staffed | `index.js:95-99` — maps `STAFF_POSITIONS`, throws on missing definition | **Holds** — 8 frozen entries, `aMain…cExit`, `staffed:true` |
| OVERLAY_POSITIONS + ALL_POSITIONS exposed | `index.js:113-115` | **Holds** — OVERLAY_POSITIONS=1 (`pos:c-layout-demo`), ALL=10 = 8+1+1, ids unique |
| positionById merges | `index.js:116` — `ALL_POSITIONS.find` | **Holds** — resolves `pos:c-layout-demo` (advisory) and all 9 originals; `positionById(null)` and `(undefined)` return `undefined`, never an entry |
| null-index guard | `index.js:117-118` — `index == null ? undefined` before `POSITION_ALIASES` | **Holds** — `positionByIndex(null)`/`(undefined)` return `undefined`; only resolves the 8 source indices; alias 31→aMain intact; overlay entries (index null) unreachable by index |
| Explicit advisory definitions, no controllers | `overlayDefinitions.js:45-46` — rejects any definition with `controllers.length !== 0` | **Holds** — demo has `controllers: []`, `active:false`, `status:'advisory'`, `index:null`, `aliases:[]` |

Additional guard probes (all threw the named error as designed): controller-bearing definition, orphan definition (no matching point), pos feature missing its stub, and five malformed `pos:` metadata cases (empty role, `staffed=yes`, empty staffed, bad evidence, bad confidence) — all rejected with named errors at the parser level (`layoutOverlay.js:96-99`).

## Negative-surface audit (compatibility)
- `git status`: S4 touched exactly the 10 files in `source-final.sha256`. No routing, map, or test files changed beyond scope.
- Live consumers of the registry: `Scene.jsx` (2 geometry constants), `feederOfficer.js`, `lotAControl.js`, `RouteSourcesPanel.jsx` (`OVERLAY_POSITIONS` for display only), `tests/positions.test.js` (4/4 pass this pass). **No code path reads `ALL_POSITIONS`/`positionById` for behavior** — the merge is display- and test-facing only, so advisory entries cannot leak into traffic logic via any current consumer.
- `layout:check` on the live tree: PASS, 4 features (3 runtime + 1 advisory), review image regenerated.
- `npm run build` state: SPARTAN's results record PASS; I did not rerun it (deprioritized), and the S4-diff below shows no traffic-affecting source change.

## Baseline tooling reconciliation (research/runs/m3-layout-baseline/)
Re-ran my `capture.mjs` (20 min, 0.05 s, 11 a.m., C300 — default scenario) against the current tree and section-compared to my S0 record:

| Section | Baseline vs live |
|---|---|
| lanes, routeLegs, shuttleLegs, vectorRoutes, connectorProvenance, zoneStaging, circuits, cMedian, scenario, preset, departed, routingIssues | **EQUAL** — generated traffic geometry byte-identical; 0 routing issues |
| overlay | DIFFERS **only** by the added `pos:c-layout-demo` record (first 3 records byte-identical) |
| source fingerprints | 45 src files compared: only `layoutOverlay.js` and `layoutOverlayView.js` changed (display surface); `src/positions/index.js` and `overlayDefinitions.js` were created after my S0 capture, so they are absent from the old record, not drifted |
| assets | only `images/layout-overlay.json` differs (the point was added to the file) |

**Re-verified this pass:** I re-ran the capture into `s4-review-crosscheck.json` (20 min, 0.05 s, 11 a.m., C300) and section-compared it against `current.json` (the pre-S4 anchor, Nov 9 17:22): every traffic section (lanes, shuttleLegs, routeLegs, vectorRoutes, connectorProvenance, zoneStaging, circuits) is hash-equal, departed counts equal (a=208 b=271 c=138), 0 routing issues; the only section that differs is `overlay`, and the only difference is the added `pos:c-layout-demo` feature (first 3 features byte-identical, same file sha and version). This is exactly the advisory-only delta the S4 change implies — no traffic effect. For S5 and beyond, treat `s4-review-crosscheck.json` as the current anchor so future before/after comparisons start clean.

## Confidence
High. Every row above was executed against the live tree this pass; the only file state I did not re-derive is the production build, which SPARTAN's verified results cover and which no S4-diffed file affects.
