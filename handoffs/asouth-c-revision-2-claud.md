# A South + Lot C — revision 2 (CLAUD, 2026-11-11)

Author: CLAUD (diagnosis and instructions only; no live writes).
Implementer and verifier: SPARTAN, the sole implementation owner.
Supersedes the Stage 1 and Stage 2 change specs in `handoffs/asouth-route-and-c-staging-plan-claud.md` (sha256 078283dc…bd32da). Stage 0 (cleanup parked) and Stage 3 (QWEN survey, delivered as artifact 58f8c2f2) are unchanged.
Input evidence: SPARTAN trial `research/runs/asouth-c-739f/` (results.md, south-default.json, south-first.json, c-clearance.json).
My probes, diffs and outputs: `research/runs/asouth-c-claud-diagnosis/`. All runs were on scratch copies under /tmp. No live src/, images/ or tests/ file was touched.

## Summary

| Item | Cause | Fix | Status |
|---|---|---|---|
| C clearance 8.03 px | Arrival join from the entrance interior to the new target cuts diagonally across the throat | Below-throat waypoint built from existing constants | Release now (Stage 2R) |
| A South default freeze | Cross-gate cycle: Main Position ↔ feeder officer | Feeder officer "exit room" admission guard | Implement and verify now (Stage 1R-a); promote together with 1R-b |
| A South South-first lock | Head-on on the drawn aisle: arrivals southbound, departures northbound, about 4 px apart | Needs a Commander decision on the aisle | HELD (Stage 1R-b) |

---

## Stage 2R — Lot C staging +50 px (RELEASE)

### Diagnosis
With the target at [1036,162], two paths cross the throat diagonally:
- The arrival join from `C_ENTRANCE_INTERIOR` [976.38,124.87] straight to [1036,162].
- The departure from [1036,162] to the exit start [995.29,132.27].

The two lines come within 8.03 px of each other near [987–995,131]. At [986,162] the arrival ran nearly vertical, so they never met.

### Change
Apply on top of the existing C-only isolated overlay change (target [1036,162] and its note). Edit `src/parkingRoutes.js`, `zoneArrivalRoute`, lot `c` branch only:
- For zones `cFirstNorth` and `cNorth` only, replace `connect('c',C_ENTRANCE_INTERIOR,end)` with the explicit polyline `[C_ENTRANCE_INTERIOR, W, end]`.
- `W = [C_ENTRANCE_INTERIOR[0], C_STAGING_TARGET[1]]` (≈ [976.4,162]). It is derived from existing constants. Do not add new coordinate literals.
- Check both segments with `clearSegment(a,b)` and `clearSegment(a,b,drivableAllowed)`. If either fails, throw. Do not fall back to `connect`.
- Push a `CONNECTOR_PROVENANCE` entry: `{context:'Lot C north arrival below-throat waypoint', mode:'derived-waypoint', provisional:true, source:'C_ENTRANCE_INTERIOR x, C_STAGING_TARGET y; keeps arrival out of departure throat path'}`.
- `cFirstSouth` and `cSouth` are unchanged. Departures are unchanged.

Reference diff (scratch, lines shown): `research/runs/asouth-c-claud-diagnosis/c-below-throat-waypoint.diff`. Rewrite it cleanly; do not paste the SCRATCH comment.

### What my scratch run proved (`/tmp/claud-c-scratch`)
- **Clearance:** `c-clearance.mjs` passes. Worst gap is 15.94 px, the same pair and value as the baseline. File: `c-waypoint-clearance.json`.
- **Routes:** all 12 C arrival key/zone routes build. North zones end `[976.4,124.9] → [976.4,162] → staging`. South zones are unchanged.
- **Tests:** the same five C test files pass 25/25.
- **Traffic:** default through 6600 s has no freeze, max wait 31 s, and end counters identical to the baseline. File: `c-waypoint-default.json`.

### SPARTAN still must
1. Implement in a fresh isolated copy from the current live baseline. Re-hash the live files first.
2. Rerun clearance, the five C tests, the default service, `npm run build` and `npm run layout:check`.
3. **Run past let-out.** The eleven service lets out at 12:15. With `beginMinute` 605, that is 7800 s. A 6600 s horizon never exercises the C departure wave: only 103 C departures occurred in both runs. Use a horizon of 9000 or more, and report the C departure count and max wait.
4. Check in the browser, Top view: the C staging marker is at [1036,162], and north C arrivals drop south out of the entrance before turning east. Rewind once.
5. Promote only if every check passes. Report before and after sha256 for each changed file.

---

## Stage 1R-a — Feeder officer exit-room guard (IMPLEMENT AND VERIFY; do not promote alone)

### Diagnosis (default 11:00 run, reproduced at clock 2420)
The lock is a cycle across two gates, not the arrival overlap I predicted:

```
Main admits 51 (aNorth departure) → blocked by 312 (aSouth departure, already past Main)
 → 325 → 301 → 260 → 250, held at stop by the feeder officer
 → officer admitted 1027 (aNorth ARRIVAL), not yet past release (merge + 3.4)
 → 1027 ← 1026 ← 1025 ← 1024, held by the Main five-car batch
 → Main is busy with 51 → back to the start
```

- Main admission checks only that the position is clear.
- Officer admission checks only that the merge zone is clear.
- Neither gate checks that the admitted car has room to get out.

The new route did not create congestion. Main throughput matches the baseline within 1–3 cars until 2100 s. It only shifted timing enough to land in this latent cycle. Files: `asouth-trial-state-2420.json`, `chain-tail.mjs`.

**Rejected alternative.** I tried the same guard at the Main gate. It still froze at 2108 s with no admissions, because the stalled departures also block the arrivals' room at Main. File: `asouth-maingate-guard-default-REJECTED.json`. Do not implement the Main-gate variant.

### Change
Edit `src/feederOfficer.js` only.
- In `prepareFeederOfficer`, a candidate is `ready` only if `exitRoom(car)` is true.
- `exitRoom` samples the candidate's own lane every 0.2 world, from `control(car).merge` to `min(lane.length, control(car).release + bodyLength + 0.5)`.
- It returns false if any other non-bus car's current world position is within 0.9 world of any sample. 0.9 is the existing conflict width; do not introduce a new tuning value.
- Name the 0.5 gap as a disclosed constant in `FEEDER_OFFICER_DEFAULTS`, e.g. `exitRoomGap: .5`, so it stays configurable.

Reference diff: `feeder-officer-exit-room.diff`. Rewrite it cleanly.

### What my scratch runs proved
| Route | Service | Result |
|---|---|---|
| Live route + guard | Default | Identical to baseline: max freeze 19 s, max wait 31 s, end counters equal. File: `live-route-officer-default.json` |
| Live route + guard | South-first | Same open defect: since 2030 s (10:38:50), 251 ← 1000. Neither better nor worse. File: `live-route-officer-south-first.json` |
| A South trial route + guard | Default | No freeze through 6600 s. Max freeze 34 s, max wait 50 s, end counters equal to baseline. File: `asouth-officer-default.json` |

### SPARTAN still must
- Add a focused unit test: the officer does not admit a candidate whose release space is occupied; it admits the next candidate that has room.
- Rerun `feeder-officer` and `feeder-middle-outbound` tests plus the narrow Lot A set.
- Do not promote 1R-a alone. On the live route it changes nothing measurable, and it is the prerequisite for 1R-b. Promote 1R-a and 1R-b together.

---

## Stage 1R-b — exitpaths-16 departure route (HELD for Commander)

### Diagnosis (South-first, A South trial route + guard)
- Locks from 1931 s (10:37:11), about 100 s earlier than the existing South-first defect, and in a new place.
- Cycle: 963 arrival → 296 departure → 962 arrival → 262 departure → 296. The cars sit at [123–149, 212–259].
- That is the stretch where the drawn exit return leg runs northbound about 4 px from arrival trace #0's southbound leg.
- The simulation treats lines closer than 10.89 px as one lane, so each queue blocks the other head-on.

Promoting the route would add a second South-first lock on top of the existing one. The guard does not touch this failure (`asouth-officer-south-first.json` is the same as before the guard).

### Decision needed (CLAUD is asking the Commander)
Can the Lot A South aisle carry both directions at once, so departures get their own lane next to arrivals? This is the same question that was approved for Lot A North ("own lane ~12 px").
- **If yes:** I will issue a lane-separation spec for the shared stretch only, using the same asymmetric-split pattern already used at Lot A Main. SPARTAN measures which side has drivable room. No coordinates move until I write that spec.
- **If no:** the aisle is one-way at a time. That needs an aisle hold rule, which is a larger policy change and a separate plan.

### Until then
- The old median-crossing chord stays live. Do not promote exitpaths-16. Do not offset any drawn coordinate.
- `ACTIVATED_EXIT_IDS` stays `[]`.

---

## Order of work for SPARTAN
1. Stage 2R: implement, verify, and promote if green.
2. Stage 1R-a: implement and verify in isolation. Hold.
3. Stage 1R-b: wait for my lane spec after the Commander answers.

One writer at a time. Report per stage: files and sha256, commands and exit codes, test counts, traffic (service, horizon, freeze yes/no, max wait), browser and rewind, promoted yes/no.
