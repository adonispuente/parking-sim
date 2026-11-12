# CLAUDYBEAR Lot A South 299/1150 — report (2026-11-07)
Status: KEPT as a stable revision pending SPARTAN independent review. No traffic gate moved, in either direction. The fix is LATENT: it removes a lock that only surfaced once the (rejected, parked) Corporate release unmasked it.

## Cause (production-built lanes, sharedTraffic chord rules)
- Forward: arrival 1150 held by the batch at its Main stop (1.7 back, px 198.4,86). Admitted departure 299 (px 208.4,101.7) has a look-ahead chord (210.4,102.3)->(217.7,92.3) that cuts inside its bend and passes 0.896 from 1150's nose, under CONFLICT_WIDTH 0.9. Real lanes are 0.94 apart. 299 yields to a car the gate is holding -> lock. All 26 Main-inbound arrival lanes: min 0.882 at 1.7.
- Reverse (the old aSouth TODO): an aSouth departure held 1.7 back sits on the admitted aSouth arrival path (gap 0).

## Change
`src/lotAControl.js`: `MAIN_DEPARTURE_HOLD_BACK = { aNorth: 3.0, aSouth: 3.2, aMain: 2.2 }` (was `{ aNorth: 3.0 }`). Uses the existing `mainHoldBack` stop-line mechanism; production attaches arrivals as `'aMain'` (campusSimulation.js:53, :142). No change to conflict width, windows, clearances, held-car rules, batch size or routes.
- aMain 2.2: forward min 0.979 (all 26 arrivals x both departures, departures slid over admitted path).
- aSouth 3.2: reverse min 0.956 over the FULL arrival lane. The window is narrow and measured, not copied from North: 3.0 -> 0.893 (near Main, eA lanes), 3.05-3.25 clear, 3.3 -> 0.894, 3.5 -> 0.699 (arrival final aisle d~139.9).
- Margins are thin (0.056 / 0.079 over 0.9). Provisional.

## Coverage
- New `tests/lot-a-south-held-chord.test.js` (5 tests): applied holds; no admitted departure yields to a held arrival; no admitted arrival yields to a held departure over the full lane; old 1.7 reproduces the lock; 3.0 and 3.5 both lock. The chord rules are copied from sharedTraffic.js (not exported) and must be kept in step.
- `tests/lot-a-main-held-departure.test.js`: arrival-stop test asserts 2.2 applied, base mainStopBack unchanged.
- `tests/lot-a-main-median.test.js`: held-arrival body/queue checks read the applied stop. The full-lane held-departure TODO now passes; it was left as TODO (not converted) for SPARTAN to decide.

## Results (all after the change)
| Check | Command | Result |
|---|---|---|
| Focused | `node --test` 5 Lot A files | 25 pass, 1 fail (retained badge-car failure), 1 todo |
| Full | `npm test` (exit 1, expected) | 164 pass, 28 fail, 1 todo; failing names IDENTICAL to retained 28 (`claudy-asouth-suite.failnames.txt` vs normalized `claudy-asouth-retained.failnames.norm.txt`) |
| Build | `npm run build` | exit 0, existing chunk warning |
| Traffic | `node research/spartan-continuation-traffic.mjs enabled` (exit 0) | byte-identical to `claudy-main-hold-back-traffic.jsonl` for nine/eleven/final in entered, stalls, west stalls, departures, occupancy, shuttle trips, first-16 stalls, issues and relief |

| Service | Cars in | Stalled | West | Departed a/b/c | Shuttle trips |
|---|---|---|---|---|---|
| Nine | 950/950 | 0 | 0 | 0/0/0 | 63,63,48,0,0 |
| Eleven | 231/1224 | 70 | 3 | 360/298/103 | 13,12,12,11,10 |
| Final | 300/300 | 0 | 0 | 360/487/377 | 63,62,62,61,41 |

Why identical: holds do occur (`claudy-asouth-hold-count.jsonl`, eleven: 55 aNorth, 31 aSouth, 33 aMain cars held; aMain holds start only at t=1275 s), but in the retained revision the Corporate #60/#61 loop decides the eleven outcome first, and the 299/1150 lock was only observed in the rejected Corporate run. So this repair is not exercised by the current gates. It is proven only by the chord-rule tests.

## Gate disposition
No regression, no improvement. Eleven west 2->3 remains a FAILED gate (unchanged; caused by Corporate control, not Main). Kept because it removes a measured lock that blocks the planned Corporate re-evaluation; revert with `research/claudy-backup-asouth/` if rejected.

## Files
Backup `claudy-backup-asouth/`; fingerprints `claudy-asouth-{before,after}.sha256` (74 -> 75; only lotAControl.js and the two Lot A tests differ, plus the new test); probes `claudy-asouth-{lock,stop-sweep,departure-back,departure-back-probe-full,hold-count}-probe*.mjs` and JSON/JSONL outputs; logs `claudy-asouth-{focused,suite,build}.log`, `claudy-asouth-traffic.jsonl`; plan `claudy-asouth-plan-2026-11-07.md`.

## Next, in order
1. Three-lane Feeder middle outbound lane (eleven west-exit queue).
2. Equity/C loop (887/1207/599).
3. Re-evaluate parked Corporate release on top of this revision; that run is the first one that can exercise the aSouth fix.
