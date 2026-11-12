# CLAUDYBEAR Main held-departure setback — report (run 2888e0f0)
Status: KEPT, pending SPARTAN independent review. One sub-gate failed (eleven west-exit stalls 2 -> 3); see disposition.

## Cause
The admitted aNorth arrival (965 eleven / 1248 final) yielded `clear-occupied-conflict` to departure 179 / 209, which the five-car batch held 1.7 world before Main on `Departure · a · aNorth`. The held car's nose sat 0.505 world from the admitted car's post-Main path (conflict width 0.9). Gate waited on 965, 965 waited on 179, 179 waited on the gate.
Evidence: `claudy-main-lock-probe.mjs` -> `claudy-main-lock-probe-eleven.json`; `claudy-main-stop-clearance-probe.mjs` -> `.log`.

## Change
- `src/lotAControl.js`: `MAIN_DEPARTURE_HOLD_BACK = { aNorth: 3.0 }`, `mainHoldBack(points, approach)`; `attachMainPositionToLane` applies it to `stopDistance`. `mainStopBack`, fold flag, merge/release, batch size, conflict detection and clearances unchanged. Arrival stops unchanged.
- `tests/lot-a-main-held-departure.test.js` (new, 4 tests). `tests/lot-a-main-median.test.js`: held-departure helper uses the applied stop; the TODO now reports only the aSouth shared-aisle case (0 aNorth entries).

## Verification (after the saved change)
| Check | Result |
|---|---|
| Focused (held-departure, median, position) | 18 pass, 0 fail, 1 TODO |
| `npm test` | 159 pass, 28 fail, 1 TODO; failing names identical to `spartan-continuation-connectors-suite.log` |
| Build | exit 0 |

Same-map traffic (`spartan-continuation-traffic.mjs enabled`) vs restored owner baseline `spartan-continuation-connectors-traffic.jsonl`:
| Service | Entered | Stalled | West stalls | Departed a/b/c | Shuttle trips |
|---|---|---|---|---|---|
| Nine | 950 -> 950 | 0 -> 0 | 0 -> 0 | unchanged | unchanged |
| Eleven | 119 -> **231** | 94 -> **70** | 2 -> **3** | 213/290/103 -> 360/298/103 | 12,12,12,11,9 -> 13,12,12,11,10 |
| Final | 81 -> **300/300** | 102 -> **0** | 8 -> **0** | 232/322/377 -> 360/487/377 | 16,15,15,15,11 -> 63,62,62,61,41 |

## Gate disposition
- Main lock: gone in final; none of eleven's 16 logged stalls are Main batch or aNorth (script logs only 16 of 70).
- **Failed sub-gate:** eleven west-exit stalls 2 -> 3. Lead west stall is departure 405 (`Departure · bWest · bSouth`, px 537,353) held by `corporate-drive-valve`. Not at Main. Kept rather than reverted because every other metric improved sharply and reverting restores the diagnosed lock. Revert path: `research/claudy-backup-main-hold-back/`.

## Files
Backup `claudy-backup-main-hold-back/`; hashes `claudy-main-hold-back-{before,after}.sha256` (73 -> 74 files; only the three files above differ); logs `claudy-main-hold-back-{focused,suite,build}.log`, `claudy-main-hold-back-traffic.jsonl`, fail-name lists `*.failnames.txt`; plan `claudy-main-hold-back-plan-2026-11-06.md`.

## Next
1. Eleven: diagnose remaining 70 stalls (Corporate valve 405 / shuttles at 534,312; `clear-occupied-conflict` with shuttle-5 near 220,554). Extend the traffic script past 16 stalled entries.
2. aSouth departure shared-aisle hold (TODO, 0.013 world).
3. Then re-evaluate parked #59 reach, then three-lane Feeder middle lane.
