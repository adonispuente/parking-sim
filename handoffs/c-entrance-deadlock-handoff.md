# Handoff: Lot C entrance deadlock (Easter preset)

Written 2026-11-13 by CLAUD for an agent with repo access and no prior chat history.
Repo: `/Users/adonispuente/Desktop/Developer/parking-sim` (Vite + React + three.js; sim core is plain JS in `src/`).
Base commit: `ec11a4d` "service times flow into each other and start easter route".

## 1. Goal

Fix the gridlock at the Lot C staffed entrance that the **Easter** preset triggers, so Easter
runs from 10:05 through the 1:15 service without freezing, and nothing else gets worse.

## 2. Background (already done, do not redo)

- 11:00 preset defaults to 15% Equity arrivals (9:00 and 1:15 stay at 10%).
- Services auto-continue 9:00 -> 11:00 -> 1:15 while playing (`serviceCarry.js` continuous mode,
  wired in `main.jsx`). Verified headless: handoffs at 10:01 and 12:00, 0.0000-minute gap, 0 routing issues.
- `easter` preset added in `src/sundayServices.js`: the 11:00 transition starting with every lot at
  general capacity (A 360, B 487, C 686; A's 51 badge stalls empty), demand = A+B+C general capacity,
  15% Equity, 5 shuttles. It carries into 1:15 via `NEXT_SERVICE.easter = 'final'`.
- Filling A's badge stalls too (A = 411) causes a **separate** A/B lock (badge arrivals frozen ~12 m short
  of the full Black Permit section). Out of scope here; that is why "full" = general capacity.

## 3. The bug

**Where:** `src/cEntranceControl.js` (C staffed entrance and C roundabout controls). Not caused by the
Easter or 15% changes. Easter is the first preset that empties C and refills it through the same
entrance at the same time; normal 11:00 load never reaches it.

**Reproduce (about 1-2 minutes):**

```sh
cd /Users/adonispuente/Desktop/Developer/parking-sim
FULL=1 node scripts/easter-c-lock/easter-series.mjs easter - -
```

Args: `<presetId> <demand|-> <equityPercent|->`. Optional env `INIT='{"a":360,"b":487,"c":686}'`
overrides starting occupancy. `FULL=1` prints the complete control state instead of 700 chars.
The script prints one line per 5 sim-minutes and dumps state at the first 5-minute window where every
on-road car is identical (on-road > 0).

**Observed on `ec11a4d` (2026-11-13):**

| clock | occ A/B/C | departed A/B/C | on road | frozen |
|---|---|---|---|---|
| 10:50 | 328/45/287 | 360/484/386 | 116 | no |
| 10:55 | 376/164/287 | 360/484/386 | 113 | no |
| 11:00 | 376/172/287 | 360/484/386 | 105 | no |
| 11:05 | 376/172/287 | 360/484/386 | 105 | **yes** |

C departures stop at 386 from 10:50 and C occupancy sits at 287. An earlier run stayed frozen until 4:45.

**State at the freeze:**

- `cEntrance.reason`: "clear admitted cars; reserve shuttle turn". Priority `shuttle > departure > arrival`.
- `cEntrance.waiting`: shuttle 5, departure 1, arrival 78.
- `cEntrance.admitted`: all 5 shuttles + cars 1589, 1600, 383, 415, 1112, 1170, 1212, 430.
- `cEntrance.clearing`: 1589, 1600, 383, 415, 1112, 1170, 1212, 430 (never clears).
- **Car 1600 is in both `admitted`/`clearing` and `held`**, and appears twice in `held` (2nd and last).
  Strong lead: a car the entrance waits to clear is also being held by the same control.
- **Car 1212 is admitted by both `cEntrance` and `cRoundabout`.** cRoundabout: admitted [1595, 1212],
  reason "clear occupied movements; compatible lanes continue", waiting departure 1. Second lead:
  the two controls each wait on a car the other one is holding.
- Arrival queues: lane 57 (Equity Entrance -> C, cFirstNorth) 33 cars; lane 53 (-> cFirstSouth) 23;
  lane 56 14; lane 58 12. C departure lanes 18, 21, 22, 27, 34, 35, 37, 45, 46, 48 each hold 1-3 stopped cars.
- Equity/Clay three-way stop is still releasing (cleared 522), so the feed is not the cause.

**Hypothesis to confirm or kill first:** circular wait. cEntrance will not release anything until its
`clearing` set empties; at least one `clearing` car (1600) is also `held`, and/or one (1212) cannot
move until cRoundabout's admitted movement clears, which waits on C departures stuck behind the
entrance. Build the wait graph (what each stopped car waits on, and why) before changing code.
`node scripts/easter-c-lock/easter-diag.mjs <preset> <demand|-> <eq|-> <untilMinute>` prints stopped cars
with `yieldReason`/`holdReason`; minute 665 = 11:05.

## 4. Baseline

- `npm test` on `ec11a4d`: **391 pass, 21 fail.** The 21 failures pre-date this work. Any failure
  outside that set is a regression. Capture the names before editing:
  `npm test 2>&1 | grep '^not ok' > /tmp/baseline-fails.txt`.
- `npm run build` passes.
- Full Sunday chain: `node scripts/easter-c-lock/chain.mjs nine` must still reach 2:55 with carries at
  ~10:01 and ~12:00, 0 routing issues, 0 sent away. `node scripts/easter-c-lock/chain.mjs easter` is the
  Easter equivalent and currently freezes.

## 5. Done means

1. `easter-series.mjs easter - -` reaches 11:40 (minute 700) with no frozen window.
2. `chain.mjs easter` carries into 1:15 and finishes, 0 routing issues.
3. `chain.mjs nine` is unchanged in shape (carries ~10:01 and ~12:00, ends 2:55, 0 issues, 0 sent away).
4. Plain 11:00 with full lots also stays clear:
   `INIT='{"a":360,"b":487,"c":686}' node scripts/easter-c-lock/easter-series.mjs eleven - 15`.
5. `npm test`: no failures beyond the 21 baseline. Add a regression test that runs Easter past 11:05 and
   asserts on-road cars move (keep it fast; stop around minute 670).
6. `npm run build` passes.

## 6. Off-limits

- Do not shrink Easter (demand, starting lots, Equity share) to dodge the load. Real Easter traffic
  will hit this.
- Do not raise or loosen existing test thresholds to make them pass.
- Do not edit files unrelated to the C controls without saying why. The working tree may contain other
  uncommitted work; leave it alone.
- Do not fill A's badge stalls or work on the A/B lock in this task.

## 7. Report back

Root cause in one paragraph (which control waits on which car, and why it never clears), files changed,
the exact commands above with their output, test pass/fail counts against baseline, and anything that
still freezes.
