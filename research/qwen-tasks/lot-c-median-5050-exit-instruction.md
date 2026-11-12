# Lot C — median-separated entrance + 50/50 exit split (instruction for CLAUD)

Commander, 2026-11-07: "for lot Charlie entrance… there are 2 roads separated by a median
in the middle, so cars can enter and exit at the same time. Also, for exit, we make sure
that cars utilize both lot C exits, say 50/50."

You implement. QWEN wrote this packet so it is self-contained: read the cited files before
editing; every number below was extracted from the current code/source on 2026-11-07.

---

## 1. What exists today (verified in code)

- Positions: `src/clearImageSource.js:36` `CANONICAL_POSITIONS` — C entrance **#63 = px [982.35, 68.75]**,
  C exit **#64 = px [1247.16, 74.36]** (far-right NE corner).
- Entry traces: **#8/#9/#10** all end at #63 (`src/vectorRoutes.js:8-9` `cWest/eCWest/e2CWest =
  prefixTo(N, cEntrance)`). #8's actual inside endpoint is px `[976.38, 124.87]` — the current
  throat `C_ENTRANCE_JOIN` (`src/parkingRoutes.js:13-17`) connects #63 → that point, and
  `zoneArrivalRoute` (`parkingRoutes.js:301-304`) throws if a C arrival misses #63.
- **There is no median in the code.** C arrival and C departure both converge on the *same
  single point* at #63. Today, entry and exit at the C mouth share one access line, so a
  gate-held entering car and a departing car collide head-on there (exactly the defect the
  Lot A main median was created to fix).
- C departure selection: `src/campusSimulation.js:~3045`
  `if(car.target==='c') return 'cWest'; // Northeast exit 64 is shuttle-only.`
  and the `departurePolicy` setter hard-codes `c:'west'`. One exit is used for cars.
- The far-right exit trace exists and is wired: `src/vectorRoutes.js:23`
  `departure.cEast = routeAt(15)`; `ACCESS_THROATS` includes `cEast`. Trace **#15** starts
  px `[1239.70, 137.02]` (63.1 px from #64); trace **#13** (cWest) starts px `[995.29, 132.27]`
  (64.8 px from #63). So **cEast geometry already builds** — what is missing is (a) the median
  and (b) the selection policy that sends half the cars there.
- The median pattern to copy is already in this repo for Lot A: `A_MEDIAN` + `medianSide()`
  in `src/parkingRoutes.js:134-175`, with provenance recording and
  `tests/lot-a-main-median.test.js`. See §4 for what to mirror.

## 2. The two rules to implement

### Rule 1 — Median at the C entrance (enter and exit simultaneously)
Model the C mouth (#63 area) as **two roadways separated by a median nose**:
- **Entry roadway** = the stretch of trace #8 approaching #63 (ends `[976.38, 124.87]` →
  station `[982.35, 68.75]`). Arrivals keep their current side of travel.
- **Exit roadway** = the exit stretch leaving the mouth (trace #13's first segment starts
  `[995.29, 132.27]`, ~13 px NE of the entry end — this pair of near-parallel, offset lines
  is the two-road signature; confirm against `images/Clear Image.png` at the mouth before
  committing to a side split, and keep the result marked provisional in provenance if the
  painted median is not visually confirmable).
- Apply the `medianSide` technique at the C mouth: entry routes offset one lateral side,
  exit routes the other, with the nose point unshifted, ramp/hold/taper like Lot A, and a
  **`C_MEDIAN` config + `C_MEDIAN_PROVENANCE` array** (copy the Lot A structure verbatim:
  per-point pavement check, step-down factors, recorded stats, never silent).
- The staffed C entrance person stays at #63; both roadways must still pass it
  (keep the `distance(road.at(-1), pointAt(63)) > .001` guard working on the entry side).
- Priority rule unchanged: occupied-road clearance first, shuttles highest priority
  (`SHUTTLE_ACCESS.c.departure` still `pointAt(64)` — the far-right exit, untouched).

### Rule 2 — 50/50 split of CAR departures across both C exits
- Change `departureAccess` in `src/campusSimulation.js` for `target==='c'` (non-badge) to
  return **`cWest` (median-mouth exit, #13) or `cEast` (far-right NE exit, #15) 50/50**.
- Make the ratio configurable: add `c` to `departurePolicy` as `'west' | 'east' | 'split'`
  (default **`'split'`**) and stop the setter from hard-coding `c:'west'`. In split mode use
  a **deterministic** assignment (car sequence parity or alternating by launch order) so a
  20-car cohort lands 10/10 and replay/rewind stays deterministic.
- **Shuttles are NOT part of the 50/50.** `SHUTTLE_ACCESS.c.departure` keeps #64; the
  #64 shuttle-release hold in `northernCorporateControl.js` (hold conflicting Corporate
  traffic, let admitted traffic clear, release after the bus's tail) stays as-is. The
  commander's 50/50 supersedes the older "far-right exit is shuttle-only for cars" note for
  **cars only** — the two rules coexist: shuttles always use #64; cars split.
- Verify both built C departure lanes (from every C zone staging point via
  `zoneDepartureRoute`) pass the C mouth/entrance area without crossing the entry roadway —
  the cWest join (`parkingRoutes.js:301-304`) is obstacle-checked but derived; cEast from
  every zone is new ground, so run it for all four zones (cFirstNorth/cFirstSouth/cNorth/cSouth).

## 3. Tests that will collide with the new rule — update deliberately, not silently
- `tests/eleven-performance.test.js:55-56` — asserts **every** departing C car has access
  `cWest` ("far-right northern C exit is shuttle-only"). Update the comment to the 2026-11-07
  rule and assert the split (e.g. both exits used, ratio within tolerance).
- `tests/northern-radio.test.js:63` — `every(c => c.fleetBus || c.access==='cWest')`. Same update.
- `tests/charlie-staffed-entry.test.js` — entry-side only; should keep passing untouched
  (entry rule unchanged).
- `tests/arrival-controls.test.js:21,43,52` and `service-arrival-policy.test.js:24` —
  arrival-side; keep passing.
- `tests/shuttles.test.js:65` — departing accesses include `cWest`; if it pins an exact set,
  extend it for `cEast` in split mode.
- `tests/sunday-services.test.js:54` — arrival key map only; keep passing.
- Add **`tests/c-entrance-median.test.js`** mirroring `tests/lot-a-main-median.test.js`:
  held C arrival body vs departing C car on built lanes ≥ CONFLICT_WIDTH; provenance records
  every step-down; no silently reduced offset; both exit lanes clear the entry roadway.

## 4. Verification gate (run all, report exact results)
1. `node --test tests/c-entrance-median.test.js tests/charlie-staffed-entry.test.js
   tests/eleven-performance.test.js tests/northern-radio.test.js
   tests/arrival-controls.test.js tests/shuttles.test.js tests/sunday-services.test.js
   tests/service-arrival-policy.test.js tests/equity-routing.test.js`
2. `npm run build`
3. Browser on the live preview at 11 a.m., 30x, 10+ min: confirm a C departure cohort
   visually splits ~50/50 across the median mouth and the far-right exit, entering cars keep
   flowing the whole time, and shuttles still exit via #64 with the Corporate hold firing.
   Report actual counts, not "it looks fine".

## 5. Do NOT change
- Source-of-truth binding (`EverythingClearImage.json`, 65 shapes, `clearImageSource.js:25-32`).
- The B-lot departure logic (`bWest`/`bNorth` split, `B_LOOP` exits) — unrelated.
- Lot A main median, feeder officer, or corporate operators.
- Do not delete trace #15/#16 evidence or the shuttle circuit (#30/#28/#29).

## 6. Open items to confirm with the Commander (flag in your report, do not guess)
1. The 50/50 ratio: implemented as a configurable `departurePolicy.c='split'` defaulting to
   even parity — confirm that is what was meant by "say 50/50".
2. Cars using the far-right exit now means **cars and shuttles share that exit roadway in
   real life** — confirm, or tell us the bus and cars use separate lanes there (changes how
   the cEast lane offsets at #64).
3. If the painted median at the C mouth is not visible in the Clear Image, the split is a
   model parameter (provisional, provenance-recorded) like Lot A's — acceptable?
