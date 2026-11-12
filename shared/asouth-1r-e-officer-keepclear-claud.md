# Stage 1R-e: A South officer keep-clear in free flow (CLAUD, 2026-11-11). Isolated trial released to SPARTAN.

Author: CLAUD (diagnosis and instructions only; no live writes).
Implementer and verifier: SPARTAN, sole implementation owner.
Builds on Stage 1R-d (`handoffs/asouth-1r-d-centreline-claud.md`, artifact 9bf4440a), rejected for traffic only in
`research/runs/asouth-centreline-fb5d/results.md` (artifact 4c7bf402). The 1R-d geometry PASSED and is kept unchanged.
Evidence for this packet: `research/runs/asouth-officer-claud/`. Scratch copies only (/tmp/claud-officer-scratch, /tmp/claud-officer-live). No live src/, images/ or tests/ file was touched.
Commander decisions in force (do not re-ask): two lanes side by side; both built lanes may shift; the two large rows are grass + median, never crossed; departures go south, U-turn, pass the Main position.

## Diagnosis: who occupied the officer's merge

Replayed the fb5d trial's default service to clock 2408 (freeze detected; locked since 2108 s = 10:40:08) and evaluated the officer's private predicates with the same formulas (`officer-zone-probe.mjs`, output `default-2408.json`). Officer `admittedId` was null; reason "clear occupied merge". Exactly ONE car was in the zone:

| car | lane | distance | zone check | status |
|---|---|---|---|---|
| 1014 aNorth arrival | 27 | 99.79 | past release | held by Main five-car batch (`lot-a-main-five-car-batch`) |
| 1015 aNorth arrival | 27 | 97.13 | past release | following 1014 |
| 1016 aNorth arrival | 27 | 93.25 | past release (91.53) | following 1015 |
| **1017 aNorth arrival** | 27 | **90.61** | **inside [merge 88.13, release 91.53]**, never admitted | following 1016; its exit room is blocked by 1016 |

The full cycle:

```
Main admitted 131 (aNorth departure) -> blocked by 312 (aSouth departure, past Main)
 -> 325 -> 301 -> 260 -> 250, held at stop by the feeder officer
 -> officer refuses because 1017 occupies the merge
 -> 1017 <- 1016 <- 1015 <- 1014, held by Main's five-car batch
 -> Main is busy with 131 -> back to the start
```

**Root cause.** The 1R-a exit-room guard only checks cars the officer *admits*. When no A exit is waiting, `prepareFeederOfficer` returns early with "feeder free" and puts no hold on anyone. Car 1017 entered the merge in that free-flow window without room to leave it, then an A South departure queued behind the officer and the merge stayed occupied. Lane 27 has only about 8 world units between the officer's release (91.53) and Main's arrival stop (99.79): three queued arrivals fill it, and a fourth sits in the merge. It is the same Main <-> officer cycle revision 2 diagnosed, entering through the free-flow path instead of an admission. The new loop geometry only changed timing; it did not create the cycle.

## Change (one file: `src/feederOfficer.js`, on top of the fb5d trial copy)

In `prepareFeederOfficer`, replace the early return

```js
if(!gate.waitingExit&&!admitted){gate.reason='feeder free';return;}
```

with a keep-clear rule that uses the existing `exitRoom` test:

```js
// Keep the merge clear in free flow too: a car not yet in the zone may not
// enter it without exit room (same exitRoom test as admission).
if(!gate.waitingExit&&!admitted){
  gate.reason='feeder free';
  for(const car of candidates) {
    if(inZone(car)||exitRoom(car))continue;
    car.feederStopDistance=control(car).stop;
    car.holdForOfficer=car.distance>=control(car).stop-.01;
    gate.reason='feeder free, keep merge clear';
  }
  return;
}
```

Reference diff: `research/runs/asouth-officer-claud/keep-clear-freeflow.diff` (sha256 dd5b6ded…bf20783). Resulting scratch file sha256 24866ac4ea2ed85798252d9a54a11cf8928836d2a5caa2f659412ec50de9bf93.

Bounds:
- No new constant. It reuses `exitRoom`, the 0.9 conflict width and `exitRoomGap: .5`.
- Cars already in the zone keep moving. Buses are not affected (`remaining()` excludes them).
- The `priorityBus` pass-through for feeder cars is unchanged. Do not extend keep-clear to it in this stage.
- Do not change the Main gate, batch size, holds, body clearance, `sharedTraffic` or any geometry.

## Test change (authorized, not a weakening)

`tests/lot-a-south-held-chord.test.js`, test "aSouth hold window is bounded on both sides (3.0 and 3.5 both lock)". It is a negative control that proved the old median chord left only a narrow safe hold window. On the 1R-d lanes, the measured reverse chord gaps (`holdwindow-probe.mjs`) are:

| aSouth hold back | 1.7 | 3.0 | 3.2 | 3.5 |
|---|---|---|---|---|
| min chord gap (needs >= 0.9) | 0.623 (locks) | 1.012 | 1.010 | 1.012 |

The window got wider. That is safer, so the assertion is now false. Replace it with a positive assertion: holds at 3.0, 3.2 and 3.5 each give a gap >= `CONFLICT_WIDTH`. Rename the test accordingly ("aSouth hold window is wide on the split lanes (3.0, 3.2, 3.5 all clear)"). Keep the 1.7 pre-repair lock test unchanged; it still passes. Report the old and new test text and the measured values. No other test changes.

Also add one unit test to `tests/feeder-officer-exit-room.test.js`: with no A exit waiting, a feeder car approaching a merge whose release space is occupied is held at its stop; once the blocker moves past the release plus body and gap, it is not held.

## What my scratch runs showed

All on the fb5d trial copy plus this change, with SPARTAN's own `diagnostic.mjs` (9000 s, 10:05-12:35):

| run | Main freeze | A South completed | longest wait | end Main (aNorth/aSouth/aMain) | departed a/b/c |
|---|---|---|---|---|---|
| fb5d trial, default (rejected) | since 10:40:08, 6892 s | 141 | 6929 s | 203/146/51 | 344/480/157 |
| **scratch, default** | **none, max 33 s** | **277** | **63 s** (A South 8 s) | 393/277/360 | 703/900/383 |
| **scratch, South-first** | **none, max 33 s** | **281** | **63 s** (A South 53 s) | 389/281/360 | 702/896/385 |
| live route + same officer, default (control) | none, max 19 s | 277 | – | 395/277/360 | 704/900/384 |
| live route + same officer, South-first (control) | open defect, since 10:38:50 | 138 | – | 201/138/38 | 339/479/157 |

The live-route control shows the officer change alone does not fix or worsen the separate open South-first lock on the old chord. That is why it must not be promoted alone.

Tests (scratch):
- `feeder-officer`, `feeder-officer-exit-room`, `feeder-middle-outbound`: 14/14 pass.
- SPARTAN's focused eight-file set: 36/41 (fb5d trial 35/41). "UI-faithful eleven service keeps Main progressing through 10:50" now passes.
- The five remaining failures: the hold-window negative control above, plus four that also fail on the live baseline (`five-car policy and Main anchor unchanged…`, `Main-inbound arrivals are held at the measured aMain setback…`, `no median offset was silently reduced`, `production approaches apply the measured holds…`). They are inherited. Report them by name. Do not waive them in bulk, and do not edit them.

I did not run build, layout check, browser or rewind in scratch.

## SPARTAN: isolated trial

1. **Precheck.** Live `src/feederOfficer.js` eeebdaa1…ff2cdb, `src/traffic.js` 00576658…7473a8, `src/parkingRoutes.js` 70fdad8e…5815d5. The 121-file/64-route post-C baseline must be exact. Any drift: stop and report.
2. **Build from the fb5d trial.** Start from the fb5d trial state: 1R-d routes, `aSouthCentreline.js`, keepRight exemption, exit-room guard and its test, all at fb5d hashes. Apply the change above. Do not re-derive or adjust the geometry.
3. Apply the two test changes above.
4. **Checks.**
   - Default and South-first services each to 9000 s. Report freeze yes/no, the longest stationary wait, A South completed and max wait, and end counters.
   - Re-run the 1R-d geometry gate on built routes (expect 11.97 px, 0/0/0).
   - Officer tests and the focused eight-file set, named failures listed.
   - `npm run build` and `npm run layout:check`.
   - Browser Top view with one rewind: A South departures go south, U-turn and pass the Main position; no car crosses the median.
   - 121-file integrity: only the permitted files changed (`parkingRoutes.js`, `traffic.js`, `feederOfficer.js`, new `aSouthCentreline.js`, the two test files). The other 61 routes must be byte-identical.
5. **Promote only if every check passes.** The route, the guard and keep-clear go live together. On promotion: the median-crossing chord is gone, exit 16 is marked "in traffic use", and the exit 16 display coordinates are unchanged. On any failure, live stays as is and you hand back evidence.

## Riskiest assumption and kill-test

**Assumption:** holding A North arrivals at the officer stop when the Main queue is full does not push a new lock upstream onto the feeder or Corporate Drive.
- My two scratch runs show no freeze and unchanged end counters.
- The diagnostic only watches the Main gate. It would not see a lock upstream of the officer.

**Kill-test:** in step 4, also report the longest stationary wait for every car on the lanes feeding the officer and on Corporate Drive. Report every gate's no-progress maximum, not only Main's. Any wait over 300 s fails the trial.
- If it fails there, I will move the keep-clear to the arrival side of the Main batch.
- I will not touch the geometry.

Out of scope: cleanup (parked), individual parking, other lots, the `priorityBus` path.
