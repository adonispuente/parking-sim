# Lot A Main deadlock — diagnosis and plan (CLAUDYBEAR, 2026-11-06)

Status: DIAGNOSIS + PLAN saved before any source change. No tests, builds or traffic runs used for this diagnosis.
One static geometry probe (no simulation steps) was run: `research/claudy-lot-a-geometry-probe.mjs` -> `research/claudy-lot-a-geometry-probe.json`.

## Evidence
Independent smokes `research/spartan-b-median-smokes-2026-11-06.jsonl` (SPARTAN, verified baseline):
- eleven: arrival 955 (aNorth) at px (199.8,80.9) `lot-a-main-five-car-batch`, yields to nobody. Departure 289 (aSouth) at (195.5,76) `clear-occupied-conflict` -> 955. Departure 315 (aSouth) at (211.5,102.6) `clear-occupied-conflict` -> 955.
- final: arrival 1226 at the same (199.8,80.9) batch-held. 1227 arrival at (171.7,66.7) follows it. Departure 296 (aSouth) `clear-occupied-conflict` -> 1226; 228 -> 296; departure 179 (aNorth) batch-held.

## Mechanism (source)
1. `lotAControl.js:111` admits a new car only when nothing is admitted or clearing. 289 is not batch-held, so it is the admitted/clearing car; the gate waits for it.
2. `sharedTraffic.js:164-182`: a held car that has not reached a conflict is skipped (`:176-178`), but a held car whose BODY is already in the conflict area (`hit <= halfLength+.6`) still wins. 289 therefore yields to 955's body.
3. `sharedTraffic.js:209`: the cycle breaker never releases a `holdForBatch` car, and 955 yields to nobody, so there is no cycle to break.
4. Result: admitted departure waits on held arrival's body; gate waits on admitted departure. Permanent.

## Root cause (geometry)
Probe on built lane polylines (same `keepRight(vectorToTrace(...))` as `traffic.js:92`):
- Main #57 = px (217.85, 91.58).
- Every general A arrival enters along (179.6,68.9) -> Main. Every A departure leaves along Main -> (177.6,63.5) on source #18.
- These segments diverge by about 4 degrees. At the arrival stop line (20.5 px = 1.7 world before Main) the held car centre is (200.2,81.1) — exactly 955's reported position — and the departure centreline passes 0.8-0.9 px from it. Body clearance is about -7 px.
- Neither segment is on a street polygon, so `keepRight` never separates them: inbound and outbound are modelled as one line through Main.
- Conflict threshold `CONFLICT_WIDTH` 0.9 world = 10.9 px between centrelines. The held car's conflict window spans about 12-36 px before Main. The next queued arrival waits near the merge vertex, about 45 px out (1227 at (171.7,66.7) is 6.7 px from the departure path), so the overlap extends to about 50 px.

This contradicts the Commander's layout: "In Lot A main entrance, theres a similar median that allows cars to exit while cars are entering. That path that comes in from the feeder into lot a north/south is a two way road, its very wide."

## Rejected options
- Deeper stop line: at 4 degrees divergence the paths reach 10.9 px only about 130 px out; that places the stop beyond the merge vertex. Does not model the median.
- Changing the five-car policy, the batch size or capacities: no evidence that they cause this. Out of scope (peer and checkpoint constraint).
- Letting the cycle breaker release batch-held cars: waives the gate's hold. Treats the symptom and lets a held car move without admission.

## Plan — one bounded change
`src/parkingRoutes.js`: model the Main median on the shared stretch only.
- New helper `medianSide(points, part)`: within MEDIAN_REACH_PX (60) of Main along the route, on the approach side (`before`) for A arrivals and the exit side (`after`) for A departures, resample at 4 px and shift each point right of travel by MEDIAN_HALF_PX (7) * ramp. Ramp = 0 at Main (the median nose; Main stays an exact vertex so `attachMainPositionToLane` and the gate are unchanged) and reaches full by 10 px. It tapers to 0 over the last 10 px before 60 px, so points beyond the reach are untouched.
- Right-hand traffic: arrivals end up south-west of the old line, departures north-east. Opposing centrelines are about 14 px apart over the held and queued window, above 10.9 px.
- Each shifted point must pass `avoidsObstacles`; on failure the offset steps down (7, 5, 3.5, 0), the same fallback style as `keepRight`.
- Apply to `zoneArrivalRoute` general A arrivals (and therefore redirected A arrivals, which splice the cached arrival) and to `zoneDepartureRoute` A North/South departures. Badge A is untouched.
- Unchanged: the gate, the five-car batch, priorities, stop-back, Main coordinate, B, Corporate/Equity, B7 vertices 20-24.

Focused coverage: `tests/lot-a-main-median.test.js` (new).
- Every general A arrival lane and both departure lanes still pass exactly through Main.
- On BUILT lane polylines, the held arrival body window (stop-HALF-0.6 to stop+HALF) stays at least CONFLICT_WIDTH (10.9 px) from each departure lane, and queued positions out to 50 px do the same.
- Arrival offset side = right of travel (south-west), departure = north-east.
- Offset points avoid obstacles.

Order (Commander's change-first rule): backup -> source change -> new test -> report/history saved -> THEN the focused test, the targeted set, `npm test`, the build, the three smokes and the west sweep, compared with the SPARTAN b-median baseline (nine 950/950; eleven 107/1224, west 9; final 47/300, west 0; 27 same failures).

## Limits stated up front
- MEDIAN_HALF_PX 7 is chosen to clear the model's conflict width with margin. It is not a surveyed median width. Pavement width at Main is not measured here; only obstacle avoidance is checked.
- The gate still admits one car at a time across all three approaches. With a physical median the Commander's description implies entry and exit can move SIMULTANEOUSLY; that is a separate gate-policy change, not made here.
- The eleven west-exit 0->9 gate is not linked to Lot A by this evidence; it stays open and separate.
