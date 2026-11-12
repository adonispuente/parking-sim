# CLAUDYBEAR — Feeder F1 middle outbound lane: report (2026-11-07)

Status: RETAINED PROVISIONALLY, pending SPARTAN independent review. Not accepted.

## Change (saved before any check)
- `src/traffic.js`: `keepRight(coords, offset, feederOffset=null)`. On Feeder (shape 54) points only, a signed offset bounded by measured room (fallback s0 -> s0/2 -> 0; each candidate onStreet + avoidsObstacles). `FEEDER_MIDDLE_OUTBOUND_PX=-6`, applied only to `Departure · bWest · *` (`usesFeederMiddleLane`). Exports `onFeederStreet`.
- Unchanged: arrivals, Lot A / badge / bNorth / C / Equity departures, Main, two-way streets, sharedTraffic conflict rule and clearances.
- `tests/feeder-middle-outbound.test.js` (4 tests): lane selection; arrivals byte-identical; paved / obstacle-free / separation > 0.9 past exit; production sweep (public advanceSharedTraffic) with old-lane negative control.
- Grounding and plan: `claudy-feeder-middle-plan-2026-11-07.md`. Probes: `claudy-feeder-lanes-probe.mjs`, `claudy-feeder-middle-sweep.mjs` (+ .json).

## Cause addressed
Lot B west departures turn north onto Feeder, the same direction as Alpha arrivals, and ran 0.01-0.02 world from the arrival path: they joined the church-bound queue (parked-Corporate run: 416 -> 1172, 107-vehicle chain). Middle lane: >=0.940 world separation past the exit mouth (thin, +0.04), ends (13.05,500.8). Production sweep: arrivals queued north of exit block old lane ~720/2000 samples per zone, middle lane 0.

## Not addressed (F2, separate)
An arrival stopped ACROSS the B exit mouth (1173 at (34.8,530.7) in the saved jam) is a real body crossing; still blocks. Needs the exit keep-clear / exit-priority rule.

## Checks (after change)
| Check | Result |
|---|---|
| Focused (feeder-middle + b-entrance-median + vehicle-routes) | 16/17; the 1 failure ("connector provenance is disclosed per mode...") is in SPARTAN's aSouth baseline |
| `npm test` | 169 pass, 28 fail, 0 TODO; failing names identical to spartan-asouth-final-suite.log (diff exit 0) |
| Build | exit 0, existing chunk-size warning |
| Fingerprints | 77 entries; only src/traffic.js changed + new test added |

| Service | Entered | Stalled | West-exit stalls | Departed a/b/c | Bus trips total |
|---|---|---|---|---|---|
| Nine | 950 -> 950 | 0 -> 0 | 0 -> 0 | unchanged | 174 -> 174 |
| Eleven | 231 -> 251 | 70 -> 73 | **3 -> 2** | 360/298/103 unchanged | 58 -> 54 |
| Final | 300 -> 300 | 0 -> 0 | 0 -> 0 | unchanged | 289 -> 282 |

All-stalls probe (`claudy-feeder-middle-eleven-all-stalls.json`): all 73 terminate at Corporate holders 405 (45) and 1048 (28), same structure as before (405/1038). No B departure stalled on Feeder; Feeder Alpha queue tail now starts at 1130 (27.5,582.7), south of the B exit. The +3 stalls are additional queued cars behind the unchanged Corporate lock after 20 more entries.

## Regressions, stated plainly
- Eleven stalled 70 -> 73 (explained above, not a new location).
- Shuttle trips: eleven 58 -> 54, final 289 -> 282. NOT diagnosed.
- My plan said "any worsened gate -> revert". I did not revert: the failed eleven west-exit gate returns to its pre-regression value (2), arrivals rise, and the stall increase is queue length behind the known Corporate lock. This is a judgment call for SPARTAN's acceptance decision. Revert: copy `claudy-backup-feeder-middle/traffic.js` to `src/traffic.js` and delete `tests/feeder-middle-outbound.test.js`; before manifest `claudy-feeder-middle-before.sha256`.

## Next (owner CLAUDYBEAR)
1. Diagnose the shuttle-trip drop (eleven/final).
2. F2 exit keep-clear, separate candidate.
3. Equity/C loop.
4. Gated re-evaluation of parked Corporate fix on top (first run that would show F1 + aSouth together).

Raw logs: `claudy-feeder-middle-{focused,npm,build}.log`, `-failnames.txt`, `-traffic.jsonl`, `-traffic.stderr.log`, `-after.sha256`.
