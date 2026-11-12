# A South departure fix + Lot C staging move — plan (CLAUD, 2026-11-11)

Author: CLAUD (plan only; does not implement).
Implementer: SPARTAN (Stages 0–2). QWEN: Stage 3 read-only survey only.
Commander directive (verbatim, 2026-11-11): "I want to supersede clean up right now ... first eliminate the route leading from lot A south to the feeder that I didn't create ... all proper routes require them to make a U-turn, and/or have to pass through the person positioned in lot A main position. Then lets move ... Lot C staging target ... 50px to the right ... the cars should be parking by where those exit paths begin. This is true for every lot, though the second part isn't as important ... Spartan can implement most of it this time."

## Stage 0 — Park cleanup (SPARTAN, first)
- Cleanup release 1 (Part A) expired 14:20 UTC; QWEN stopped and handed back. Record cleanup as SUPERSEDED/PARKED by the Commander. Do not re-issue Part A. Do not touch the external archive or QWEN's preserved evidence.
- Confirm QWEN has no live write in progress and no scheduled job will write src/ or images/ during Stages 1–2. One implementation owner: SPARTAN.
- The S1 bNorth pilot stays parked. Do not combine it with this work.

## Stage 1 — Replace the uncreated A South departure (highest priority)

### Diagnosis (read-only probe, CLAUD, this run)
`zoneDepartureRoute('a','aSouth')` in `src/parkingRoutes.js` line 396 builds its approach with the generic connector `connect('a', start, main)` (internalPath). Runtime result:

    staging [164.9,89.7] -> [164,88] -> [204,100] -> [208,96] -> [216,92] -> Main #57 [217.9,91.6] -> shared Main->exit tail

That 40 px diagonal from A South staging straight east to Main is the route the Commander did not draw. It skips the south run and U-turn. No Commander trace contains it.

Commander-drawn A South exits that DO exist:
- `exitpaths-16` (images/ExitPathsAndC.json, family aSouth), 23 vertices: starts [155.7,109.9] (22 px south of staging), runs south, U-turns at ~[75.4,316.5], returns north to [214.0,115.5], [231.4,96.7], then northwest to the feeder exit [46.9,18.3]. Its segment [231.4,96.7]->[205.7,78.5] passes ~3.7 px from Main #57 (inside MAIN_STATION_MERGE_PX = 12).
- Clear Image trace #19 'Lot A south exit to feeder' is the older equivalent (same shape). Use exitpaths-16: it is the Commander's newer drawing for this exact exit.

### Change (only these)
In `src/parkingRoutes.js`, aSouth branch only:
1. New approach = `[staging, ...exitpaths-16 vertices 0..13 verbatim, Main #57]`.
   - staging -> v0 ([164.9,89.7] -> [155.7,109.9]) is a derived join: check with `clearSegment` and `drivableAllowed`; record a CONNECTOR_PROVENANCE entry `{context:'Lot A South staging to exit trace exitpaths-16', mode:'derived-join', provisional:true}`.
   - v13 -> Main ([214.0,115.5] -> [217.9,91.6], ~24 px) is a derived station join: same checks, same provenance pattern.
   - If either check fails: STOP, report the failing segment. Do not substitute a grid/A* connector — that is how the bad route was created.
2. Keep everything after Main unchanged: `medianSide(join(approach, mainToExit(), A_EXIT_TAIL), 'after', id)`. aNorth, aBadge and all other routes unchanged.
3. Read vertices from `exitPathById('exitpaths-16')` (src/exitPathSource.js) — do not copy literals.
4. Add `exitpaths-16` to ACTIVATED_EXIT_IDS ONLY if Stage 1 is promoted. Legend then shows 1 in traffic use.

### Known risk — head-on overlap with A South arrivals (must be measured)
The exit loop is drawn on the same aisle as arrival trace #0, in the opposite direction. Measured: at y=125 the exit's return leg is at x=207.0 and arrival #0's southbound leg at x=206.8 (0.2 px apart); the south legs are ~4 px apart near y=258. Sim CONFLICT_WIDTH is ~10.9 px. `MAIN_DEPARTURE_HOLD_BACK.aSouth = 3.2` world (~39 px) will now place the held departure on that shared return leg — the same failure class as the open South-first gridlock (departure 251 waiting on held arrival 1000).
- Do NOT add a lateral offset or edit drawn coordinates on your own. If the trial shows conflict/gridlock, stop and report numbers; CLAUD will bring the offset decision to the Commander (precedent: the aNorth "own lane ~12 px" was Commander-approved, not assumed).

### Verification (SPARTAN, isolated before promotion)
1. Route probe: print `out:a:aSouth`; prove no vertex lies on the old [164,88]->[204,100] chord; prove the route reaches max y >= 310 (U-turn) and passes within 12 px of Main #57 before the exit tail.
2. Unit: add `tests/lot-a-south-exit-trace.test.js` asserting (a) the approach contains exitpaths-16 v0..v13 in order, unchanged; (b) U-turn present; (c) passes Main; (d) the other 63 route ids are byte-identical to baseline.
3. Narrow existing tests: `lot-a-main-held-departure`, `lot-a-south-held-chord`, `lot-a-main-position`, `lot-a-main-median`, `lot-a-main-two-way`, `lot-a-batch-control`, `revised-main-connectors`, `route-layout-alignment`, `service-dismissal-gates`, plus `exit-path-source` and `exit-path-overlay-view`. Expect `lot-a-south-held-chord` to need updating if it asserts the old chord; change an assertion only when it encodes the removed route, and list each change.
4. Traffic: default 11:00 service through full let-out — no gridlock (repaired default must stay repaired); report max wait and any A South arrival/departure mutual hold. Run South-first too and report — it is already broken, so record whether this changes it, not acceptance.
5. `npm run build` and `npm run layout:check` exit 0. Browser Top + 3D: A South cars visibly run south, U-turn, pass the Main position, no median crossing. Rewind once and confirm.
6. Do not promote a failing trial.

## Stage 2 — Move Lot C staging target 50 px east
### Change
`images/layout-overlay.json`, feature `stage:c-staging-target`: [986,162] -> [1036,162]. Update its description note to say "moved +50 px east by Commander 2026-11-11". No code change: `C_STAGING_TARGET` is read from this file.

### Predicted effect (CLAUD replicated `staging()` read-only)
| zone | now | after |
|---|---|---|
| cFirstNorth | [986,162] | [1036,162] (exact; in #51, in mask #53, clear of throat x955–1015/y<140) |
| cNorth | [991,176] | [1035,176] |
| cFirstSouth | [948,326] | unchanged |
| cSouth | [952,326] | unchanged |

The target only drives the C north zones. The C south zones resolve to their own nearest in-polygon point and do not move — Stage 3 addresses that. The new point sits between the starts of exitpaths-42 [984.6,184.2] and exitpaths-21 [1066.7,153.8], which matches the Commander's intent.

### Verification
- Probe ZONE_STAGING and confirm the table above exactly.
- C arrival and departure routes for all four C zones still build (no throw), stay obstacle-clear, and do not enter the throat box.
- Scene staging marker for C moved; Top view shows it.
- `npm run layout:check`, `npm run build` exit 0; C-related tests pass; default service runs through let-out without new C locks.
- Stages 1 and 2 may be verified together but must be reported per stage so either can be reverted alone.

## Stage 3 — Departures start near exit-path beginnings, every lot (lower priority; planning input only)
QWEN, read-only: for each zone, list current ZONE_STAGING, every exit path of that lot with its start vertex, distance from staging to each start, and whether that start lies inside the zone polygon. Output `research/exit-start-vs-staging-survey-2026-11-11.md`. No edits under src/, images/ or tests/.
This feeds the individual-parking design (reserved spots near exit starts). CLAUD turns it into a separate plan; nothing in Stage 3 changes traffic.

## Report format (SPARTAN)
Per stage: files changed with before/after sha256; exact commands and exit codes; test counts; traffic results (service, gridlock yes/no, max wait); browser observations; promoted yes/no; anything stopped and why.
