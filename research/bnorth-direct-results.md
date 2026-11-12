# B North direct exit — CLAUD handback (2026-11-07)

Status: implemented, focused-tested, built, headless 11am compared. NOT browser-verified (SPARTAN owns that).
Code plan: research/bnorth-direct-code-plan.md. Diagnostics: research/runs/bnorth-claud/.

## Changed files
- src/parkingRoutes.js: new `B_NORTH_DIRECT` + `bNorthDirectExit()`; `zoneDepartureRoute` uses it
  only for zone bNorth + access bNorth, falling back to `bLoopExit` if a segment is not clear.
- tests/b-north-direct-exit.test.js (new, 4 tests).
Nothing else touched. Pre-existing uncommitted diff in parkingRoutes.js preserved.

## Why the launch point moved (the route could not be made direct from the old staging)
Parked cars are counts, not stalls; every departure launches at its zone's one staging point.
bNorth staging [580.7,328.3] = #7 vertex 36, the end of the arrival row tour in the west arm.
#25/#7 form one counter-clockwise loop and lot lanes are not keepRight-offset, so:
- QWEN's straight staging->[837,353]: 58 roof #43 hits. Invalid.
- Top-aisle routes (y 97/100/104): 0.09-0.44 px from opposing built traffic.
- Widest non-row-cutting route (maximin search): 1.37 px bottleneck to #7 at [792,224].
=> No clearance-safe direct route from that staging point. Departures now launch at the north rows.

## New route
#7 v18 [796.9,168.1] -> #7 v19 [821.8,115.0] (with the arrival flow) -> #11 start [844.9,120.1].
Arrivals turn west at v19, departures east. Provenance mode 'north-rows-direct', provisional.

| metric | before | after |
|---|---|---|
| bNorth->#11 internal leg | 927.0 px, maxY 575.8 | 82.2 px, maxY 168.1 |
| roof hits / outside #44 | 0 / 322 samples | 0 / 0 |
| min distance to #7 row sweep | 19.7 px | 45.3 px |
| min distance to #25 shuttle loop | 0 px (shares it) | 40.4 px |
Other B legs unchanged to 0.1 px (bWest:bNorth 86.6, bNorth:bPocket 205.6, bWest:bPocket 627.9,
bNorth:bSouth 741.7, bWest:bSouth 1164.0, bNorth:bBanana 604.0, bWest:bBanana 1026.3).

## Verification
- Focused (10 files): 72/73 pass; 1 = pre-existing C throat provenance failure (in SPARTAN baseline).
- Full suite: 250 tests, 223 pass, 27 fail; failing names identical to the legacy 27; 0 new.
- `npm run build`: pass (large-bundle warning only).
- 11am mixed, 2400 s, same runner both sides (research/runs/bnorth-claud/mixed-11am.mjs;
  "before" = temp copy of src with only my lead line reverted, deleted afterwards):
  departed b 370 -> 373 (a 302, c 88 unchanged); Lot A entered 548 -> 560;
  B launches by zone/exit identical (bNorth:bNorth 215, bNorth:bWest 28, bSouth:bWest 57,
  bBanana:bWest 74, bPocket 5/1); Clay prelaunch diversions 29 both; shuttle trips
  10,10,10,9,9 both; routing issues 0 both; stopped cars on v18->v19 stretch: 0 (max 0).
  My runner omits dwellSeconds, so its trips differ from SPARTAN's 10,10,10,10,9 baseline in
  both columns; compare columns with each other, not with his file.

## Limits
- The launch point is a model abstraction: it assumes north-bound B North cars park in the north
  rows. Not image-verified; B North cars parked deep in the west arm would really start farther away.
- Policy unchanged: section-based (bNorth/bPocket north, bSouth/bBanana west), Clay 5-car diversion,
  no per-car percentage.
- Routes overlay / browser rendering not checked. No preview server started.
