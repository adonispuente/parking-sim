# CLAUDYBEAR — Equity entrance/exit 2 two-way connector: REJECTED, reverted (2026-11-07)

Status: REJECTED. src/traffic.js restored from research/claudy-backup-equity-exit2/; `shasum -a 256 -c research/claudy-equity-exit2-before.sha256` -> 0 mismatches (84 entries). Live revision = SPARTAN-verified aSouth + my F1 (unchanged by this run).

## Change tried (saved before checks)
- src/traffic.js keepRight: box EQUITY_EXIT2_CONNECTOR x1018-1048, y1076-1112 treated as two-way pavement (9 px offset), per Commander "Yes, two-way width". Box width 30 px was an assumption (no map polygon).
- tests/equity-exit2-two-way.test.js (9 tests incl. raw head-on control).
- Both parked in research/claudy-equity-exit2-parked/.

## Results
| Check | Result |
|---|---|
| Focused | 9/9 |
| npm test | 178 pass / 28 fail / 0 todo; failing names identical to claudy-feeder-middle-failnames.txt |
| Build | exit 0 |

| Service | F1 retained | With connector |
|---|---|---|
| Nine | 950/950, 0, west 0, trips 174 | identical |
| Eleven | 251, stalled 73, west 2, trips 54 | 251, 73, **west 3**, 54 |
| Final | 300/300, 0, west 0, B dep 487, trips 282 | **299/300, 76 stalled, west 6, B dep 409, trips 103** |

## Why rejected
Final service regressed from clean to 76 stalled. All-stalls probe (`claudy-equity-exit2-final-all-stalls.json`): 48 behind departure 455 `Departure · bWest · bBanana` (537,355.5) and 26 behind arrival 1432 `Arrival · bWest · bSouth` (306.4,548.7), both held by **corporate-drive-valve** with no yield target. Shuttle-4 and 410 queue behind 455. So the driveway fix itself is geometrically sound (focused tests), but letting Equity/C traffic flow changes timing so the Corporate valve wedges Lot B both ways.
Eleven unchanged in volume: in the retained revision the Corporate 405 loop jams eleven before Equity/C traffic matters (as in the aSouth case).

## Conclusion / next
The Corporate Drive control (#60/#61 + valve) is now the binding constraint in every service. It must be fixed before Equity/C, F2, or diversion can be measured honestly.
1. Diagnose the corporate-drive-valve hold on 455/1432 (why the valve holds both directions with no occupant).
2. Re-evaluate the parked Corporate own-occupant release together with the valve fix.
3. Then re-apply the parked Equity exit 2 connector (gated) and re-measure.

Raw: claudy-equity-exit2-{focused,npm,build}.log, -failnames.txt, -traffic.jsonl, -traffic.stderr.log, -final-all-stalls.json, -final-stalls.log, -before.sha256.
