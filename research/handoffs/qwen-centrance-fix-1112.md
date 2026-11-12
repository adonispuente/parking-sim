# QWEN execution packet: Lot C entrance keep-clear fix (CLAUD plan, 2026-11-12)

Owner: QWEN executes all edits, runs and gates. CLAUD planned only and edited no source.
Commander rule (verbatim intent): the Lot C entrance position (#63, `cEntrance`) handles the 3 traffic flows (4 in an emergency). It stops cars **before** they can reach a spot that blocks another path, so the entrance and exit stay clear and buses can get back to church even when the C North / west-side exit is gridlocked.

## 1. The defect (already diagnosed, do not re-diagnose)
- Source: `~/.starnet/.../handoffs/c-shuttle-remedy-claud-2af1/deadlock-diagnosis.md` (CLAUD workspace) and SPARTAN 44a7 rejection in `research/PROGRESS-CHECKPOINT.md` line 7.
- With the original three C pickups restored, a 3-way interlock forms at the Equity entrance crossing, world about (81.2, 5.6):
  - shuttle-5 `Shuttle · cSouth · leg 3 → home`
  - arrival 1009 `Arrival · Equity entrance/exit 2 → C staffed entrance · cFirstNorth`
  - departure 573 `Departure · bNorth`
- The `sharedTraffic.js` cycle breaker releases each in turn until all three bodies sit in each other's paths. Bus stationary 940 s, 7 trips vs 12 baseline at 3000 s (random dwell, eleven, fixed dispatch).
- It is an admission defect, not geometry. Fix = the C entrance person does not admit a vehicle into the crossing unless its way out is clear, and conflicting movements enter one at a time.

## 2. A working candidate already exists. Use it; do not write a new one.
| Copy | What it is |
|---|---|
| live: `/Users/adonispuente/Desktop/Developer/parking-sim` | relocated stops (current) |
| `/tmp/cshuttle-claud-2af1/proj` | live + original-stop remedy. `diff -rq live/src 2af1/src` = only `src/cShuttleLoop.js`, `src/shuttleRoutes.js` (CLAUD checked 2026-11-12) |
| `/tmp/cshuttle-claud-kc/proj` | 2af1 + keep-clear box. Adds `src/keepClearBox.js` (124 lines), `tests/c-shuttle-keep-clear.test.js` (50 lines); edits `src/sharedTraffic.js` (4 lines: stopDistance, winner-skip, cycle-breaker candidate filter, yieldReason) and `src/campusSimulation.js` (import, attach, `prepareKeepClearBox()` after `prepareNorthernCorporateControl()`) |

Trial evidence already on disk (`/tmp/claud-diag/`, scripts `allwait.mjs`, `sweep.mjs`):
| Run (eleven, fixed, C bus = shuttle-5) | trips at 3000 s | worst wait |
|---|---|---|
| live baseline, random dwell | 12 | 5 s |
| 2af1 (no box), random | **7** | **940 s lock** |
| kc (box), random | 11 | 3 s |
| live baseline, 60 s dwell | 10 | 1 s |
| kc, 60 s dwell | 9 | 3 s |
At 9000 s: kc random = 30 C trips, kc 60 s = 27; 2af1 locked 6,940 s. **Open concern:** kc 9000 s worst shuttle wait 131-138 s at cNorth leg 1-2, world (80.4-81.7, 14.7-15.4), and departure 1019 `cEast · cFirstSouth` 275 s at (81.9, 17.6). That is north of the crossing, not the original lock. `kc-newtests.log` is EMPTY: the new test was never shown to pass. Treat the candidate as unverified.

## 3. Steps (in order; stop and report at any STOP)
0. **Fresh baseline on live (read-only).** Record sha256 of every file in `src/` and `tests/`. Run `npm test` (save totals + exact failing names), `npm run build` (exit code). Run `node /tmp/claud-diag/allwait.mjs <live-root> random 3000 eleven`, same with `60`, then both at `9000`. Do not trust older counts (245/9, 367/16); the tree has moved.
1. **Staleness check.** `diff -rq live/src /tmp/cshuttle-claud-2af1/proj/src` and same for `tests/`. Expected src diff = the 2 stop files only. If ANY other file differs, the /tmp copies are stale: **STOP**, do not copy whole files; report the list.
2. **Position check.** Confirm the box is the C entrance spot: `pointAt(63)` × `WORLD_SCALE` (both in `src/clearImageSource.js`) should land within ~4 units of box centre (81.2, 5.6). If it is farther, **STOP** and report the distance; the box may belong to a different position.
3. **Backup.** Copy the 6 files that will change (`cShuttleLoop.js`, `shuttleRoutes.js`, `sharedTraffic.js`, `campusSimulation.js`, `positions/index.js`, plus note the 2 new files) to `research/runs/qwen-centrance-1112/backup/` with sha256 manifest and a one-line restore command.
4. **Apply to live:** copy from kc: `src/cShuttleLoop.js`, `src/shuttleRoutes.js`, `src/sharedTraffic.js`, `src/campusSimulation.js`, `src/keepClearBox.js`, `tests/c-shuttle-keep-clear.test.js`. Use `cp`, then `cmp` each against kc.
5. **Make it the C entrance's duty (small, explicit edits):**
   - `src/keepClearBox.js`: add `position: 'cEntrance'` to `EQUITY_CROSSING_BOX` and to the `gate` object; update the header comment to say it is the Lot C staffed entrance (#63) rule per the Commander.
   - In `src/sharedTraffic.js` change yieldReason string `'equity-crossing-keep-clear'` to `'c-entrance-keep-clear'`. grep tests for the old string and update any match.
   - `src/positions/index.js` `cEntrance.implemented`: append `' Keeps the Equity entrance crossing clear: holds a car or bus before the crossing unless its way out beyond it is clear; conflicting movements enter one at a time, so the shuttle return path stays open when the C West exit backs up.'` Move nothing else.
   - Do NOT touch the stop locations, `northernCorporateControl.js`, the cycle breaker logic beyond the kc lines, or `tests/northern-radio.test.js` (its trips >= 8 check must NOT be waived).
6. **Gates (all must pass):**
   - `npm test`: zero new failing names vs step 0; `c-shuttle-keep-clear.test.js` passes; `northern-radio.test.js` passes unedited.
   - build exit 0.
   - Pickups exact: `C_LOOP_STOPS.{cRoundabout,cSouth,cNorth}.originalPoint` equal `pointAt(47/48/49)` and `point` equals `originalPoint` (fixed stops, not relocated). If the kc file still projects stops onto the trace, report it; do not edit geometry.
   - allwait random and 60 at 3000 s: no shuttle stationary > 120 s including waits ongoing at horizon; C bus trips >= floor(0.8 × step-0 baseline).
   - allwait random and 60 at 9000 s: no ongoing wait > 120 s at the horizon for any class. A finished wait > 120 s passes only if step-0 baseline at the same setting has a wait at least as long; otherwise FAIL with id, route, position, reason.
   - Lot C crowd sweep 1.3× and 1.4× (the cdump scripts used in `research/runs/claud-permit-lotc-1109/`): no car stuck >= 60 s that baseline did not have. Byte-identity is NOT expected (stops move).
7. **On any gate fail:** restore from backup, confirm sha256 matches step 0, then report the failing gate with raw numbers. Do not tune constants (`radius 3.5`, approach 1.5, stale 2 s, path gap 1.1, max wait 20 s) on your own; report and stop.
8. **Read-only, non-blocking:** measure the cNorth pickup 2.5 px curb exception (bus swept body vs pavement) and report the result. Do not change anything for it.
9. **Report** to `research/runs/qwen-centrance-1112/report.md`: changed files with before/after sha256, every gate result with raw numbers, the step-8 finding, restore command. Append one entry to `research/progress-history.md`. Publish the report to the group and answer the Commander directly in plain words. Stop the dev server if you start one.

## 4. Not in scope
- Exit switching ("cars pick the other C exit because it looks faster"): still needs the Commander's ruling.
- The 4th emergency flow at the C entrance: not modeled; mention it as a limit.
- The 9 stale tests.
