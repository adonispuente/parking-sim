# S6 B North redraw follow-up — CLAUD assessment (no source edits)

Inputs: packet 95e2bbd6, QWEN audit 2001791e. Targeted reads: parkingRoutes.js 276-295 and 355-375, layoutOverlay.js 110-169, import heads of layoutOverlay/vectorRoutes/layoutGeometryCheck/clearImageSource/layout-check, tests/b-north-direct-exit.test.js. Nothing run beyond grep; no app, map or test files changed.

Parser three-point / car-only enforcement (layoutOverlay.js:127-132) is already in place and is not repeated below.

## Facts that shape the repair
- Exit join target is `VECTOR_ROUTES.departure.bNorth[0]` = `routeAt(11)[0]` (vectorRoutes.js:22). `routeAt` lives in clearImageSource.js, which imports only the source JSON. So any checker can compute the target with no import cycle.
- layoutOverlay.js must stay import-light: sourceRouting.js imports it (feeder predicates), so it cannot import sourceRouting or vectorRoutes.
- layoutGeometryCheck.js already imports sourceRouting and is consumed by the checker script and the view, not by layoutOverlay.js. It is the right home for redraw validation.
- The throw at parkingRoutes.js:291 fires inside `zoneDepartureRoute`, i.e. whenever B North departures are built, which takes the page down. The checker never sees it today.
- Blocked direct leg (line 293) returns null; line 364 then takes `bLoopExit` with no record that the configured lane was skipped. Routes still labels the lane "runtime".
- Line 294 provenance cites `source:7, from:18, to:19`; the path actually returned is the three-point overlay lane.

## Recommended repair (smallest; SPARTAN integrates)
1. **Join check in the checker (risk 1).** `src/layoutGeometryCheck.js`, inside `checkLayoutGeometry`: if `lane:b-north-direct` exists, compare `points[2]` with `routeAt(11)[0]` (import from clearImageSource.js); over 0.001 px push a named problem on that id ("exit join is N px from the bNorth departure source #11[0]; must be within 0.001 px"). It then reaches `badIds`, so the lane turns red. Also run `clearSegment` on start->via and via->join (sourceRouting import already present) and push a named **warning**, not an error, if blocked.
   Keep the runtime throw at parkingRoutes.js:291 unchanged. It is the hard contract; snapping is out of scope. The checker now rejects the redraw before the app is opened. Add one README line under the B North section: "a moved exit point fails `npm run layout:check` and stops the app; keep vertex 3 exactly on #11's first point."
2. **Visible blocked fallback (risk 2).** `src/parkingRoutes.js:293`: before `return null`, push `B_EXIT_PROVENANCE` entry `{zone:'bNorth',access:'bNorth',source:'lane:b-north-direct',mode:'north-rows-direct-blocked',provisional:true}` and `console.warn` once. Fallback order (bLoopExit, then connect/bForwardExit) is unchanged.
   Export `B_NORTH_DIRECT_USED = () => B_EXIT_PROVENANCE.some(e => e.mode === 'north-rows-direct')` (or an equivalent flag). In `src/layoutOverlayView.js`, label the lane `runtime · configured, not used (blocked)` when it is configured but not used. That is the "configured vs used" distinction. If the view must not import parkingRoutes, pass the flag in through the existing `runtimeIds` parameter from the caller.
3. **Accurate provenance (risk 3).** `src/parkingRoutes.js:294`: replace `source:7, from:18, to:B7_PERIMETER_END` with `source:'lane:b-north-direct', points:B_NORTH_DIRECT_PATH.length, exitSource:11, origin:'#7 v18-19 (pre-S6 literal)'`. Keep `zone`, `access`, `mode:'north-rows-direct'` and `provisional:true`, because tests/b-north-direct-exit.test.js:27 asserts them.

Files: `src/layoutGeometryCheck.js`, `src/parkingRoutes.js` (lines 293-294 plus one export), `src/layoutOverlayView.js` (label only), `layout/README.md`. No map, overlay JSON or test edits.

## Narrow acceptance gates
1. `npm run layout:check` on the real overlay: PASS, same 7 features, same width warning, and no new warning.
2. A temp copy with lane vertex 3 moved 1 px: named join error on `lane:b-north-direct`, exit non-zero, lane red in the SVG.
3. A temp copy with via moved onto a roof: named blocked warning. In a node probe with that copy, departures still build (bLoopExit path), a `north-rows-direct-blocked` entry is present, and the view label reads "not used".
4. `node --test tests/b-north-direct-exit.test.js`: 4/4.
5. QWEN's `capture.mjs` / `compare.mjs` 20-minute C300 before and after: all traffic sections hash-equal. Only the provenance record content may differ; confirm the capture does not hash `B_EXIT_PROVENANCE`, or diff that field alone.
6. `npm run build`: passes.
Skip the full suite, browser pass beyond one Routes glance, and M4.

## What would change this call
If SPARTAN prefers a page that keeps loading after a bad redraw, replace the throw with the same blocked-fallback path. That is a behavior-policy change and needs Commander sign-off. I do not recommend it: a silently misjoined exit is worse than a loud checker failure.
