# Routing review and first increment

## Source of authority
The Commander's latest operational specification supersedes earlier feeder-wide one-way claims, Equity-C default priorities, B north arrival permissions, and automatic shared special-access permissions. Approved geometry is unchanged.

## Current implementation
- src/tracedMap.js consumes HopeCityLayoutVectors and its matching image.
- src/pavementRouting.js builds a 2-pixel pavement grid and uses Dijkstra with sampled segment containment. Western-strip northbound restriction is currently hardcoded, not a physical-road fact.
- src/vectorRoutes.js combines street paths and labeled access throats into complete route templates. Internal parking connectors remain estimates.
- src/traffic.js moves vehicles along complete paths, reserves lot capacity en route, claims occupancy on arrival, and releases it on timed departure. Spacing is per complete route, not shared road segment.
- Initial occupancy is not rendered as individually departing vehicles. No zone capacities, volunteer rerouting, explicit phase machine, intersection priority, or traced stall assignment exists.

## Gaps
Normal arrivals previously alternated through B north and C secondary exits. Equity priority was C/B/A. These contradicted the new specification. Full lots increment overflow counters and remove arrivals rather than holding them. Automatic dwell departure conflicts with remaining parked until departure mode. Road containment does not establish safe lanes or legal turns. The Equity source currently starts on the western/southern route before reaching the eastern road; a genuine southeastern origin still needs implementation and geometric verification. No reviewed physical intersection graph exists yet.

## Architecture
1. Immutable source-pixel geometry, access IDs and registration.
2. Explicit connected intersection/aisle graph with edge polylines and validated throat endpoints; fail closed for uncertain internal links.
3. Scenario policies for direction, phase, category permissions, access closures, lot/zone priorities and volunteer overrides.
4. Vehicles navigate edge sequences with explicit lifecycle states and reroute only from their present position or next connected node.
5. Separate reservations from actual occupied spaces; unspecified zone capacity remains null, never a fabricated fraction of lot totals.

## Small implemented increment
src/trafficPolicy.js separates normal access selection from geometry. General arrivals use A public, B main/west, C preferred/west. Both approaches default to A/B/C (priority configurable through engine options). Added Equity-to-B-main route using existing pavement pathfinding, without changing pavement. Special categories are independently configurable: badge allowed, shuttle/accessibility/rideshare default denied pending confirmation. Unused legacy exit-entry templates remain available in geometry but are not selected for normal traffic.

## Missing confirmation
Identify the three feeder driveways by exact annotation labels. Confirm main B approach movements, phase permissions on B north, C preferred driveway movements, Equity-to-feeder and southern connections, Banana boundaries, Equity priority override if any, and each special-category permission. Saturday exit requires an independently enabled scenario. No uncertain rule was inferred from imagery.

## Next files and sequence
- pavementRouting.js: expose physical graph separately from scenario direction filtering.
- vectorRoutes.js: stable access/intersection catalog; correct southeastern origin after image review.
- trafficPolicy.js: phases, closures and reviewed permissions.
- traffic.js: lifecycle, zone assignments, holding, parked departure cohort and continuous rerouting.
- main.jsx / Scene.jsx: phase/zone controls and optional graph/route debug overlay.
Do not claim internal aisle navigation until traced connected aisles exist.

## Verification
Production build passed. Eight focused access assertions passed: both origins use intended A/B/C entrances, general and unconfirmed shuttle cannot use Black Permit, badge can. No browser visual verification performed for this increment. Next visualize the exact access throat and approach route for A-open, A-full, A/B-full; then test B-zone-full, two B departures, C departures, real southeastern Equity arrival, and explicitly enabled mistake attempts. Include all-full holding, mid-route closure continuity, shared-edge spacing, category denial and occupancy conservation. Full A-H completion is not claimed.
