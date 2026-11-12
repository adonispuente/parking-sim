# CLAUDYBEAR Corporate #60/#61 own-occupant release — report
Status: REJECTED and REVERTED. Source matches SPARTAN-verified Main-setback manifest (research/claudy-main-hold-back-after.sha256). Candidate parked in research/claudy-corporate-occupant-parked/.

## Diagnosis (all 70 eleven stalls, research/claudy-eleven-all-stalls.json)
Every stall chains to two terminals: departure 405 (44) and arrival 1038 (26). Cycle, timeline in research/claudy-corporate-cycle-timeline-probe.mjs:
- 1513.1 s: #60 admits shuttle-5 (cNorth leg 1) northeast at d=4, ~120 px before #60.
- ~1515 s: arrival 1038 reaches its #60 stop; #60 holds it, "higher class waiting at other end" (405, class 3, at #61).
- shuttle-5 reaches 1038's held body and yields clear-occupied-conflict, stopping inside the stretch.
- #61 cannot admit 405 while shuttle-5 occupies the stretch.
Cycle: 405 -> shuttle-5 -> 1038 -> #60 priority rule -> 405.

## Candidate
src/corporateDriveOperators.js ~line 133: skip the "higher class at other end" hold when an admitted occupant in the operator's own direction is yieldingTo its head car. Opposing-occupant check unchanged and first. +3 tests in tests/corporate-drive-operators.test.js. Saved before tests.

## Results (post-change, same map, enabled)
Focused 12/12. npm 162/28/1 TODO, failing names identical to spartan-main-setback-suite.log. Build 0.
| Service | Entered | Stalled | West | Departed a/b/c |
|---|---|---|---|---|
| nine | 950->950 | 0->0 | 0->0 | same |
| eleven | 231->258 | 70->150 | 3->7 | 360/298/103 -> 244/327/81 |
| final | 300->300 | 0->0 | 0->0 | same |
Corporate cycle gone (0 corridor-valve stalls) but freed flow hits three locks it was masking (research/claudy-eleven-all-stalls-after-occupant.json):
1. Lot A South batch: departure 299 yields to arrival 1150 held by Main five-car batch (68 vehicles) — the aSouth TODO.
2. Equity/C cycle 887 -> 1207 -> 599 -> 887 (40 vehicles).
3. West exit: Lot A arrival queue reaches down Feeder past B exit; B departures (416 at 68.9,525) yield to arrival 1172 (37) — the three-lane Feeder middle-outbound case.

## Next, in order
1. Lot A South held-departure clearance (same mechanism as the aNorth setback; departure stops too close to the admitted arrival path).
2. Three-lane Feeder middle outbound lane so B departures bypass the Alpha queue.
3. Equity/C 887/1207/599 cycle.
4. Re-apply the parked Corporate release only after 1-2; it is correct for its own cycle.
