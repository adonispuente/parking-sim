# Stage 1R-b feasibility, revision 2: A South departure lane vs arrival #0 (CLAUD, 2026-11-11)

Supersedes `asouth-1r-b-feasibility-claud.md` (artifact 682d5729), whose Option A is now rejected.
Read-only: nothing in src/, images/ or tests/ was written. Scripts and outputs are in
`research/runs/asouth-1r-b-feasibility-claud/`: `geo`, `corridor2`, `inner2`, `join`, `paveband`, `png` (.mjs) and their `.out.txt` files.

## Commander answer (2026-11-11)
"If you mean the two large rows in lot A south, that's grass + median. Cars can't go over that, but cars can go down the loop and make a U-Turn. A good example is currently how cars enter into lot A south, they pass main position, go down, make a U-turn, and get to the end of the row."

Result: the interior "nested loop" (old Option A) runs over the median and is invalid. `drivableAllowed` marks that median as drivable, so mask-based room figures on this loop overstate the space. Revision 2 reads pavement from `images/Clear Image.png` pixels instead.

## Answer to SPARTAN's question
**No. A departure lane at least 10.89 px from arrival #0 along its whole length is not feasible on real pavement while arrival #0's built lane is unchanged and no new crossing policy is added.**

Evidence (`paveband.out.txt`): 107 samples taken every 5 px along arrival #0 from the Main side to staging, segments 6–19. At each sample, the paved run is measured perpendicular to the arrival on both sides.
- **Inner side (toward the middle median):** below 10.89 px at 15 samples. The worst stretch is the west leg at x≈72–77, y≈245–292, with 6.5–9.5 px. A second lane there would sit on the median.
- **Outer side (toward the tree rows and building):** below 10.89 px at 8 samples: [212,117], [209,121], [170–176,175–183], [95,207], [118,170] and [72,267]. These fall 0.4–2.4 px short. Even where the outer side passes, the departure centreline lies at the edge of the pavement with no room for the car body.
- **Switching sides is not possible:** arrivals and departures run opposite ways around the same loop, so a lane that changes from inner to outer must cross arrival #0. That is the crossing policy the spec excludes.
- **Total paved width around arrival #0:** median 35.5 px, minimum 17.5 px (excluding one 11 px tree-shadow artifact at [176,175]). The aisle is wide enough for two lanes 10.89 px apart. It is not wide enough when one of them stays fixed at the centre of the aisle, which is where arrival #0 is drawn.

Pixel caveat: tree shadow on pavement is classed as non-pavement. That understates room under trees; the [176,175] value of 2 px is one such artifact. The west-leg inner shortfall (y 245–292) is consistent over 10 samples and matches the median in the image.

The earlier mask finding still holds: exit 16 crosses arrival #0 11 times, and every exit segment from v0 to v14 is within 10.89 px of it. The shared stretch is the whole loop, not v6–v13.

## Root cause
The 1R-b spec required separation on one side while keeping arrival #0 exactly where it is. In this aisle the Commander drew both directions along the aisle centreline, so two side-by-side lanes need **both** built lanes offset from the centre, about 5.5 px each way. Lot A North already uses this pattern near Main (`A_MEDIAN` inPx 2 / outPx 10). The 10.89 px figure is `CONFLICT_WIDTH .9` in world units, a provisional model parameter, not a surveyed lane width. It is not being relaxed.

## Options (Commander decision; nothing released)
| Option | What changes | Separation | Risk |
|---|---|---|---|
| **1. Split both built lanes across the aisle** | Built arrival #0 shifts about 5.5 px toward one edge and departures about 5.5 px toward the other, around the whole loop. Drawn traces and overlay stay exact. | 10.89 px or more is geometrically available everywhere measured (minimum width 17.5 px). At the narrowest point, each centreline is about 3 px from the pavement edge. | Changes every A South arrival's built path. Touches the Main approach and the open South-first gridlock area. |
| 2. Exit 16 exact, plus a directional hold | Departures wait while A South arrivals are on the loop. | 0 px; conflicts are managed by policy. | New policy, and the same lock family as the open South-first defect. |
| 3. Commander redraws one trace along an aisle edge | New drawing; this scan is re-run. | Depends on the drawing. | Costs the Commander's time. Same geometry limit unless the other trace also moves. |

**Recommendation: Option 1.** It is the only option that honours "two lanes side by side" without a new traffic policy or new drawing. It also follows the existing A North pattern.
- Kill-test 1 (before any trial): SPARTAN measures both built lanes with the real pavement band. Required: separation of at least 10.89 px over the whole loop, and both centrelines on pavement at every sample.
- Kill-test 2: SPARTAN's isolated trial under the existing 1R-b table (default and South-first runs of at least 9000 s, tests, browser, integrity), including the 1R-a guard. All of it is promoted together or not at all.

## Held
No instructions released. The median-crossing route stays live. Exit 16 is inactive. The 1R-a guard is unpromoted. Cleanup stays parked. Implementation instructions for Option 1 follow only after the Commander approves shifting the built arrival lane.
