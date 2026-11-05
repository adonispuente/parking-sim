# Traffic routing handoff — Hope City Church parking simulator

## Assignment for the next agent
Continue the existing React + Three.js traffic simulator in this repository. Inspect the current files before editing. Improve traffic routing and source-image alignment without replacing approved geometry or inventing operational rules. Report assumptions separately from confirmed rules. Do not use LOCAL AI for this work. Prioritize visible accuracy and quick browser checks over expanding the test suite; still run a production build after changes.

## Project and launch
Project: /Users/adonispuente/Desktop/Developer/parking-sim
Run `npm start` from the project root. Use the URL actually printed by the server rather than assuming a port. Read package.json for build commands. Prior reports describe successful production builds and browser control checks; they are historical, not fresh verification of your changes.

## Approved sources and geometry
- Current annotation source: `research/Map with streets.json` (LabelMe).
- `src/tracedMap.js` imports that source, checks dimensions against `IMAGE_SIZE` in `src/campus.js`, classifies labels, and converts source pixels to scene coordinates.
- Current conversion: `[x * 113.6 / imageWidth, y * 113.6 / imageWidth]`. Both axes use image width. Do not independently rescale route coordinates or mix crop-relative coordinates with full-image coordinates.
- Keep source pixels as the auditable geometry reference. Labels, not guessed stall counts, establish traced regions.
- User approved the traced map. Lot A's roof outline was specifically approved; its eastern triangle is connected ground-level pavement, NOT roof.
- Do not redraw approved buildings, lots, or Corporate Drive merely to accommodate routes.
- Historical files such as `src/lotA.js` may use a different coordinate frame; inspect before reusing.

## Confirmed operational rules (user supplied)
- Capacities: A 411, B 487, C 686; total 1,584. These are operational figures, not image-derived stall counts.
- Feeder road: south to north ONLY. Arrivals can take Equity Drive, Corporate Drive, or the public Lot A access, traveling east into campus.
- General feeder arrivals: fill A first, then B, then C when preceding lots fill.
- Equity arrivals are normally pushed to C.
- Lot A: public entrance/exit on the feeder; Black Permit access is badge-restricted.
- Lot B: west entrance/exit, plus north entrance/exit reached through Corporate Drive.
- Lot C: two northern entrance/exits reached through Corporate Drive.
- Each lot has a roundabout/shuttle pickup/drop-off area; shuttles transfer people between lots.
- Do not infer turn permissions, right-of-way, one-way internal aisles, or closed access from pavement alone.

## Current implementation (verified by reading code for this handoff)
### `src/traffic.js`
- Exports `createCampusTraffic`, `createTraffic`, `createTenCarDemo`, `makeLanes`, `CENTERLINE`, and `insidePavement`.
- Campus mode uses explicit provisional source-pixel polylines converted by `traceWorldPoint`, interpolated with centripetal Three.js CatmullRom curves.
- Two arrival sources: index 0 feeder, index 1 Equity. Rates passed to `step` are cars/minute.
- Main interface: `createCampusTraffic({lotSettings, initialOccupancy, badgePercent})`, then `state.step(dt, rates, lotSettings)`.
- Current routes: A public, badge A, B west/north, C north entrances 1/2, Equity-to-C east/west, and Equity fallback routes to B/A.
- Feeder allocation: A → B → C. Equity allocation currently C → B → A. Equity fallback is an IMPLEMENTATION ASSUMPTION: the user confirmed a preference for C, not that exact fallback hierarchy.
- Badge sampling currently applies only to feeder cars. Badge holders can use Black Permit when assigned A; otherwise overflow to B/C. This is an implementation detail to confirm, not a complete badge policy.
- Tracks occupancy, reservations, parked totals, assignments, per-source entries/completions/waiting, overflow and denied counts.
- Reservations prevent en-route cars from overbooking capacity. Occupancy increases at the route endpoint. Closed lots are skipped for new allocation.
- `exited` currently means completed arrival route, NOT a vehicle departure from a parking lot.
- If no eligible space exists, a waiting arrival is counted as overflow/denied and removed, rather than routed to a physical overflow destination.
- Step clamps dt to 0.1 seconds. Arrival credits accumulate from cars/minute. Vehicles move at a fixed scene-unit speed.
- Spacing currently orders cars by traveled distance WITHIN EACH SOURCE, even on different routes. This is not shared-edge collision handling and does not resolve feeder/Equity merge conflicts.
- `createTenCarDemo` now issues ten arrivals, with every third assigned to Equity. It is NOT the older fixed 2-A/3-B/5-C round trip; allocation follows current occupancy/rules. It does NOT simulate return trips.
- Legacy `makeLanes` still returns opposite-direction lanes across a composite centerline including feeder geometry. Do not treat that legacy helper as authorization for southbound feeder traffic. Inspect its actual callers before modifying or removing it.
- `insidePavement` currently tests against the feature labeled feeder road, not all road polygons. It cannot establish campus-wide lane containment.

### Integration files to inspect
- `src/Scene.jsx`: vehicle rendering and scene update loop.
- `src/main.jsx`: simulation controls, initial occupancy, capacity/full presets, rates, start/reset/demo state and saved-layout handling.
- `src/model.js`: layout defaults, saved-state migration and validation.
- `src/styles.css`: controls styling.
- `src/tracedMap.js`, `src/campus.js`, source LabelMe JSON: coordinate system and approved map.

## Important unfinished work
- Internal connectors and widths are estimates, not approved civil geometry.
- No real parking-stall assignment, departure routing, complete return journeys, shuttle schedules, intersection priorities or comprehensive collision handling.
- Current route selection happens at spawn. A lot closing while cars are en route does not automatically establish a rerouting policy.
- Shared paths, diverges and merges need an explicit directed road graph or equivalent lane-aware model; absolute distance on unrelated routes is not enough.
- Distinguish occupancy (parked) from reserved/inbound when explaining lot-full redirection in the UI.

## Recommended next slice
1. Read the annotation labels, current route polylines, Scene and UI. Launch the existing app and inspect from above with the source overlay.
2. Audit every route against the trace: northbound feeder, Equity connection, Corporate Drive, A public/permit, B west/north, C two north accesses. Mark untraced connectors visibly provisional rather than altering the approved pavement.
3. Replace route-wide/source-wide spacing with shared directed lane segments and merge-aware queues, preserving the confirmed source allocation policy. Keep the feeder strictly northbound.
4. Make policy inspectable: show source, assigned lot, access, parked/reserved/capacity and reason for redirection. Do not silently turn provisional Equity fallback or badge logic into confirmed policy.
5. Demonstrate A available, A full, A+B full, closures, all full, and simultaneous feeder/Equity arrivals. Use quick focused numerical checks and an actual rendered browser review; do not claim browser verification from build success.

## Acceptance checklist
- Approved trace unchanged; existing user layout/settings not silently discarded.
- No southbound feeder arrivals.
- Feeder A → B → C behavior visible at capacity boundaries with inbound reservations included.
- Equity C preference visible; any fallback explicitly documented.
- Black Permit restricted to badge-authorized cars.
- B/C access routes use the known entrance locations, with estimated geometry disclosed.
- Cars remain on plausible pavement and do not jump between routes; shared-lane queues/merge behavior checked if changed.
- Build result, actual browser review, changed files and remaining uncertainties reported honestly.

## Suggested opening instruction to another agent
“Read research/traffic-routing-handoff.md and inspect its referenced files. Continue the traffic routing implementation, not the campus reconstruction. First audit the current directed routes against Map with streets and identify provisional connectors; then improve lane-aware queues and merges without changing confirmed allocation rules or the approved map. Keep feeder traffic northbound, preserve capacities and badge access, prioritize visual review, and document any unresolved operational decision rather than guessing.”
