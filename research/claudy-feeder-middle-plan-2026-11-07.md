# CLAUDYBEAR — three-lane Feeder middle outbound: grounding and plan (2026-11-07)

Requirement (Commander, 2026-11-06): Feeder has three lanes; exiting cars can use the middle lane and avoid the church-bound queue.

## Grounding (read-only probes, no src change)
- `research/claudy-feeder-lanes-probe.mjs` -> `claudy-feeder-lanes-probe.json`: on current src, every Lot B west departure (bSouth/bBanana/bNorth/bPocket) runs 0.1-2.8 px from the Alpha arrival path on Feeder (conflict width 0.9 world = 10.9 px). Feeder (shape 54) is the vertical road x~2-50 px. Arrivals enter south (y~1110) and drive north; B west departures leave Lot B west at y~531, turn NORTH and end at (24.4,497). Same direction, same lane: they join the arrival queue.
- Jam evidence (`claudy-eleven-all-stalls-after-occupant.json`, parked Corporate run): B departure 416 (68.9,525) clear-occupied-conflict -> arrival 1172 (26.7,499.9); 107 vehicles in that chain. Queue around the exit: 1171 (26.3,468.3), 1172 (26.7,499.9), **1173 (34.8,530.7) in the B exit mouth**, 1174 (33.6,562.2).
- Current (retained) revision does not reach this jam: eleven's 70 stalls end at 405/1038 (Corporate). Traffic runs are not expected to show this slice.

## Candidate F1 (this change) — middle lane geometry only
- `src/traffic.js`: `keepRight(coords, offset, feederOffset=null)`; on Feeder points only, a signed offset bounded by measured room, fallback s0 -> s0/2 -> 0, each candidate must be onStreet and avoidsObstacles. `FEEDER_MIDDLE_OUTBOUND_PX = -6` (mirror of arrivals' +6). Applied only to lanes named `Departure · bWest · *` (`usesFeederMiddleLane`).
- Unchanged: all arrivals, Lot A/badge/bNorth/C/Equity departures, Main, two-way 9 px streets, sharedTraffic conflict rule and clearances.
- Measured (`research/claudy-feeder-middle-sweep.mjs` -> `.json`): middle lane ends (13.05,500.8); 0 off-street / 0 obstacle samples; separation past the exit mouth (trace y<=515) >= 0.940 world (thin: +0.04 over 0.9); y<=510 0.987, y<=505 1.079.
- Production sweep (public advanceSharedTraffic, stationary queued arrival): arrivals queued north of the exit (y<=500, the 1172 case) block the old lane ~720 of ~2000 samples per zone, the middle lane 0. Arrivals stopped at y 502-528 (across the exit mouth) still block both: a real body crossing, not a sampling artifact.
- Coverage: `tests/feeder-middle-outbound.test.js` (selection, arrivals unchanged, paved/obstacle-free/separated, production sweep with old-lane negative control).

## Candidate F2 (next, separate) — exit keep-clear / exit priority
Commander: the Feeder/Corporate officer prioritizes people exiting. An arrival stopped across the B exit mouth (1173) blocks the crossing even with F1. F2: Feeder arrivals do not come to rest with their body inside the B exit crossing interval unless their whole body fits beyond it. Ground the interval from the built lanes. Separate implementation, coverage and gates; not combined with parked Corporate/diversion.

## Gates for F1
Focused test; full suite with exact 28-name comparison against SPARTAN's final (165 pass / 28 fail / 0 TODO, +4 new tests expected); build; nine/eleven/final same-map traffic vs saved (950/0/0; 231/70/3; 300/0/0). Any worsened gate -> revert from `research/claudy-backup-feeder-middle/`. Before-manifest `research/claudy-feeder-middle-before.sha256` (76 entries).
