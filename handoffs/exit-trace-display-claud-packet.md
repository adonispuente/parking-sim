# QWEN packet v3 — show all 32 drawn exit traces under Routes (display only)

Author: CLAUD (plan only, wrote no application code). Reviewer: SPARTAN. Implementer: QWEN.
Supersedes: v2 `d8ab22d2` (and v1 `e1d63c44`). Incorporates SPARTAN review `9fa97865` (rulings 1-4, clarifications A-C).
Status: DRAFT until SPARTAN releases it. **QWEN: do not start before an explicit SPARTAN release message.**

Project: `/Users/adonispuente/Desktop/Developer/parking-sim`

## 0. Why this exists

The Commander turned Routes on and did not see his new exit drawings. Correct today:
- `src/Scene.jsx` (around lines 333-353) draws only `VEHICLE_ROUTE_CATALOG.routes`.
- `src/Scene.jsx` (around 542-553) adds cyan road-anchored comparisons from the same catalog.
- `src/exitPathSource.js` holds all 32 exits from `images/ExitPathsAndC.json`; nothing in `src/` imports it.

Goal: **draw all 32 traces when Routes is on, labeled as drawn geometry**, visibly distinct from routes cars drive. Traffic does not change.

## 1. Hard rules (stop and report if any would be broken)

1. Display only. Do NOT edit: `parkingRoutes.js`, `traffic.js`, `campusSimulation.js`, `vehicleRouteCatalog.js`, `vectorRoutes.js`, `roadAnchoredRoutes.js`, `lotAControl.js`, `sharedTraffic*`, any controller/policy file, `exitPathSource.js`, any file in `images/`, any `presentation*.js`, `main.jsx`, `styles.css`.
2. Do NOT touch any S1 file: `src/parkingRoutes.js`, `src/tracedExitPilot.js`, `tests/exit-path-source.test.js`, `tests/b-north-direct-exit.test.js`, `tests/traced-exit-pilot.test.js`. Do not repair the historical S0 test assertions (see 5.3); that is out of scope.
3. Draw catalog points exactly. No reversing, smoothing, simplifying, snapping, road-joining, A*, or connecting traces.
4. No arrows, chevrons, start/end dots, or anything implying driving direction. Outward direction is **unverified** (`exitPathSource.js:10-12`).
5. Only the 32 linestrips are drawn. Shapes #48 (point) and #49 (roundabout polygon) and every non-exit shape must NOT appear.
6. Key everything by catalog id `exitpaths-<sourceIndex>`, never by label (12 traces share "Lot B North Exit Path").
7. Activation comes only from the explicit frozen list in 3a. Never infer it at runtime. Never import routing into the overlay module.
8. One implementation owner at a time. No interleaving with S1 or repository cleanup.

## 2. Sequencing with S1 — PROPOSED CHANGE, needs SPARTAN release

SPARTAN ruling 4 keeps "S1 boundary, then display" unless CLAUD explicitly proposes otherwise. **CLAUD proposes otherwise:**

**Proposal: park S1 (clean, unstarted) and run this display slice first.**
- Verified state (SPARTAN 9fa97865, QWEN 97c29e4a): S1 not implemented; `src/tracedExitPilot.js` and `tests/traced-exit-pilot.test.js` absent; 119/119 protected files at before.json.
- "Parked" means **paused, not rejected**. S1's packet `a592f229` stays valid and resumes after this slice is accepted.
- Why: the Commander's visible complaint is that he cannot see his exits. This slice fixes that in three files with zero traffic risk. S1 activates one trace and has not started. Parking it costs nothing; making the display wait costs the Commander his only visible result.
- Consequence for S1 (SPARTAN must amend S1 on resume): S1's allowlist gains exactly one edit — `src/exitPathOverlayView.js`, changing `ACTIVATED_EXIT_IDS` from `[]` to `['exitpaths-34']` — and only if S1 is promoted. The activation tripwire (test 10) fails if S1 wires the import without that edit, so the omission cannot pass silently. S1's verification must then include `tests/exit-path-overlay-view.test.js`.

**If SPARTAN declines the proposal**, use the original order: QWEN must have an actual S1 handback (promoted or rejected) before starting. Baseline-clean alone does not count as finished. Then:
- S1 rejected (handback says so, live source unchanged): `ACTIVATED_EXIT_IDS = []`, baseline = before.json.
- S1 promoted (handback says so): `ACTIVATED_EXIT_IDS = ['exitpaths-34']`, baseline = the accepted post-S1 hash file named in SPARTAN's S1 acceptance.

SPARTAN's release message must state which branch applies: `PARKED-S1`, `S1-REJECTED`, or `S1-PROMOTED (<acceptance artifact id>)`. QWEN records that line verbatim in the handback. Do not interpret "not started" as "rejected".

## 3. File ownership (exactly three files)

| File | Action |
|---|---|
| `src/exitPathOverlayView.js` | NEW. Pure data module, no THREE, no React, no routing imports. |
| `tests/exit-path-overlay-view.test.js` | NEW. |
| `src/Scene.jsx` | EDIT. Import + init line, one draw block, two lines in the Routes visibility effect, legend rows. Nothing else. |

Anything else needed means STOP and report.

### 3a. `src/exitPathOverlayView.js` (new)

Imports allowed, ONLY these two:
```js
import { EXIT_PATHS, EXIT_PATH_SOURCE_FILE } from './exitPathSource.js';
import { traceWorldPoint } from './tracedMap.js';
```
`traceWorldPoint` is the existing `toWorld` export (`WORLD_SCALE = 113.6/1374`). `ExitPathsAndC.json` uses the same 1374x1118 frame. Do not add a scale constant.

Exports, all deep-frozen:
```js
// Explicit activation list. [] for PARKED-S1 and S1-REJECTED.
// ['exitpaths-34'] only for S1-PROMOTED, set by the reviewed slice that promotes it.
// The display never infers activation.
export const ACTIVATED_EXIT_IDS = Object.freeze([]);

export const EXIT_TRACE_COLOR = '#f5f4ee';

export function exitTraceOverlay() -> {
  file: 'images/ExitPathsAndC.json',      // from EXIT_PATH_SOURCE_FILE
  total: 32,
  counts: { a: 6, b: 12, c: 14 },         // computed from EXIT_PATHS, not hard-coded
  activated: [...ACTIVATED_EXIT_IDS],
  lines: [ ... 32 entries, ascending sourceIndex ... ]
}
```
Each `lines[i]` has exactly these 10 keys:
- `id` — e.g. `exitpaths-34`
- `sourceIndex` — number
- `lot` — `'a' | 'b' | 'c'`
- `family` — from catalog (`aSouth`, `aNorth`, `b`, `c`)
- `label` — catalog label, unchanged
- `pixelPoints` — catalog points, same order and values
- `worldPoints` — `pixelPoints.map(traceWorldPoint)`
- `status` — `'active'` if id in `ACTIVATED_EXIT_IDS`, else `'drawn-reference'`
- `tag` — `#34 · B · drawn ref` when drawn-reference; `#34 · B · drawn, in traffic use` when active. Use `#<sourceIndex>`, never the label.
- `labelAt` — `worldPoints[Math.floor(worldPoints.length / 2)]` (middle vertex; implies no direction)

Throw a named Error at module load if: total !== 32, counts differ from A6/B12/C14, an id in `ACTIVATED_EXIT_IDS` is not in the catalog, or ids are not unique. No silent fallback.

Build once at module load and return the same frozen object.

### 3b. `src/Scene.jsx` (edit)

Anchor by quoted text, not line numbers. If an anchor is missing, STOP.

1. **Import + init.** After `import { overlayDisplay, overlaySummary, CONFIDENCE_COLORS, PROBLEM_COLOR } from './layoutOverlayView.js';` add:
   ```js
   import { exitTraceOverlay, EXIT_TRACE_COLOR } from './exitPathOverlayView.js';
   ```
   Next to `const LAYOUT_VIEW = overlayDisplay();` add `const EXIT_TRACE_VIEW = exitTraceOverlay();`.

2. **Draw block.** Insert immediately AFTER the `}` closing `for(const f of LAYOUT_VIEW.features) {` and BEFORE `renderer.domElement.dataset.layoutOverlay=...`:
   - `const exitGroup=new THREE.Group(); exitGroup.name='exit-trace-overlay'; routeOverlay.add(exitGroup);`
     As a child of `routeOverlay`, the existing Routes toggle shows/hides it and unmount disposes it. No new toggle, prop, state or effect.
   - For each `l` of `EXIT_TRACE_VIEW.lines`: one `THREE.Line` from `l.worldPoints` at `y=.63`, material `new THREE.LineBasicMaterial({color:EXIT_TRACE_COLOR, depthTest:false})`, `renderOrder=7`, `userData.exitTraceId=l.id`.
   - One `label(exitGroup, l.tag, l.labelAt[0], 1.2, l.labelAt[1], EXIT_TRACE_COLOR, 7)` per line.
   - No markers, spheres, arrows, end caps.
   - Then: `renderer.domElement.dataset.exitTraceOverlay=JSON.stringify({file:EXIT_TRACE_VIEW.file,total:EXIT_TRACE_VIEW.total,counts:EXIT_TRACE_VIEW.counts,activated:EXIT_TRACE_VIEW.activated,initLines:exitGroup.children.filter(o=>o.isLine).length});`
     This is the **init-time inventory only**. It is not a live count; do not report it as one.
   - Do NOT build these inside the `showRoutes` A* effect (the one setting `anchorsBuilt`).

3. **Live count (clarification B).** In the existing effect whose body contains `e.routeOverlay.visible=showRoutes;`, after the existing `dataset.routeCatalog=` line, add:
   ```js
   let exitLines=0; e.routeOverlay.traverse(o=>{ if(o.isLine&&o.userData.exitTraceId) exitLines++; });
   e.renderer.domElement.dataset.exitTraceLive=JSON.stringify({routes:showRoutes,groupVisible:e.routeOverlay.visible,lines:exitLines});
   ```
   This reads the current scene graph at every toggle, so a duplicate build would show as more than 32. Do not change the effect's dependency array or other lines.

4. **Legend (clarification A).** Inside `<aside className="layout-legend" ...>`, after the closing `</ul>` and before the final `<small>`, add:
   ```jsx
   <strong>Drawn exit traces</strong>
   <small>{EXIT_TRACE_VIEW.file} · {EXIT_TRACE_VIEW.total} drawn · A{EXIT_TRACE_VIEW.counts.a} B{EXIT_TRACE_VIEW.counts.b} C{EXIT_TRACE_VIEW.counts.c} · {EXIT_TRACE_VIEW.activated.length} in traffic use</small>
   <ul>{swatch(EXIT_TRACE_COLOR,'drawn exit geometry; traffic use listed above')}</ul>
   ```
   This wording is true with zero or one active trace. Each unactivated trace still carries its own `drawn ref` tag. Do not change existing legend rows or the existing final `<small>`.

No other edits to Scene.jsx.

## 4. Tests — `tests/exit-path-overlay-view.test.js` (node:test, style of `tests/exit-path-source.test.js`)

Each a separate `test(...)`:
1. **Counts.** `total===32`, `counts` deep-equals `{a:6,b:12,c:14}`, `lines.length===32`.
2. **Ids.** Exactly `exitpaths-16` … `exitpaths-47`, unique, ascending by sourceIndex.
3. **Exact geometry.** Each line's `pixelPoints` deep-equals `exitPathById(id).points` AND raw `images/ExitPathsAndC.json` `shapes[sourceIndex].points`, same order. `#34` first point `[775.8417805627497,286.06158806214086]`, last `[841.0525192126767,73.14727108238584]` (not reversed).
4. **Transform.** Every `worldPoints[k]` deep-equals `traceWorldPoint(pixelPoints[k])`. Hand check one point with `Math.abs(world[0] - x*(113.6/1374)) < 1e-9` (and same for y). Do not assert bit-identity against `x*113.6/1374`; production multiplies by the precomputed scale.
5. **Exclusions.** No sourceIndex 48, 49, or outside 16..47. Every non-`linestrip` source shape is absent.
6. **No direction fields.** Every line's key set equals exactly the 10 keys in 3a.
7. **Duplicate labels safe.** The 12 "Lot B North Exit Path" lines have distinct ids and distinct `pixelPoints`.
8. **Frozen.** Result, `lines`, each line, and each point array are frozen; strict-mode mutation throws.
9. **Import isolation (static).** `src/exitPathOverlayView.js` has exactly two import statements, `./exitPathSource.js` and `./tracedMap.js`. In `src/`, only `Scene.jsx` imports `exitPathOverlayView`. None of `parkingRoutes.js, traffic.js, campusSimulation.js, vehicleRouteCatalog.js, vectorRoutes.js, roadAnchoredRoutes.js, lotAControl.js` imports it.
10. **Activation tripwire (integration alarm only).** Read `src/parkingRoutes.js` as text and match an actual import statement:
    `/^\s*import\s[^;]*?from\s+['"]\.\/tracedExitPilot\.js['"]/m`
    A comment mentioning `tracedExitPilot` must not trigger it. If matched, assert `ACTIVATED_EXIT_IDS` deep-equals `['exitpaths-34']`; else assert `[]`. Every activated id has `status==='active'`; all others `'drawn-reference'`.
    Put this comment above the test: `// Integration alarm only: proves the list matches the import, not that #34 is behaviorally accepted. The activation decision comes from S1's handback.`

No whole-tree hash checks or git-state checks in this permanent test.

## 5. Verification (save every log and exit code)

Output folder: `research/runs/exit-trace-display/` (new; do not write into older run folders).

1. **Baseline before editing (clarification on drift):**
   - Record SPARTAN's release branch line verbatim.
   - `git status --short` → `git-status-before.txt` (evidence only, NOT a gate; `MM` entries exist at the accepted baseline).
   - Baseline hash source: `PARKED-S1` or `S1-REJECTED` → `research/runs/exit-pilot-3dbb/before.json` key `protectedFiles` (path → SHA-256). `S1-PROMOTED` → the accepted post-S1 hash file named in SPARTAN's release.
   - Hash every listed path into `before-hashes.txt`. Compare to the baseline file by path. Any mismatch or missing file = STOP.
   - **Expected-absence check:** for `PARKED-S1` / `S1-REJECTED`, assert `src/tracedExitPilot.js` and `tests/traced-exit-pilot.test.js` do NOT exist, and `src/parkingRoutes.js` has no import matching the test-10 regex. For `S1-PROMOTED`, assert both exist and their hashes equal the accepted post-S1 hashes. Do not look these up as ordinary before.json entries. Any mismatch = STOP.
   - Also assert `src/exitPathOverlayView.js` and `tests/exit-path-overlay-view.test.js` do not exist yet.
2. `node --test tests/exit-path-overlay-view.test.js` → all pass. Record N/N.
3. `node --test tests/exit-path-source.test.js` → record the actual pass count before and after your edit; they must match. **This result is not isolation evidence.** Its historical hash test (lines ~207-226) keys the manifest by SHA, so changed bytes evade it (SPARTAN demonstrated the false negative). Do not edit it. Step 7 is the isolation evidence.
4. `S1-PROMOTED` only: `node --test tests/traced-exit-pilot.test.js` → record actual result; it must match S1's accepted handback count.
5. `npm run layout:check` → exit 0.
6. `npm run build` → exit 0. Record the existing bundle-size warning.
7. **Protection sweep (mandatory, the real isolation proof):** re-hash every path from step 1, keyed by path. Only `src/Scene.jsx` may differ. The two new files are the only additions. Anything else = FAIL. Write `protection-sweep.json` with per-path before/after SHA.
8. **Raw routes:** compare all 64 raw routes against the step-1 baseline route set, reusing the exit-pilot-3dbb comparison method (copy the script into your run folder; do not edit the original). Expect 64/64 identical.
9. **Browser (clarification B).** Playwright at `research/runs/c-east-independent-b606/browser-tools/node_modules/playwright/index.mjs`; preview on port 5220 or a fresh `vite preview`; World view. New script in your run folder; never run a historical browser script unchanged.
   - Record the init inventory `canvas.dataset.exitTraceOverlay`: `total:32`, `counts {a:6,b:12,c:14}`, `initLines:32`, `activated` matching 3a.
   - Observe each state and save a screenshot for each, in **both Top and 3D**:
     - Routes OFF → `dataset.routeOverlay==='false'`, `exitTraceLive.groupVisible===false`; traces not visible in the screenshot.
     - Routes ON → `exitTraceLive` = `{routes:true,groupVisible:true,lines:32}`; traces visible.
   - Toggle cycle OFF→ON→OFF→ON→OFF→ON: record `exitTraceLive.lines` after every toggle. Must be 32 every time (more = duplicate build = FAIL).
   - If `exitTraceLive` cannot be read for any reason, STOP and report. Do not substitute the init inventory and do not claim a live-count result.
   - Zero page errors and zero console errors for the whole session.
   - Inspect the Top ON screenshot: traces on the B and C aisles and Lot A exits, not offset or mirrored. If they visibly miss the pavement, STOP (transform bug; do not tune).
   - Readability: if off-white lines are hard to tell from the grey `#9b8b80` route lines in 3D, the only allowed change is `EXIT_TRACE_COLOR`; record old/new value and re-screenshot. No dashes (dashes mean "rule area").
10. No traffic simulation required; inputs are unchanged per steps 7-8. Do not claim traffic behavior was re-verified.

## 6. Handback (fixed format, `research/runs/exit-trace-display/results.md`)

```
Status: DONE | STOPPED (reason)
SPARTAN release branch (verbatim): PARKED-S1 | S1-REJECTED | S1-PROMOTED (<artifact>)
Baseline hash source: <file path + SHA-256 of that file>
Expected-absence/presence check: <each path: absent/present, hash if present>
ACTIVATED_EXIT_IDS shipped: [...]
Changed files + SHA-256: (3 lines)
Tests: overlay N/N; exit-path-source before N/N, after N/N (not isolation evidence); [traced-exit-pilot N/N]; layout:check exit; build exit
Protection sweep: X paths checked by path; only Scene.jsx changed: yes/no; additions: (2 paths)
Raw routes: 64/64 identical: yes/no
Browser: init dataset JSON (paste); exitTraceLive after each toggle (list); page errors; console errors; screenshot paths (Top OFF, Top ON, 3D OFF, 3D ON); EXIT_TRACE_COLOR final
Limitations: (anything not checked)
```
Publish to the group and hand off to SPARTAN for independent acceptance. Do not tell the Commander it is accepted.

## 7. Out of scope

- Making any trace drivable or changing exit choice (that is S1 and later).
- Individual parking spots.
- South-first Main lock.
- Choosing a canonical name among the three byte-identical `images/` drawings (QWEN finding F2).
- Repository cleanup.
- Repairing the S0 historical hash test.
- Tying exit tags to the Labels toggle (possible follow-up if 32 tags clutter Top view).

## 8. Changes from v2 (for SPARTAN's review)

| Review item | v3 change | Section |
|---|---|---|
| Ruling 1 / A: activation claims | Explicit frozen list kept; tripwire matches an actual import statement via regex and is labeled an integration alarm, not behavior proof; "order-independent" claim removed | 2, 3a, 4.10 |
| A: legend contradiction | Unconditional "reference, not a driving route" replaced with "drawn exit geometry; traffic use listed above"; per-trace tags carry status | 3b.4, 3a |
| Ruling 3: drift | Hash by path from `protectedFiles`; explicit expected-absence of both S1 files and the pilot import; promoted branch uses accepted post-S1 hashes, recorded in handback | 5.1, 6 |
| B: live visibility | New `exitTraceLive` read by scene traversal in the existing toggle effect; init dataset renamed `initLines`; OFF/ON screenshots in Top and 3D; no substitution if live read fails | 3b.2, 3b.3, 5.9 |
| C: S0 test limitation | 28/28 explicitly not isolation evidence; record actual count; no S0 edit; protection sweep mandatory | 5.3, 5.7 |
| C: transform assertion | Tolerance against `x*(113.6/1374)` | 4.4 |
| Ruling 4: start gate | Explicit proposal to park clean, unstarted S1; release branch stated by SPARTAN and recorded verbatim; declined-proposal path kept | 2 |

**Riskiest assumption:** parking S1 is cheaper than the extra S1 allowlist line it creates. Kill-test: if SPARTAN judges the S1 amendment riskier than a delayed display, decline the proposal; the packet runs unchanged under `S1-REJECTED` / `S1-PROMOTED` after S1 hands back.
