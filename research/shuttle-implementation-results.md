# Five-shuttle service — implementation results

## Implemented behavior
- Five persistent numbered buses (not random shuttle-percent private cars), home at exact `Lot A Shuttle Pickup/Dropoff` point.
- Default dispatch: four B / one C while B below full; all five C once B occupancy reaches 487 or B closes. Threshold is adjustable (100% default). No claimed definition of 'mostly empty'.
- B pickup selector supports South (default), North, or alternating. C buses rotate across all three exact labeled points. Every remote visit returns to A home; dispatch changes only at home, never mid-route.
- Adjustable dwell (12 simulated seconds default), enabled/return-home-and-hold control, per-bus phase, completed visits/trips and traffic waiting status. Runs in arrivals and departures; global pause and 1–5x playback apply.
- Purple bus meshes are longer than cars. Shared-space following considers car/bus body length across different route IDs. Ordered merge/crossing yielding avoids the mutual-wait deadlock discovered during verification. Opposing traffic, swept turns and full collision physics are NOT solved.
- Badge arrivals use Black Permit even when general A/campus is full, tracked separately as unquantified badge availability; no fabricated extra numeric spaces or changed 1,584 general total.
- Departure phase releases A/B/C together, through A public→feeder north, B west→feeder north, C preferred exit→Equity. Previously simulated badge arrivals use permit→feeder north. Initial count-only occupancy stages at existing departure-path starts; it does not pretend to know individual stalls or their departure aisles.
- Shuttle vehicle percentage removed. Left open-capacity statistic now subtracts occupancy and inbound reservations in open lots and recovers as vehicles depart; lot/position counters remain structural.

## Geometry and permissions boundary
Approved annotation/map/roof geometry is unchanged. Labeled throat data and exact pickup points come from `images/HopeCityLayoutVectors.json`, matching `HopeCityLayout.png`, 735×566.

Internal shuttle routing excludes traced buildings and blocked strips, searches parking polygons, and adds narrow provisional forecourt/driveway connectors where the annotations omit pavement (notably A home and C departure connection). This is **not** an aisle scan: paths may cross drawn parking rows because individual stalls, landscaping and aisle centerlines are not fully traced. Stop direction, pullouts, bus width and swept turns need visual/site review.

Shuttle A↔Corporate uses the labeled Black Permit corridor in both directions, not the A public exit followed by an illegal feeder-south movement. B uses its main west entrance/exit, never reversed B north exit. C uses staffed entrance inbound and labeled exit 1 outbound. Direct bus service back toward A is a provisional shuttle return policy, separate from ordinary car departures to Equity/feeder. Physical connectivity is established by paths; operational bus turn approval remains open. The independent review's public-exit dead-end warning is valid for that alternative but not the implemented permit connection.

## Verification observed
Command:
`node --test tests/shuttles.test.js tests/arrival-controls.test.js tests/equity-routing.test.js tests/playback.test.js`
Result: **20 passed, 0 failed**.

Checks cover exact endpoints/obstacle exclusion, five persistent identities, repeated round trips, C stop coverage, B-full no-teleport reassignment, bus queues with ordinary arrivals, badge availability at general capacity, concurrent A/B/C departures, body-length following across route IDs, dynamic open capacity, existing Equity staffed access, retained parking and accelerated playback.

Additional 20-minute simulation probes at 12 feeder + 6 Equity arrivals per minute: all five buses completed at least ten round trips in each dispatch configuration; traffic waiting occurred. This is simulation evidence, not observed on-site performance.

`npm run build`: passed. Vite reports bundle >500kB (nonfatal).

Browser: local test navigation timed out, including after browser reset; no rendered-browser approval is claimed. HTTP preview responds 200, server confirmed running at http://127.0.0.1:5191/ (`bg_bd3a9467-a626-48f2-94a1-45a584828f75`). `npm start` remains supported.

## Review artifacts
- `research/shuttle-route-preview.svg`: source-frame overlay (solid outbound / dashed return), references ../images/HopeCityLayout.png.
- `research/shuttle-route-preview.json`: exact generated pixel paths, stop labels and provisional status.
- `research/export-shuttle-route-overlay.mjs`: regenerate both with `node research/export-shuttle-route-overlay.mjs`.
- `research/shuttle-route-review.md`: GPT MINION 2 independent review, read and assessed; no LOCAL AI used.

## Changed files this task
`src/traffic.js`, `src/trafficPolicy.js`, `src/vectorRoutes.js`, `src/Scene.jsx`, `src/main.jsx`, `src/styles.css`; new `src/shuttleRoutes.js`, `src/shuttles.js`, `src/sharedTraffic.js`, `src/parkingAvailability.js`, `tests/shuttles.test.js`, and research files above plus `shuttle-implementation-plan.md`.
