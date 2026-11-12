# Stage 1R-c: Lot A South split lanes (CLAUD, 2026-11-11). Isolated trial released to SPARTAN.

Replaces Stage 1R-b (`asouth-1r-b-lane-spec-claud.md`, artifact 211ead54). That spec is infeasible: see `handoffs/asouth-1r-b-feasibility-claud-r2.md` (sha256 be73123b…74c09d, artifact 7ea8982a).

## Commander decisions (2026-11-11)
- "Yes, two lanes side by side."
- The loop interior is "grass + median. Cars can't go over that", but cars "go down the loop and make a U-Turn".
- "Yes, shift both lanes apart." This covers moving the **built** arrival #0 lane as well as the departure lane.

## Scope
- **Arrivals:** the built A South arrival lane (arrival #0, staging-bound) shifts toward the **inner** side, toward the middle median.
- **Departures:** the built A South departure lane following exitpaths-16 shifts toward the **outer** side, toward the tree rows and building. This keeps right-hand traffic consistent around the whole loop, with no side change and no crossing.
- **Unchanged:**
  - drawn traces: `images/EverythingClearImage.json`, `images/ExitPathsAndC.json`, `src/exitPathSource.js` and the off-white overlay;
  - the other 62 routes;
  - the C work.
- **Provenance:** record the split in `CONNECTOR_PROVENANCE` and `A_MEDIAN_PROVENANCE` style entries, with `mode:'lane-split'`, `provisional:true` and `source:'Commander 2026-11-11: shift both lanes apart'`.

## Method
1. **Re-hash live files first.** The baseline is the post-Lot-C accepted state. You are the sole writer; work in a fresh isolated copy.
2. **Offsets.** Use named constants following the `A_MEDIAN` pattern, with no hand-placed coordinate literals:
   - `inPx` for the arrival, `outPx` for the departure;
   - built separation `inPx + outPx` must be at least 10.89 (target 12);
   - starting point: `inPx 4.5`, `outPx 7.5`.
   You may rebalance the split per stretch only if the pavement band requires it. Record any rebalancing.
3. **Composition with A_MEDIAN.** Near Main, compose with the existing `A_MEDIAN` shift; do not double-apply it. Arrival #0 already gets `inPx 2` there. Taper over existing vertices, and check every taper segment with `clearSegment(a,b)` and `clearSegment(a,b,drivableAllowed)`.
4. **Terminals.** The staging end (arrival end and departure start, gap 0) and the Main pass are inherent terminals under the existing staging and Main-gate arbitration. Taper in and out of them. Do not add new policy.
5. **The departure ends at Main via exit 16's order.** No direct chord. The ~[164,88]→[204,100] median crossing must not appear in any built A South route.

## Pavement gate, measured before the traffic runs
`drivableAllowed` counts the middle median as drivable on this loop, so it is not sufficient here. Use `research/runs/asouth-1r-b-feasibility-claud/png.mjs` and `paveband.mjs` (reading `images/Clear Image.png` pixels), adapted to sample the **built** lanes:
- Built arrival vs built departure: minimum separation at least 10.89 px over the whole loop, excluding only the two terminal tapers. Report the worst pair.
- Every built-lane sample sits on image pavement with at least 2 px of pavement on each side.
- Shadow artifacts:
  - Report any failing sample with an image crop.
  - A failure under tree shadow may be overruled only with a crop that shows pavement. Record each overrule.
- If the gate fails after one rebalance attempt: **STOP**. Report per-sample values. Do not narrow 10.89, and do not move lanes onto the median.

## Kill-tests (all must pass; 1R-a guard and 1R-c are promoted together or not at all)
| Check | Pass condition |
|---|---|
| Pavement gate | As above |
| Geometry | All tapers and joins pass both clear checks. `npm run layout:check` exits 0. |
| Default 11:00 | Run of at least 9000 s with no freeze. Report max wait against baseline 31 s and guard-only 50 s. End A/B/C counters not below baseline; C departures not below 378. |
| South-first | Run of at least 9000 s, no worse than the open defect (frozen from 2030 s, departure 251 waiting on arrival 1000). Any NEW lock location fails the trial. A lock only at the old site is reported as the existing defect, not as acceptance. |
| Tests | Exit catalog/display 39/39. Feeder-officer tests plus the exit-room unit test. Narrow Lot A set including `lot-a-main-median`. Lot C 25/25. `npm run build` exits 0. |
| Browser | Top view: two visibly separate lanes around the loop, with the drawn exit 16 and arrival lines unchanged. Rewind once. |
| Integrity | Only the permitted files change: `src/parkingRoutes.js` and test files, if a new unit test is needed. The other 62 routes are byte-identical in built output. |

## On promotion only
- The median-crossing chord is gone from live A South departures.
- `ACTIVATED_EXIT_IDS` gains exit 16 only, and exit 16 is marked "in traffic use".

## On failure
Do not promote. Hand back the failing check, clock and car positions. CLAUD diagnoses next. Cleanup stays parked throughout.
