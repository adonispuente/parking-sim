# M3 S1–S2 results: layout overlay, checker, C staging + Feeder migration (CLAUD, 2026-11-09)

Scope: SPARTAN `handoffs/m3-layout-start-ccc4.md` (artifact 9e619a53). Commander: "deprioritize test and then continue."
Stopped before S3 (Routes panel view). Awaiting SPARTAN independent acceptance.

## Result
Traffic now reads three named overlay features instead of pixel literals. Generated paths are byte-identical before and after.

| Overlay feature | Replaces | Read by |
|---|---|---|
| `stage:c-throat` (rectangle 955..1015, bottom 140) | `C_MEDIAN.xMin/xMax/tailY` literals | `parkingRoutes.js` `C_MEDIAN`, `inCThroat` |
| `stage:c-staging-target` (point 986,162) | `C_MEDIAN.stagingTarget` literal | `parkingRoutes.js` `staging()` |
| `oneway:feeder-north` (rectangle right edge 52, `tolerance_px=0.001`) | four `x<52` literals | `sourceRouting.js` `directedOk` + grid step; `pavementRouting.js` shortcut + grid step |

SPARTAN corrections applied:
1. C throat is a staging exclusion, not a no-drive median. Kind `stage`, role `staging-exclusion`, `evidence=approved-abstraction`, `confidence=estimated`. No physical median drawn. The checker never treats `stage` as an obstacle.
2. Both Feeder predicates kept distinct and exact: `feederSegmentOk(a,b)` = both endpoints `x<52` and `b.y>a.y+0.001`; `feederGridStepOk(a,dy)` = start `x<52` and `dy>0`. Strict `<`. Described as a simplified band, not surveyed geometry.
3. No import cycle: `src/layoutOverlay.js` imports only `clearImageSource.js` and the JSON. Roof/join checks live in `scripts/layout-check.mjs`.
4. Widths: `width_px` only (pixels). Checker warns that no physical/body clearance is certified. No `width_ft`.
5. No dropdown promise: `.labelmerc` is empty and `labelme` is not on PATH here. Supplied `layout/labelme-labels.txt` (for `labelme --labels`, untested) and a description template in `layout/README.md`.
6. Only `RUNTIME_FEATURES` (the three above) affect traffic. All other kinds validate and draw but are labelled `advisory`.

## Changed files
New: `images/layout-overlay.json`, `src/layoutOverlay.js`, `scripts/layout-check.mjs`, `layout/README.md`, `layout/labelme-labels.txt`.
Edited: `src/parkingRoutes.js` (import + C_MEDIAN fields), `src/sourceRouting.js` (import, `directedOk`, grid step), `src/pavementRouting.js` (import, shortcut, grid step), `package.json` (`layout:check` script).
Proof only these src files changed: `source-before.sha256` vs `source-after.sha256` differ only in those three, plus new `layoutOverlay.js`. Not edited: `images/EverythingClearImage.json`, any test file.

## Verification (all run this pass)
| Check | Command | Result |
|---|---|---|
| Overlay valid | `npm run layout:check` | PASS, 3 runtime features, exit 0 |
| Malformed overlay rejected | `node scripts/layout-check.mjs samples/malformed.json` | exit 1, 8 named problems (too few points, unknown key `width_ft`, bad evidence, duplicate id, bad label, bad `from` key, missing reference, missing runtime feature) — `checker-samples.log` |
| Geometry rejection | `samples/geometry-fail.json` | exit 1: `lane:sample-through-island: crosses nodrive:sample-island` |
| Roof rejection | first `advisory-ok.json` draft | exit 1: point on roof (my own sample error, caught); moved, then PASS |
| Not JSON | `samples/not-json.json` | exit 1, named JSON error |
| Baseline deterministic | `path-fingerprint.mjs` x2, 24000 ticks | identical `all=6cd4b3ec…` |
| Paths unchanged | before vs after, 24000 ticks (20 min) | identical `6cd4b3ec…` |
| Paths unchanged, long | before vs after, 72000 ticks (60 min) | identical `04d95ddd…` |
| Fingerprint sensitive | swap overlay: target→[990,170]; tail→175; feeder edge→200 | all three change lane/staging/connector hashes |
| Build | `npm run build` | pass (existing chunk-size warning) — `build.log` |
| Existing C median test | `node --test tests/c-entrance-median.test.js` | 4/4 pass |
| C300 smoke | copy of `c-east-independent-b606/production-probe.mjs` writing here | exit 0; output JSON **identical** to SPARTAN's accepted `production-proof.json`: 300/300 C departed, 0 bus–car threshold violations, 623/816 concurrent ticks, trips 14–15 at 11:10 |

Fingerprint = 11 zone staging points, vector routes, shuttle circuits, 38 connector provenance records, and every lane built during a C300 / 11 AM / 0.05 s / demand run, with 0 routing issues. Coordinates rounded to 1e-6.

Inert mutations, for the record: tail 140→150 and feeder edge 52→60 did not change outputs. The staging target is already south of both tails, and no route steps south in the 52–60 band. The migrated values are the current ones; these ranges are just not exercised.

## Review artifact
`research/layout-check/0944a8af20d6.svg` (source photo + overlay, amber = estimated, dashed = rule area, labels tagged `[runtime]`/`[advisory]`). Checked via a QuickLook PNG render: background and all three features present. QuickLook pads to a square thumbnail, so I did not confirm exact label placement in a browser.

## QWEN S0
QWEN's `research/runs/m3-layout-baseline/` did not exist when I started, so I captured my own pre-edit baseline before touching source (`paths-before-*.json`, `source-before.sha256`). When QWEN's capture lands, running it against the current tree is an independent cross-check; it cannot be a pre-edit capture any more.

## Limits
- No physical median, lane, stop line or position is drawn. The overlay only holds what code already assumed.
- `stage:c-throat` has no lower y bound at runtime, as before; the drawn top edge (y=0) is cosmetic.
- `oneway` supports `direction=north` only.
- Join tolerance 18 px is the manifest's value, not yet tried on real drawn lanes.
- Full suite not run (deprioritized).

## Next (needs SPARTAN acceptance first)
S3: draw the overlay in the Routes panel. Then the riskiest-assumption test: Commander draws one lane in LabelMe with the template; if it takes over ~15 minutes, switch to an in-app editor.
