# Northern radio and playback plan

Goal: C exit64 holds conflicting Corporate cars for outbound shuttles, shared radio status across distinct positions62/63/64. Finish pending C access, B diversion, reverse UI.

Read: corporateDriveOperators.js (no northern controller), sharedTraffic.js (independent stop limits), campusSimulation.js (static departures, cEast ordinary cars), playback.js (deterministic seek), Scene.jsx and main.jsx (forward playback + elapsed timeline).

1. Add northern controller: sample final lanes at C exit; hold approaching conflicting traffic, never cars already inside; radio lists all buses and local release state.
2. Route ordinary C cars west; divert provisional batches of5 B departures before launch only when east/Clay congested. No moving-car route swaps.
3. Matched reverse speeds reconstruct deterministic state with bounded async work and cancellation; no negative physics. Remove elapsed timeline, retain service clock.
4. Focused tests, production build, mixed traffic smoke and browser readback; save results.

Provisional: exact stop lines, queue threshold and five-car batch. Preserve geometry, capacities, Main5, feeder10:5, priority and occupied-space protection. No new pedestrian/scoring work. Rebuild-based reverse may be slower than requested multiplier on long scenarios; measure and disclose.
