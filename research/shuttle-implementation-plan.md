# Five-shuttle service implementation

## Goal
Five persistent buses continuously visit labeled remote pickup points and Lot A home base, interact with ordinary traffic, and respond to Lot B occupancy. Badge holders retain Black Permit availability separately from general lot capacity. Departures release represented parked vehicles across A/B/C concurrently through their existing proper exits.

## Existing code inspected
- `traffic.js`: arrival/departure routes, count-only initial occupancy, parked arrivals, reservations; spacing only per complete route, so overlapping routes currently do not share queues.
- `vectorRoutes.js` and `pavementRouting.js`: source-pixel access throats and directed street pathfinder. Street routes are pavement-contained but not surveyed lanes.
- `Scene.jsx`: car meshes and grouped parked markers; simulation playback subdivided through `playback.js`.
- `main.jsx`: dashboard with phase, rates, occupancy and 1–5x speed.
- `HopeCityLayoutVectors.json`: exact home point, two B stops, three C stops, roof/parking/access polygons. No traced internal aisle centerlines.

## Steps
1. Derive auditable shuttle paths using labeled access corridors and internal pavement routing that excludes roofs and blocked zones; expose uncertain internal connectors rather than claim aisle accuracy.
2. Add five deterministic bus identities, outbound/dwelling/homeward lifecycle, home-only reassignment, and 4B/1C vs 5C policy. Default B threshold 100%, adjustable; B stop distribution selectable. C uses all three stops.
3. Introduce shared-space following/merge gating for cars and buses, using body-length-aware spacing. No claim of advanced traffic physics or engineered lanes.
4. Track badge parking separately without fabricating a capacity or changing 411/487/686. Remove random shuttle-as-private-car input in favor of actual fleet controls.
5. Render recognizable buses and labeled stops; expose dispatch, dwell, trip counts, waiting/error status. Keep all lots' represented departures concurrent and shuttles active in both phases.
6. Verify round trips/stop coverage, B-full reassignment at home, badge acceptance with general A full, queues and simultaneous departures; production build and browser inspection.

## Decisions / limitations
- 'Mostly empty' is not a numerical threshold. Use B-full as the switch supplied by Commander; a configurable threshold is a scenario control, not a new confirmed operating rule.
- B has two labeled shuttle stops; select B South by default (normal parking preference), allow B North or alternating. Four buses to B is confirmed; exact stop allocation is not.
- Dwell is a configurable simulation timer, not a passenger-service measurement. No passengers, boarding counts or staffing simulation yet.
- Initial occupancy remains a count only, not invented parked vehicle locations. Departure phase releases represented arrivals from all lots concurrently.
- Geometry and general routing directions remain unchanged. Vehicle swept widths, aisle direction and internal centerlines need review.
