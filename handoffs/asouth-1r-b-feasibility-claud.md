# Stage 1R-b feasibility — A South departure lane vs arrival #0 (CLAUD, 2026-11-11)

Answer to SPARTAN's read-only diagnosis request after `research/runs/asouth-c-bc34/a-room.json`.
Read-only: nothing in src/, images/ or tests/ was written. Scripts and raw outputs:
`research/runs/asouth-1r-b-feasibility-claud/` (geo, corridor2, inner2, join `.mjs` + `.out.txt`).

## Verdict
1. **Lane spec 1R-b as written is infeasible.** It assumed a short shared stretch with exit 16 exact elsewhere. That assumption was wrong (my error, not the measurement's).
2. **A threshold-compliant departure lane does exist**, but only as a loop nested *inside* arrival #0, with the U-turn about 47 px north of the drawn apex. That changes the shape of the Commander's drawn exit, so it needs his approval. **No implementation instructions are released.** A South stays held; the median-crossing route stays live.

## Why the spec fails
- Exit 16 and arrival #0 are the same loop drawn twice in opposite directions. Arrival: east leg south, U-turn, west leg north to staging. Exit 16: staging, west leg south, U-turn, east leg north to Main.
- They **cross 11 times** (exit segs 0–3, 6–8, 11–12) and every exit segment v0–v14 is within 10.89 px of arrival #0 (`geo.out.txt`). The shared stretch is the whole of exit 16 up to Main, not v6–v13. SPARTAN's scan covered only the return leg; the outbound leg shows the same conflict.
- Clearance map of drivable points at least 10.89 px from arrival #0 (`corridor.out.txt`; obstacle check included, none inside the loop):
  - Outside west of the loop and around the U-turn bottom: component c3.
  - Outside east strip (4–6 px wide, then obstacles): component c9.
  - **c3 and c9 are disconnected at the U-turn bottom**, and neither reaches Main. A departure lane that follows the drawn U-turn on the outside of arrival #0 cannot exist. This matches SPARTAN's side +1 room of 3 px.
  - Inside the loop: component c4, 18–36 px wide, touching staging and Main. It closes off around y≈285, about 30 px above the drawn apex (exit v6 ≈ [75,316]).
- Shifting only part of exit 16 fails at the U-turn because the drawn U-turn sits on arrival's U-turn. These are the 10 no-valid-shift samples SPARTAN found on side -1.

## The one compliant corridor (candidate, not released)
Waypoints, hand-picked from the c4 scan for this diagnosis only (an implementation would derive them, not hard-code them):
`S[164.9,89.7] → [175,100] → [148,150] → [115,200] → [89.5,250] → [86,260] → [89,267] → [95,269] → [101,265] → [103,258] → [108.5,250] → [141.5,200] → [176.5,150] → [193.5,100] → join → Main [217.9,91.6]`

Results (`inner-candidate.out.txt`, `join.out.txt`):
- Interior segments 1–12: `clearSegment` and `clearSegment(…,drivableAllowed)` all true; **minimum gap to arrival #0 is 12.30 px** (requirement 10.89).
- Down leg vs up leg of the same route: 16.93 px.
- Below threshold only at the two terminals, both inherent and already true of the live route: staging (arrival #0 ends there, gap 0) and Main (Main is 6.44 px from arrival #0; the live route also crosses arrival segment 5 just before Main, under the existing Main-gate arbitration). No new crossing policy.
- The direct [193.5,100]→Main segment crosses the non-drivable median patch (x≈192–209, y≈88–95). A drivable join exists via about [195,108]; 193 drivable joins were found.
- Length about 435 px.

What it changes versus the drawn exit 16:
- The U-turn moves to y≈260–269 instead of the drawn ~316, inside the lot body.
- Departures run on the loop interior, so each arrival has the opposing departure on its right (left-hand passing). The sim does not model handedness; this is a realism note only.
- The whole interior is inside the "Lot A south" lot polygon (source shape 38). The map does not say whether that interior is open aisle or parked cars. Only the Commander knows.

## Options
| Option | Separation | Commander's drawing | Risk |
|---|---|---|---|
| A. Nested interior loop (above) | ≥12.3 px on the loop | U-turn moves ~47 px north | Invalid if cars park in the interior |
| B. Exit 16 exact, shared aisle with a directional hold (departures wait while A South arrivals are on the loop) | 0 px, managed by policy | Exact | New traffic policy; same lock family as the open South-first defect |
| C. Commander redraws arrival #0 or exit 16 on separate edges of the aisle | Depends on drawing | New drawing | Costs his time; this scan is re-run |

**Recommendation: A**, if the Commander confirms the interior is open pavement cars can drive through. It meets the unrelaxed 10.89 px rule without touching arrival #0 or adding a policy. If the interior holds parked cars, go to C. B is last because it reintroduces the head-on lock risk.

## Kill-test before any release
The Commander's answer on the interior. After that, SPARTAN's isolated trial under the existing 1R-b kill-test table (default and South-first at least 9000 s, tests, browser, integrity), with the 1R-a guard, promoted together or not at all.

## Held
No instructions released. Live: median-crossing route, exit 16 inactive, guard unpromoted. Cleanup parked.
