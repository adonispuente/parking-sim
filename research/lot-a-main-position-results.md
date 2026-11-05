# Lot A Main Position / temporary bus passage — results

## Implemented
- Renamed map and dashboard control to **Lot A Main Position**.
- One admission controller handles North, South and main inbound approaches. General A arrivals now pass the same existing provisional station as North/South departures.
- Counts actual clearance of the station, not departure assignment or launch.
- Five-car batch ownership persists across inter-car gaps. Equal-priority queued roads rotate after five; an empty approach yields. Higher-priority ready traffic can take the next safe admission; an already admitted vehicle clears first.
- Priority remains shuttle > departure > arrival. Arrival cars still stay parked.
- Black Permit keeps its distinct right-side branch; badge and shuttle home routes that do not traverse Main Position are not artificially redirected through it.
- Temporary nonphysical exception is limited to fleet-bus/fleet-bus pairs: ignore mutual following, crossing reservation, swept-clear constraints, and leg-launch obstruction. Bus/car and car/bus checks remain active.
- Retained independent bus staging, seeded 30–60s pickup dwell, and 15s minimum home dispatch headway.
- Approved roofs/pavement, capacities and service timing were not modified.

## Changed files
- `src/lotAControl.js`: five-car, three-approach priority-aware gate and lane attachment helper; compatibility exports/stat alias retained.
- `src/parkingRoutes.js`: general A arrival connector via the existing staffed station, separate from badge route.
- `src/campusSimulation.js`: station metadata for normal and redirected general A arrivals and departures.
- `src/SundayControls.jsx`, `src/Scene.jsx`: position label, three-approach counters and temporary exception explanation.
- `src/vehicleInteractions.js`: explicit fleet-bus-pair exception.
- `src/sharedTraffic.js`, `src/shuttles.js`: use exception without waiving car protection.
- `tests/lot-a-main-position.test.js`, `tests/lot-a-batch-control.test.js`, `tests/bus-passage.test.js`: focused checks.

MINION 2 implemented the bus-pair exemption and tests. Lead reviewed and corrected launch eligibility to explicitly mark the fleet record as a bus before checking pairs.

## Verification
Final commands:

```sh
npm run build
node --test tests/bus-passage.test.js tests/traffic-priority.test.js tests/shuttle-staggering.test.js tests/lot-a-main-position.test.js tests/lot-a-batch-control.test.js
```

Build passed (existing >500kB bundle warning). **34/34 focused checks passed**. Broad test suite not run.

Observed checks include:
- 24 real A departures: 5 North → 5 South → 5 North → 5 South → 2 North → 2 South.
- All six real test arrivals crossed main inbound control, parked, and did not depart.
- Single control covers all three approaches; only actual clearance increments count.
- Occupied position clears before priority preemption; shuttle then departure then arrival ordering.
- Opposing buses pass through each other regardless of array order; same-lane bus passes stopped bus.
- Bus still waits behind stopped car; car still waits behind bus.
- Shuttle launch ignores another bus but remains blocked by a car; 15s dispatch headway retained.

Browser opened the existing preview, exposed the new label/three counters/bus exception text, and started playback; reported bus state advanced to outbound. Paused again after check. Browser vision was unavailable, so rendered route alignment and sustained mixed-traffic visual behavior are **not verified**. Vite websocket/HMR errors were recorded by the browser; the HTTP page and controls loaded. Hard refresh to load the latest revision rather than relying on HMR.

Existing verified-live server: `http://localhost:5194/`, background ID `bg_650918cf-e809-4ab7-a6e1-7a59fdd74365`. No additional server was started.

## Remaining limits
- Main Position coordinate [112,50] and internal aisle paths remain provisional.
- Mutual bus passage is a temporary intentional simulation shortcut, not realistic physical clearance.
- This work does not establish that every pre-existing car/car or bus/car opposing-path gridlock is eliminated.
- Black Permit remains outside this particular three-approach control path; no new bus detour was invented.
