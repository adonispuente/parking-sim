# Shuttle staggering, badge-car branch, and A departure batches

## Implemented
- Five buses initially stage at 0, 25, 44, 66, 82 simulation seconds (actual launches may wait for safe space). Successful home dispatches have a minimum 15-second separation. These timings are modeling choices, not measured operating data.
- Each pickup/home visit samples a fresh seeded boarding delay in [30,60) seconds. Identical replays reproduce variation. Random mode is the dashboard default; fixed dwell remains an explicit debugging option. Queueing can still bunch buses; no teleporting or ignoring other traffic prevents it artificially.
- Remote circuits finish before break/retirement. Home dispatch holds continue respecting service breaks and priorities.
- Badge arrivals take an explicit east/right-side internal waypoint [190,250] from the Black Permit entrance toward badge staging [224,218], rather than the A shuttle forecourt. Roof/blocked-zone and pickup-clearance sampling passes. Existing path already favored this side; the branch is now explicit and regression-protected.
- A North and South departure routes share a reviewable merge [112,50] source pixels. A staffed stop holds the opposite stream and releases up to ten actual passages, then switches. Only one vehicle holds the merge permit; its rear must clear before another is admitted. A side with no ready movement yields; no side needs ten cars to proceed. Safe following, occupied-crossing clearance, and bus priority remain active.
- Badge cars, buses and arrivals do not consume A departure batch counts. No new alternating-arrival rule was invented from the North/South exit example.
- Dashboard reports active side, batch progress, approach counts and remaining bus boarding/staging time; map includes an A staffed-position marker.

## Files
`src/shuttles.js`, `src/lotAControl.js` (new), `src/parkingRoutes.js`, `src/campusSimulation.js`, `src/sharedTraffic.js`, `src/Scene.jsx`, `src/SundayControls.jsx`, `src/main.jsx`.
Focused tests: `tests/shuttle-staggering.test.js`, `tests/lot-a-batch-control.test.js` (both new).
Plan: `research/shuttle-stagger-a-control-plan.md`.
Approved annotation, building, pavement geometry and capacities unchanged.

## Verification
Executed:
```
node --test tests/shuttle-staggering.test.js tests/lot-a-batch-control.test.js tests/traffic-priority.test.js tests/service-shuttle-break.test.js
npm run build
```
24 checks passed; production build passed (existing large-JS-chunk advisory). No broad suite run.

Actual campus run with 12 North +12 South, manual departures: all24 departed; merge passage history was North10, South10, North2, South2; no routing issues. Empty-North scenario released all15 South vehicles.

Bus-only20-minute run: all5 buses completed4–5 round trips; no routing issues. First home returns were165.0,185.2,196.7,245.9,288.3s, rather than synchronized fleet returns. This does not guarantee unbunched returns under heavy congestion.

Browser: reused live project Vite server http://127.0.0.1:5194 (`bg_650918cf-e809-4ab7-a6e1-7a59fdd74365`). Selected11AM and20x, started traffic. Screenshot confirmed map, vehicles, A position and right dashboard render. Live DOM showed buses simultaneously in different legs/dwell states (e.g.7s vs53s remaining) and active A control. Playback was paused after inspection. No measured FPS or complete congested-service outcome claimed.

## Limitations and review
- Exact internal merge placement and badge waypoint are provisional pavement/obstacle-checked connectors, not surveyed aisles. Bus turning clearance and individual stalls remain unverified.
- Prior known shared-corridor gridlock is not declared fixed by this work.
- A control concerns departures. If the same position alternates incoming streams too, the specific inbound movements need separate definition.
- Seeded uniform30–60s dwell is a reversible training approximation; actual passenger boarding is not simulated.
