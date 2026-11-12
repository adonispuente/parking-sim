# M3 code plan — real world → layout/operations overlay (CLAUD, 2026-11-09)

Status: PLAN ONLY. No application source changed in this pass. Implementation starts on the Commander's go.

## Why M3 now
- Commander, latest instruction: "deprioritize test and then continue, the flow of things looks good and I can't find and grid locks now."
- SPARTAN's queued request for a new `tests/c-east-production-preemption.test.js` is therefore **skipped, not done**. C-East remains accepted on SPARTAN's existing independent evidence (`research/c-east-independent-b606-results.md`).
- M2 calibration needs field demand observations the Commander has not supplied. M3 is the next buildable item, and the Commander asked earlier for "things we'd need to help translate the real world into the inner workings and layout of the lots. Currently I just used the labelme stuff to do coordinates myself."

## Position (two sentences)
Keep LabelMe as the drawing tool and add a second, versioned LabelMe file that carries meaning (direction, connections, medians, stop lines, positions) in structured `description` fields, read by one validating loader. Code then asks the overlay for named features instead of hard-coding source indices and pixel literals, so a new road fact is one drawing plus a validation run, not edits across five modules.

## Source evidence (read this pass)

| Finding | Where | Consequence |
|---|---|---|
| Source is bound by **array position**: exactly 65 shapes, each label/type checked by index; any appended shape throws. | `src/clearImageSource.js:11-32` | Editing the existing JSON is unsafe. New facts must go in a separate file. |
| ~46 hard-coded index lookups (`pointAt(64)`, `routeAt(7)`, `drivingPrefix(7)`...) across 12 modules; heaviest `vectorRoutes.js` (15), `parkingRoutes.js` (14). | grep of `src/` | Moving a feature means hunting indices. Overlay gives named IDs. |
| 22 pixel-coordinate literals in source, 19 in `parkingRoutes.js` (e.g. C median box `xMin:955,xMax:1015,tailY:140,stagingTarget:[986,162]`). | `parkingRoutes.js:20-27` and others | Undeclared geometry facts. They should be overlay features with evidence. |
| One-way rule exists only as `x<52` (Feeder northbound), duplicated in two files. | `sourceRouting.js:66,102`; `pavementRouting.js:8,35` | Direction is not data. A second one-way road would mean more magic numbers. |
| Drivable ground = 13 polygon indices minus 3 roof indices; no median/no-drive layer. | `sourceRouting.js:18,61` | Medians and prohibited shortcuts cannot be expressed today. |
| Two road stretches are disclosed as untraced. | `sourceRouting.js:46-51` | Overlay is the place to fill these, with evidence status. |
| Positions registry separates duty/implemented/intended/provisional, but location comes only from the 65-shape staff points. | `src/positions/index.js:26-97`; `clearImageSource.js:37-42` | A new position cannot be added without touching the strict binding. Overlay points fix that. |
| LabelMe 7.9.2 file; every shape already has `description`, `flags`, `group_id` fields (currently empty). | `images/EverythingClearImage.json` | No new tool needed. The Commander keeps the editor he already uses. |

## Design

### 1. Overlay file (drawn in LabelMe, same image)
`images/layout-overlay.json`: a normal LabelMe file opened against `images/Clear Image.png`. The existing 65-shape file is never edited.

| Feature | LabelMe shape | Label pattern | Meaning |
|---|---|---|---|
| Directed lane | linestrip | `lane:c-exit-north` | Point order = travel direction. |
| Two-way road | linestrip | `road:equity-drive` | Both directions allowed. |
| No-drive area | polygon | `nodrive:c-median` | Median, curb island, grass. Subtracts from drivable ground. |
| Drivable patch | polygon | `pave:equity-exit2-driveway` | Fills an untraced gap. |
| Stop / hold line | line (2 points) | `stop:c-exit-hold-north` | Where cars wait for a controller. |
| Junction | point | `node:equity-corporate` | Conflict-area center for controllers. |
| Position | point | `pos:c-row-marshal` | Staffed or unstaffed control point. |

Metadata goes in the shape's `description`, one `key=value` per line:

```
from=road:equity-drive
to=lane:c-entry
classes=car,shuttle
width_ft=24
evidence=commander-observed
confidence=confirmed
note=Turn from Equity onto Corporate runs while C cars exit
```

Required keys per type are fixed in the loader. `evidence` is one of `traced | measured | commander-observed | inferred | approved-abstraction`; `confidence` is `confirmed | estimated | unknown`. A LabelMe labels/flags config (`layout/labelme-config.yaml`) gives a dropdown so prefixes are not typed from memory.

### 2. Loader + validator: new `src/layoutOverlay.js`
- Parses the overlay; checks image size and source pair match `clearImageSource.js`; parses descriptions; rejects unknown keys and duplicate IDs.
- Exposes `feature(id)`, `lanes()`, `noDrive()`, `oneWay(a,b)`, `stopLine(id)`, `positions()`, `OVERLAY_PROVENANCE` (id, evidence, confidence, file hash).
- Validation (pure): every `from`/`to` exists; lane ends meet their connections within `joinPx` (reuse `VEHICLE_ROUTE_MANIFEST.thresholds.joinPx` = 18); no lane crosses a roof (`avoidsObstacles`) or a `nodrive` polygon; lane half-width >= vehicle half-width (`northernCorporateControl.js:8` body lengths); opposing lanes separated by >= existing conflict width. Failures are named, never silently routed around.
- `npm run layout:check` prints results and writes `research/layout-check/<hash>.png`: source image + overlay, colored by confidence, direction arrows, failures in red.

### 3. Wire-in rule: behavior-equivalent first
Every move from literal to overlay must leave built vehicle paths byte-identical: hash every lane path from `createCampusTraffic` before and after (`research/runs/m3-layout-claud/path-hashes-*.json`). Only after equivalence does any overlay feature change behavior.

## Slices (ranked by leverage per Commander-minute)

| # | Slice | Owner | Commander time | Gate |
|---|---|---|---|---|
| S0 | Path-hash baseline script (read-only) | QWEN | 0 | Hash file saved; two runs identical. |
| S1 | Overlay schema, loader, validator, `layout:check`, LabelMe config; empty overlay loads | CLAUD | 0 | Empty and sample overlays validate; a deliberately bad overlay fails with a named error. |
| S2 | **Pilot: C entrance/exit median + Equity turn.** Move `parkingRoutes.js:20-27` C-median constants and Feeder `x<52` rule into overlay features (`nodrive:c-median`, `lane:feeder-north` one-way). Runtime reads overlay. | CLAUD draws v1 from existing constants; Commander corrects in LabelMe | ~15 min review | Path hashes identical; C300 11 AM run still clears (SPARTAN's existing script). |
| S3 | Overlay view in Routes panel: lanes/arrows/no-drive/stop lines colored by confidence | CLAUD | ~5 min look | Commander sees what the sim believes vs. the image. |
| S4 | Positions from overlay: `pos:` points merge into `positions/index.js` with a definition stub; one unstaffed sample renders with no traffic effect | CLAUD; QWEN writes stub-definition checker | 0 | New position = one LabelMe point + one definition entry. Existing 8 staffed positions unchanged. |
| S5 | Fill the two disclosed untraced gaps (`sourceRouting.js:46-51`) as `pave:` patches | Commander draws; CLAUD wires | ~10 min | Gaps leave the disclosure list only when drawn; path diffs explained. |
| S6 | B North corridor as second pilot | CLAUD | ~10 min | Approved 82 px direct exit and both-exit behavior preserved. |

S0-S3 need no field data and no Commander decisions. S4 bridges to M5 (easier future positions). S5-S6 are where real-world knowledge enters.

## What changes for the Commander
Today: hand-place coordinates in LabelMe, then an agent edits pixel literals across several files.
After S1-S3: open `layout-overlay.json` in LabelMe, draw a lane in the direction cars drive, fill the description from the dropdown, run `npm run layout:check`, look at the PNG. If it validates, the sim uses it.

## Out of scope for M3
- No visual styling (M4), crosswalk (M6) or people (M7).
- No re-trace of the whole campus or every stall.
- No change to approved policies: B section-weighted exits, B North 82 px direct exit, C staffed entrance, #64 radio dependency release, A-only closure latch.
- No shuttle detour road. If the Commander later draws a second directed C return path, S2's lane graph is where it goes.

## Riskiest assumptions and kill-tests
1. **The Commander will annotate in LabelMe with structured descriptions.** Kill-test: after S1, he draws one lane and one median in the C pilot using the dropdown config. If that takes more than ~15 minutes or is tedious, replace S3 with a small in-app click-to-draw editor that writes the same overlay format.
2. **Literal-to-overlay swaps can be behavior-equivalent.** Kill-test: S0 hash baseline, then S2 with only the Feeder one-way rule moved. If hashes differ for a reason other than float formatting, stop and isolate before moving the C median.
3. **18 px join tolerance and existing conflict width are adequate validation thresholds.** Kill-test: run the validator on the current 65-shape routes converted to overlay form; real routes must pass. If they fail, the thresholds are wrong, not the routes.

## Evidence that would change this plan
- Commander supplies M2 demand observations: calibrate M2 first (smaller, already built).
- Commander prefers a fully in-app editor: skip the LabelMe config, build the S3 editor first.
- Commander wants styling (M4) before layout: M4 pilot can start on the C median with current geometry, accepting rework risk.
