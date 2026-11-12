# B North direct exit — code plan (CLAUD, 2026-11-07)

## Measured cause (research/runs/bnorth-claud/*.mjs, live code)
- Parked cars have no stall positions. Every departure lane starts at its zone's single
  staging point (`campusSimulation.js` getLane -> `zoneDepartureRoute`). bNorth's staging
  [580.7,328.3] is #7 vertex 36, the END of the arrival row tour, deep in the west arm.
- B circulation (#25 shuttles, #7 arrivals) is one counter-clockwise loop: east along the
  bottom, north up the east spine, west across the top aisle, south down the west arm.
  From staging, the only with-flow route to #11 is the current 927 px loop (maxY 575.8).
- Lot lanes are NOT offset by keepRight (street polygons only), so a built lot lane is its
  raw trace.
- Direct routes from staging, measured:
  - QWEN's straight staging->[837,353]: 58 roof (#43) hits. Invalid.
  - Top aisle north edge (y 97/100/104): opposing traffic 0.09-0.44 px (built bNorth
    arrival in the west arm, #25 on the top aisle); also 9-30 samples outside zone #44.
  - Widest non-row-cutting path (maximin grid search): bottleneck 1.37 px to #7 at [792,224].
  => No clearance-safe direct route exists FROM the current staging point.

## Change (src/parkingRoutes.js only)
- New `B_NORTH_DIRECT` station: north-bound bNorth departures launch at #7 perimeter
  vertex 18 [796.9,168.1] (north rows, inside #44), ride WITH the arrival flow to vertex 19
  [821.8,115.0], then the existing derived join to #11 start [844.9,120.1].
  Measured: 82.2 px, 0 roof hits, 0 samples outside #44, 45.3 px from the row sweep,
  40.4 px from #25 at launch (v17 rejected: 6.9 px). Arrivals and departures share
  v18->v19 in the SAME direction and diverge at v19 (west vs east).
- Applies only to zone bNorth + access bNorth. bNorth->bWest (86.6 px), bPocket,
  bSouth, bBanana, arrivals, staging, section policy, Clay diversion: unchanged.
- Provenance entry mode 'north-rows-direct', source 7, provisional. It is a launch
  abstraction (cars parked in the north rows), not an image-verified lane.

## Tests: tests/b-north-direct-exit.test.js
Internal leg length < 200 px and maxY <= 380; starts at v18 inside #44; clears roofs;
>= 20 px from the row sweep; >= 12.5 px from #25; other B departure routes unchanged
vs the baseline lengths; section policy still sends bNorth/bPocket north.

## Risk to watch in the 11am run
Departures queued at #11 now spill back along v18->v19, the arrival lane into the north
rows. Measure blocked cars there.
