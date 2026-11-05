# Hope City traffic priority and arrival streams

## Implemented operational behavior
- Fixed right-of-way hierarchy: **shuttles → departures → arrivals** at local crossing/merge conflicts. It does not depend on array insertion order or let twenty cars outvote a bus.
- Minimum bus operational value: **20 cars**. This is neither simulated passenger occupancy nor physical bus length.
- Ready shuttles are prepared before new departures and arrivals, retaining occupied-start and stop-dwell checks.
- A vehicle already occupying a crossing clears first. Same-direction lead vehicles retain safe following priority; buses cannot teleport, overtake through cars, or claim nonexistent lanes.
- Dashboard displays the standing policy, per-class on-road waiting counts and each moving bus's hold reason.
- Every scheduled service includes **at least 10% Equity arrivals**, divided alternately between the two labeled Equity approaches. They use C's staffed entrance.
- A **separate 10% of total demand** bypasses A along Corporate to B, falling back to C if B cannot accept arrivals. This stream exists while A remains open.
- Explicit `parkingIntent: 'serve-team'` requests on the feeder side remain B-bound; no serve-team headcount or UI percentage has been invented. Corporate-through general traffic is not automatically labeled serve-team traffic.
- General manual feeder traffic similarly sends every tenth car down Corporate. Manual arrival sliders still control origins; the guaranteed Equity percentage belongs to the service scheduler, not manual rate overrides.
- Badge-only manual traffic keeps Black Permit eligibility; the general Corporate bypass must not steal badge assignments.

## Scheduled examples at default settings
| Service | Total | Equity approach 1 | Equity approach 2 | Separate Corporate-through stream |
|---|---:|---:|---:|---:|
| 9:00 | 950 | 48 | 47 | 95 |
| 11:00 | 1,224 | 62 | 61 | 123 |
| 1:15 | 300 | 15 | 15 | 30 |
Whole-car counts round upward where necessary. Equity share can increase to 90%, leaving the separate 10% Corporate stream. The two shares are interpreted as disjoint shares of total demand and are identified that way in the dashboard.

## Verification performed
The Commander asked to deprioritize tests. No broad historical suite was run.
- `node --test tests/traffic-priority.test.js`: **13/13 passed**. Covers bus-over-car and departure-over-arrival regardless of insertion order; a bus vs twenty arrivals; an already-occupied crossing; long-body following; independent opposing lanes; stable ties; held-bus nonreservation; resumption after the bus passes; and a merging arrival.
- Initial focused assertions were too far from a car/car stop boundary to require an immediate stop. After inspecting the implementation and fixture, moved those fixtures inside the existing safe stop distance without altering the safety gap; the same check then passed.
- Short five-minute mixed-traffic smoke run: all five buses completed at least two round trips (four completed three); all lots had departures; `routingIssues` was empty. This is not proof of all heavy-congestion states.
- Direct scheduler readback confirmed the service counts above, including both Equity origins.
- B-full/A-open Corporate-through request selected `cWest`, not A.
- `npm run build`: **passed** after the final source edits. Vite reports its existing >500kB bundle warning; no compilation failure.
- Browser at `http://127.0.0.1:5192/`: rendered campus and separate right dashboard visually inspected using an actual screenshot. Policy panel and bus/car markers visible. During 20× playback, browser readback reached **950 entered / 950 parked / 0 waiting off-map**, with A general 360, B 487, C 103 and no departures during 9:00. Active buses continued repeated trips; buses4/5 stayed home in the three-bus preset.
- Browser console showed a Vite HMR WebSocket connection warning but no app runtime error. Refresh may be needed to pick up final changes in a browser session without working HMR.
- Historical `tests/sunday-services.test.js` final-service occupancy expectation updated to A240/B30/C30 for the new streams; that broad scenario test was **not rerun**.

## Files changed this run
- `src/trafficPriority.js` (new): fixed operational classes and bus value.
- `src/sharedTraffic.js`: short route lookahead, conflict priority, occupied-area clearance, following dependency protection and waiting metadata.
- `src/campusSimulation.js`: shuttle-first preparation, per-arrival intent queues, B/C Corporate bypass and B-only feeder serve-team intent.
- `src/sundayServices.js`: exact minimum Equity and Corporate stream allocation; alternating Equity sources.
- `src/SundayControls.jsx`: minimum Equity input and transparent per-service mix.
- `src/main.jsx`: standing policy panel, waiting totals and bus hold reasons.
- `src/Scene.jsx`: report movement/wait metadata to dashboard.
- `tests/traffic-priority.test.js` (new); `tests/sunday-services.test.js` updated expectation only.
- `research/traffic-priority-plan.md`; this results file.

## Preserved and still provisional
Approved map, pavement, route geometry, service times and parking capacities are unchanged. This remains simplified local traffic interaction, not a full intersection signal controller or swept-body bus collision solver. Internal aisle paths and turning clearance are still provisional. Continuous high-priority demand can delay arrivals under the requested strict hierarchy. Normal dwell, an occupied crossing or a lead-car queue may still stop a bus safely. Exact serve-team numbers and an authorized Equity-to-B team route have not been supplied.

## Preview
Existing development server: `http://localhost:5192/` (network URL reported by Vite: `http://10.21.40.70:5192/`). Background ID: `bg_dba345fa-8bf8-4af7-b1c0-a74f969c4fe7`; confirmed running this session. No additional server was created.
