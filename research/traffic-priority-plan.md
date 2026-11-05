# Standing traffic priority implementation

## Goal
Make safe competing movements follow the confirmed operational hierarchy: **shuttles, then departures, then arrivals**. One shuttle has a minimum operational value of **20 cars**. This is not a passenger estimate or permission to bypass occupied pavement.

## Inspected implementation
- `src/sharedTraffic.js` currently follows leaders by body length, but crossing yield uses car-array order.
- `src/campusSimulation.js` currently launches departing and arriving cars before preparing buses.
- `src/shuttles.js` stages five persistent buses and retains safe start clearance.
- `src/main.jsx` and `src/Scene.jsx` display the fleet and live traffic statistics.

## Approach
1. Add a shared operational-priority definition, independent of route geometry and bus body length.
2. Keep leader-following intact; add short route lookahead for conflicting crossing/merge movements, stable equal-priority ties, and occupied-conflict clearance before priority.
3. Prepare ready shuttles before spawning departures or arrivals; preserve dwell and occupied-start checks.
4. Show the fixed hierarchy, 20-car bus value, and live yielding status in the dashboard.
5. Verify insertion-order independence, departure-over-arrival, a bus versus a queue of arrivals, occupied crossing clearance, safe bus following, independent opposing lanes, repeated fleet movement, and production compilation. Prefer narrow checks over the full historical suite.

## Risks and limits
Priority must not make a bus and the car already ahead stop for one another. Opposing lanes must remain independent. This engine remains a simplified traffic model, not swept-body intersection physics; internal aisle geometry and bus turning clearance remain provisional. A bus blocked by a lead car must wait safely, and stop dwell is still required. Heavy continuous shuttle/departure demand can delay arrivals under the requested strict priority.

## Out of scope
No approved geometry, routes, lot capacities, service schedules, boarding simulation, overtaking lanes, or traffic-control permissions are changed.

## Added arrival-distribution instructions
The Commander subsequently specified at least 10% Equity arrivals per service and a separate 10% Corporate-through stream for B (then C if B is full), even with A open. Serve-team drivers park in B; no team headcount was supplied. Add deterministic per-service streams rather than a random percentage that can undershoot the minimum. Explicitly configured serve-team cars stay B-bound and wait if B cannot accept them; general Corporate bypass drivers may fall back to C. Keep testing secondary: finish only the already-started narrow safety check, production compile, and a visible browser smoke check rather than the full historical suite.
