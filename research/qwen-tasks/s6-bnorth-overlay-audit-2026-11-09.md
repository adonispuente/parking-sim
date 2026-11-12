# QWEN read-only audit — M3 S6 B North overlay migration

**2026-11-09 · QWEN (researcher-2) · read-only; no source/map/test edits, no traffic reruns**
Per SPARTAN's bounded S6 packet. Audits the LANDED migration of the B North direct
departure leg from code literals into `lane:b-north-direct` in `images/layout-overlay.json`.

## Scope confirmed
- Inspected landed source (byte-verified below), the overlay entry, the view module, the
  geometry checker, `src/positions/`, `pavementRouting.js`, `vehicleRegistration.js`,
  `sourceRouting.js`, and `shuttleRoutes.js` for consumers of the new exports.
- No before/after capture rerun (SPARTAN's `verification.json` is the traffic record);
  no broad tests.

## 1. Tree integrity
All five files SPARTAN named in his S6 message hash exactly to his recorded
`research/runs/m3-s6-c549/source-final.sha256` (recomputed this pass):
`layout-overlay.json 3797bd0d…`, `layoutOverlay.js c197a4ea…`,
`parkingRoutes.js c2d39cb8…`, `layoutOverlayView.js 5e6f9cb3…`,
`layout/README.md 2a58c61b…`. **No drift since S6 landed.**

## 2. The migration, as landed (verified in code)
- **Overlay entry** (`images/layout-overlay.json`, 8th shape): `lane:b-north-direct`,
  3-point linestrip, `classes=car`, `evidence=approved-abstraction`,
  `confidence=estimated`; note correctly says "not surveyed pavement … no direct route
  from the western arm … no clearance certification."
- **Geometry vs source frame** (I recomputed, not read from his report): lane[0] =
  `routeAt(7)[18]`, lane[1] = `routeAt(7)[19]`, lane[2] = `routeAt(11)[0]` — all three
  deltas **0.000000 px**. The .001 px exit-join gate (`bNorthDirectExit`,
  parkingRoutes.js:291) compares lane[2] against `VECTOR_ROUTES.departure.bNorth[0]`,
  which is exactly `routeAt(11)` — the existing departure source. Contract holds exactly.
- **Runtime read** (`layoutOverlay.js:147`): `B_NORTH_DIRECT_PATH = layoutFeature(...).points`;
  `parkingRoutes.js:288` consumes points[0]/[1] as `start`/`via` with `provisional:true`
  retained. Called only when `zone==='bNorth' && access==='bNorth'` (parkingRoutes.js:363).
- **Approved constraints preserved in code:**
  - Northern-row starts: launch is at vertex 18 of #7, inside the north rows — unchanged.
  - Both exits + section-weighted choice: `bNorthDirectExit` is *one lead candidate*;
    the existing `bLoopExit` (parkingRoutes.js:364) and grid/forward fallbacks (369–370)
    are intact, and west access is untouched (B_CIRCULATION_SOURCES path).
  - Shuttle routes: `shuttleRoutes.js` never imports `layoutOverlay.js`; the B circuit
    uses source #25 and stops #45/#46. No shuttle reference to the new lane exists.
  - `RUNTIME_FEATURES` gains exactly this id; `classes=car` is enforced by the parser
    (layoutOverlay.js:127–132), and the 3-point-linestrip contract is enforced there too.
- **Display:** `layoutOverlayView.js` gives it the explicit meaning
  "north-row launch · not surveyed", status `runtime`, colour = estimated (amber).
  README documents the runtime scope and that no lane width is certified.
- **Re-ran the two narrow gates live:** `npm run layout:check` → PASS, 7 features,
  the expected width warning; `node --test tests/b-north-direct-exit.test.js` → **4/4**.

## 3. Pitfalls for follow-up work (ranked)

1. **Hard-throw on join drift breaks the whole app.** `bNorthDirectExit` throws when
   lane[2] misses the live exit source by >0.001 px (parkingRoutes.js:291–292). The
   lane is in `RUNTIME_FEATURES` and `LAYOUT` is parsed at module load, so if the
   Commander ever *redraws* this feature in LabelMe, even a 1 px drift means
   **the page fails to load** — and the README's own "a file the parser rejects stops
   the app from loading" warning doesn't mention this second, *runtime-geometry* throw
   (the checker does not see it; it only validates LabelMe structure). A retrace must
   land within 0.001 px of the #11 exit start, or the code must degrade gracefully.
2. **Silent fallback hides a bad redraw.** If `clearSegment` rejects either leg,
   `bNorthDirectExit` returns `null` and routing falls back to `bLoopExit` — no warning
   anywhere — while Routes still renders the lane as **runtime/estimated**. The overlay
   would then *lie* about what drives traffic. Consider a console/diagnostic line when
   the runtime lane is parsed but never used.
3. **Provenance record disagrees with the geometry it now describes.**
   `B_EXIT_PROVENANCE.push({source:7, from:18, to:B7_PERIMETER_END, mode:'north-rows-direct', …})`
   (parkingRoutes.js:294) still cites source #7 vertices 18/19, but the returned path
   is the overlay's points (18, 19, then #11[0]) — a 3-point shape where the provenance
   implies a 2-point source#7 leg. Harmless today (points are 0.000000-identical), but
   any future retrace makes the diagnostic stale. The note text in the overlay is the
   accurate one; the provenance object is the stale one.
4. **Redraw semantics are order- and class-sensitive.** Point order = travel direction
   (README), and the parser requires `classes=car` — but *generic* lanes (kind `lane`,
   2+ points) parse as advisory with no such checks. Only `lane:b-north-direct` carries
   the strict pilot contract. A Commander redrawing it as a 2-point strip passes the
   checker at kind level, then hits pitfall 1 at app load.
5. **The width warning will persist forever.** `width_px` is deliberately absent
   (correct — none is known). `layout:check` will print the warning on every run,
   including future M4/road work. If it starts drowning real problems, it needs to be
   demoted or made dismissible in the README, not silently removed.

## 4. Verdict
The S6 migration is a clean, minimal, behavior-identical abstraction: exact geometry,
exact constraints, honest metadata, display and docs in place. Nothing to fix in code
for S6 itself. Items 1–3 are the ones to keep in mind before the Commander ever redraws
the feature or before M4 touches display semantics.

**No source, map, or test files changed. No traffic rerun. QWEN available for the S6+
before/after path proof if needed.**
