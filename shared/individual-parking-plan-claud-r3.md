# Individual reserved parking — plan revision 3 (CLAUD, 2026-11-11)

PLAN ONLY. Nothing here is released for implementation. Stage labels are not permission.
Each slice needs its own packet and its own SPARTAN release. CLAUD changed no src/, images/
or tests/ file.

Revision 3 answers SPARTAN review `ab11b28b` (8 findings) against r2 `f65342b4`
(`196ed3b6…`). Changes from r2 are marked **[r3]**. The S0 read-only packet is a separate
file: `handoffs/individual-parking-s0-packet-claud.md` (DRAFT, not released).

Baseline: post-A-South live acceptance `research/runs/asouth-activation-533b/results.md`
(artifact 78938546): 123 protected files (`live-capture.json`), 64 raw routes, exit 16 active,
C target [1036,162], cNorth staging [1035,176].
Inputs: QWEN survey (58f8c2f2) and QWEN post-move C refresh (cFirstNorth/cNorth nearest exit
start = exitpaths-21, 31.74 / 38.67 px straight-line; 42 second).

## Goal (Commander)
1. Each car gets an individual reserved parking location, not a section count.
2. Default: slot closest to the church (= Lot A building, answered) first.
3. A worker can direct placement when traffic flow requires it.
4. Cars park near where the drawn exit paths begin (all lots; lower priority than C +50 px, done).
Decorative scattering is not acceptable. Pavement alone does not establish a valid space.

## What the live code does today
- `src/parkingZones.js`: 11 zones, operational capacities totalling 1,584, "supplied by the
  parking team, not image-derived stalls". `chooseZone` picks a zone by priority/balance.
- `src/campusSimulation.js`: `zoneOccupancy`/`zoneReserved` integers only. Reserve at
  admission (l.233), un/re-reserve on redirect (l.184/200), occupy on arrival completion
  (l.252), free on departure launch (l.153). `parkedRecord` (l.19) carries `zone`, no position.
  **[r3]** Carry restore (l.47–59) lives in campusSimulation, not serviceCarry.js;
  serviceCarryOptions is the UI wrapper.
- Arrival lanes END at `ZONE_STAGING[zone]`; departure lanes generally START there
  (`parkingRoutes.js` l.354/438). **[r3] Exception (finding 8):** `bNorth`/access `bNorth`
  departures launch from `B_NORTH_DIRECT` (#7 vertices 18–19, `parkingRoutes.js:305–335,438–447`),
  an accepted provisional north-row abstraction with section-weighted access and both exits
  preserved. Every later slice keeps this exactly. #34 remains parked under its own packet.
- Rendering: `occupancyFill.js` area-fraction fill. No parked-car positions exist.
- `playbackFrames.js` FIELDS has `cars`, `zoneOccupancy`, `zoneReserved`; no parked set.
- **[r3] Geometry helpers are broad bounds (finding 1):** `avoidsObstacles` checks three roofs
  only; `onDrivable` covers whole lot polygons including grass/medians; `C_ZONE_PIECES` partitions
  Lot C without certifying asphalt. None of them proves a stall.

## Position
Slots are static, verified data generated offline from evidence in the map and frozen as a
catalog. Never computed at runtime, never scattered. Zone choice and all live road geometry stay
as accepted. Order: survey → catalog → bookkeeping with zero traffic change → display → worker
control → per-exit-start departures one exit at a time.

## Decision 1-3-1 (unchanged)
A bookkeeping + display first; B per-slot drive legs (rejected, ~1,584 conflicting lanes);
C per-exit-start launch groups later, one exit per packet. **A now, then C exit by exit.**

## Slices

### S0 — Stall feasibility (QWEN, READ-ONLY). Gate for everything.
Full instructions: `handoffs/individual-parking-s0-packet-claud.md`. **[r3]** changes vs r2:
- Evidence first (finding 1): permitted pavement from the Commander's medians-excluded polygons
  (index.json shapes 5, 6, 8, 11) for A/B; Lot C has none, so C uses a recorded image classifier
  tagged `image-classified`. Aisles only from built lanes, drawn exit paths, or rows traced from
  a saved crop. Everything else is unknown coverage.
- Whole oriented footprint sampled ≤1 px; access leg continuous; aisle corridor ≥ 5.45 px from
  its own aisle centreline; ≥ 10.89 px from every other live built route including shuttles and
  aisles' through-lanes. r2's aisle exemption is removed.
- Classification FITS / UNDETERMINED / SHORT. Only SHORT (verified + optimistic unknown ceiling
  < capacity) is a demonstrated shortfall and goes to the Commander. One failed packing is not.
- Byte identity (finding 2) by the 123-path content manifest plus hashes of every other input;
  git status supplemental only.

### S1 — Static slot catalog (QWEN implements, SPARTAN verifies). No engine import.
Needs its own packet after S0 shows FITS for the zones it covers.
- New `scripts/generate-parking-slots.mjs` → generated `src/parkingSlotData.js` + `src/parkingSlots.js`
  (`SLOTS`, `slotsByZone`, `SLOT_BY_ID`). Allowlist: those 3 + `tests/parking-slots.test.js`.
- Record: `{id, zone, lot, corners, heading, access, aisleRef, churchRank, exitStart:{id, aislePx}, evidence}`.
  **[r3]** `exitStart` uses aisle-graph reachability; the S1 packet names the graph source
  (S0 aisle inventory) and its provenance. Straight-line distance is not reachability.
- **[r3]** Generated-data check over a canonical payload digest stored outside the payload
  (no self-referential hash). Refresh the integrity manifest to 123 + new files on acceptance.
- Gates: tests, build, layout:check exit 0; 123 protected files and 64 routes exact; default
  service counters identical (nothing imports the catalog).

### S2 — Per-car slot reservation (implementer and allowlist set in its packet). Traffic unchanged.
**[r3] Allowlist (finding 6):** `src/campusSimulation.js` (lifecycle + carry restore validation),
`src/parkingSlots.js` (pure `chooseSlot`), `src/playbackFrames.js` (fields),
new `tests/parking-slot-lifecycle.test.js`, new `tests/parking-slot-identical-traffic.test.js`.
Nothing else, including serviceCarry.js, unless the packet names it.

**[r3] Transactional updates (finding 3):**
- Admission (l.233): `chooseSlot` is pure; commit `slotHolder[slot]=car.id` and `car.slot` in the
  same step the zone reservation commits. Zone full but no free slot = invariant violation → throw.
- Redirect (l.184–208): compute the new destination, build and check the route, pick the new
  slot — all without mutation. Commit release-old + hold-new only after the route succeeds. On no
  destination (l.186) or a route throw (l.189–208) the car keeps its original slot and the
  original zone reservation; state is unchanged.
- Arrival completion (l.252): slot kept; the car moves from reserved to parked.
- Departure launch (l.153): slot released in the same step occupancy decrements, only when the
  launch actually happens; a blocked departure keeps its slot.
- Initial state: build `slotHolder` from the FINAL vehicle set — initial staged list, or the
  carried list if carry replaces it (l.42–58). Initial holders never survive a replacement.
- Carry: `parkedRecord` adds `slot`. Restore rejects missing, duplicate, unknown, or wrong-zone
  slots and any car in a full zone; it never silently reassigns a valid carried slot.
- Determinism: slot choice consumes no RNG, no car-id sequence, no speed seed, no C exit parity
  ordinal (l.120, 231–232), and does not reorder `parkedVehicles`.

**[r3] Invariants asserted every step in the lifecycle test:** bijection, not counts — every
reserved or parked car owns exactly one slot in its own zone; every holder entry points to exactly
one such car; departing and exited cars own none; per zone, holders = occupancy + reserved.
Lifecycle cases: successful redirect, redirect with no destination, redirect route throw,
departure blocked vs launched, arrival completion, reset, carry valid and each invalid form.

**[r3] Identical-traffic oracle (finding 6):** the test replays the accepted 533b observer
(`research/runs/asouth-keepclear-bb64/observe.mjs`, sha256 `f1c0ba11…ec52`) with its exact
options: `initialOccupancy` from the preset, `badgePercent:5`, phase `arrival`,
`serviceOptions('eleven')`, `zonePreferences {a:<pref>,b:'auto',c:'auto'}`, shuttles as in the
observer, `step(.05,[18,18,0],lots)`, horizon 9000 s, for `pref=auto` and `pref=aSouth`.
Fresh baseline run first (must equal `live-default.json` b99925ea… / `live-south.json` 377ba4c2…).
Compare: `firstFreeze`, `maxMainNoProgress`, `maxWait`, `completedByZone`, `maxWaitByZone`,
`roadLanes`, `laneWaits`, `carWaits`, `upstreamMaxWait`, `gates`, and `end`
(`clock, departed, main, entered, exited, occupancy, routingIssues`), plus per-zone occupancy and
reserved counts sampled every 60 s and the car-id assignment sequence. The only permitted
difference is the added slot metadata. Two eleven-service runs do not prove carry or other
services; the lifecycle test covers those. No baseline-failure blanket waiver.

### S3 — Draw parked cars at their slots (packet later). M4 visual work.
**[r3] (finding 4):** holders include inbound reservations, so S3 draws OCCUPIED slots only.
S2 adds an explicit compact `parkedSlots` frame field (slotId → carId for parked cars), captured in
`playbackFrames.js`; no engine closures in frames. Tests: parked count and identity during
arrivals and departures, cached reverse playback, cold seek, forward reconstruction.
Rendered count == Σ zoneOccupancy. Commander visual approval required.

### S4 — Worker-directed placement (packet later). M5 groundwork.
**[r3] (finding 5):** NOT on the `zonePreferences` pattern. That input is in `replayInputs`
(`Scene.jsx:193–199,495–502`) and any change rebuilds the simulation and clears history
(`playback.js:61–69`), which would reassign parked cars. S4 uses a separate per-zone `fillMode`
recorded as a timestamped input event, applied at its event time on replay and only to picks made
after it. The S4 packet names the Scene.jsx / playback.js / UI / engine / frame wiring. If that is
judged too large, the alternative is restart-only fill mode, presented to the Commander as a
different (smaller) feature, not as live worker control.
Modes: `church` (default) | `deep-first` | `exit-near:<exitId>`.

### S5..Sn — Departures from exit starts, ONE EXIT PER PACKET (SPARTAN).
**[r3] (finding 7):** source display geometry stays exact. The BUILT driving lane is specified
per packet: its geometry, joins and any offset, each approved explicitly. Accepted #16: drawing
exact, built lanes offset ±6.2 px from the shared centreline (`aSouthCentreline.js`); kept as-is.
#34 is parked and is not an example. No offset without approval; no blanket activation.
Order: C north exit 21, then 42, then others by departure volume. B North keeps its direct start.
Gates as A South: separation ≥ 10.89 px, both services through 12:35, no new lock, waits < 300 s,
build/layout/browser/rewind, manifest integrity, "in traffic use" only on promotion.

## Preserved (every slice)
Median prohibition; A South split lanes and officer keep-clear; Lot C [1036,162] and its
south-then-east arrival; B North direct start; 64 route geometries until an S5 packet; zone
capacities; cleanup and #34 parked; no broad test cleanup.

## Riskiest assumptions and kill-tests
1. Capacities fit as real aisle-connected stalls (cFirstSouth 98 px²/space is the warning).
   Kill-test: S0. A zone classed SHORT goes to the Commander as one capacity decision.
   UNDETERMINED goes back to evidence, not to the Commander.
2. Slot bookkeeping has zero traffic effect. Kill-test: S2 identical-traffic oracle.
3. Exit-start launches add throughput without new locks. Kill-test: first S5 trial (C exit 21).

## Commander decision Q1 (answered 2026-11-11)
Church = **Lot A building** (bounding-box centre ~[269,295]). `churchRank` = straight-line pixel
distance from slot centre to nearest edge of that polygon. Within a zone only the order matters
(tie-break: slot id). Walking distance and shuttle-pickup ranking are not adopted.
