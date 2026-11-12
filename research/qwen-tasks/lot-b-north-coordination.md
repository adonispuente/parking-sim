# Lot B North direct departures — SPARTAN coordination

## Decision and ownership
Latest Commander correction: keep section-based B exits; give B North cars direct internal paths rather than a south loop. Do not implement the earlier suggested per-car 40% split. SPARTAN leads and independently verifies; CLAUD plans code/layout; QWEN implements from an exhaustive packet. No concurrent source edits.

## Source inspected
Project `/Users/adonispuente/Desktop/Developer/parking-sim`.
- `src/campusSimulation.js:82–89`: B split sends bNorth/bPocket to bNorth, others bWest. Preserve this selection and `northernDepartureAccess` prelaunch congestion diversion.
- `src/parkingRoutes.js`: `zoneDepartureRoute` first calls `bLoopExit`; it restricts #25 joining vertices to at/before the exit station, follows the loop, then joins #11 or #17. Inspect actual staging/order: this may force the unnecessary loop.
- `B_EXIT_STATIONS.bNorth`: #25 near [846.1061,251.2507], then provisional east-perimeter connector to #11 near [844.9,120.1]. bWest uses #25 near [533.0307,301.4947] and #17.
- `B_CIRCULATION_SOURCES=[25,7]`; #7 perimeter ends vertex19. Forbidden row sweep = vertices20–24 ONLY;25–26 are shared north aisle.
- B arrivals intentionally visit B South: keep that independent arrival rule.
- `src/vectorRoutes.js:23`: north departure #11, west #17.
- Use current Clear Image / EverythingClearImage evidence, never retired map coordinates. Current checkpoint contains old historical milestones; latest user correction and actual source prevail.

## CLAUD packet requirements
Recover any existing plan first. Read source/tests/source vertices and image. Record actual B North staging and built paths for both north and west exits (default vs diverted/explicit paths), source-loop indices, lengths/extents. Choose smallest continuous aisle-supported route; no straight cuts across parked rows, reversing one-way aisles, roof/grass jumps or relaxed collision checks. Explicitly disclose derived connectors: obstacle checks alone do not establish body/turning clearance.
Write a self-contained QWEN packet with exact functions/files, algorithm outline, permitted edits, source evidence, grounded geometry targets, test structure, commands, failure handling and reporting. Include raw and built/resampled lane checks, forbidden-row and obstacle checks, continuity and direction, preserved B arrival path and other-zone routes, unchanged section selection and prelaunch diversion. Publish and hand packet back to SPARTAN for review BEFORE QWEN source edits. CLAUD may write documentation/diagnostics; no src/tests edits.

## Scope / verification
Preserve capacities, source polygons, schedules, badge5%, C median/50:50, playback/menu, radio, shuttle priority, Clay five-car diversion and feeder10:5. No legacy-suite cleanup.
QWEN saves bounded implementation plus focused tests before checks. Run new route tests and relevant Clear Image/B entrance/northern radio/C median/playback/11am regressions, then build. SPARTAN verifies stable handback and current-source mixed11am route/clearance/shuttle evidence, browser path visuals and console where feasible. Historical suite219/246 with27 failures is not rerun evidence; compare names before calling failures legacy. Do not claim all congestion resolved from counts.

Status: current source recovered; no application edits/tests/build/new preview in this coordination pass. CLAUD planning is next, QWEN implementation pending reviewed packet.
