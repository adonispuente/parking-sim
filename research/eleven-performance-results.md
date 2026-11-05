# 11 a.m. lag and service timing — verified results

## Performance changes
- `src/sharedTraffic.js`: position-only lookahead/body sampling (no discarded tangents), per-step nearby-vehicle cache, direct ID lookup for leaders, and array-index pair ordering instead of JSON/string sorting. Conflict sample positions, pair processing order, safe following, occupied-crossing handling and shuttle > departure > arrival ranking stay the same.
- `src/pavementRouting.js`: immutable polygon bounds for cheap outside rejection; cache directed grid neighbor clearance and complete street routes without changing neighbor order or the original ray-crossing result.
- `src/shuttleRoutes.js`: cache immutable internal grid neighbor clearance and exact endpoint route results.

## Comparable measurements
Machine-local Node CPU measurements, not browser FPS guarantees. Both 1,800-second runs below include36,000 steps of.05 seconds, the same11 a.m. demand and routing. Comparison was completed BEFORE the intentional arrival timing update.

| Metric | Before | After |
|---|---:|---:|
| Total simulation-step CPU |10,794.41ms |6,114.25ms |
|95th-percentile step |.9862ms |.5520ms |
| Initialization (excludes module import) |2,936.63ms |785.28ms |
| Road + shuttle route setup including imports |13,166.08ms |2,067.81ms |
| Peak moving vehicles |90 |90 |

Simulation CPU reduced43.36%; full route setup reduced84.29%. Exact vehicle-state digest matches, including vehicle IDs, lanes, distances, phases, yield reasons, occupancy/reservations, entered/departed counts, parked IDs and shuttle records. All vector-route/shuttle-circuit coordinate checksums match, including after the source filename repair. No demand reduction, population cap, geometry edit or traffic-safety bypass was used.

Raw reports: `eleven-performance-mixed-before.json`, `eleven-performance-mixed-after-profiled.json`, `eleven-route-setup-before.json`, `eleven-route-setup-after.json`. The unprofiled after report is also retained.

## Commander timing addition
MINION2 implemented `src/sundayServices.js` and `tests/service-timing.test.js`; lead reviewed and executed them.
-95% (rounded up to whole cars) scheduled by actual service start+45 minutes:9:45,11:45,14:00.
-Remaining5% scheduled over the next15 minutes. That final-tail shape is provisional; the Commander did not specify it.
-Existing early transition window and disjoint Equity/Corporate quotas preserved.
-`src/shuttles.js`: service break+45 through+55; buses finish active circuits and hold at A home, then become eligible to resume. Manual simulation has no automatic service break. Home-base handling is a safe implementation assumption, not a newly confirmed operating instruction.
-`src/Scene.jsx` and `src/SundayControls.jsx` publish the break/status in the dashboard.

Scheduling95% is not a guarantee that95% have physically parked: road queues and unresolved conflicts can delay completed arrivals.

## Source-path repair
A check failed because the imported `images/HopeCityLayoutC Updated.json` no longer existed. Inspected `src/campusAnnotations.js`, the test/config, and actual image files. `images/HopeCityLayoutCUpdated.json` exists, retains735×566 dimensions and expected access labels. Changed only import/reference filename; source geometry checksum is unchanged. Reran the same failed check/build successfully.

## Verification
- `node --test tests/traffic-priority.test.js tests/eleven-performance.test.js`:18/18 pass after final code integration.
- `node --test tests/service-timing.test.js tests/service-shuttle-break.test.js && npm run build`:7/7 pass and production build passes. Build still reports existing large-bundle advisory.
- Browser:11 a.m. selected,20× selected and started; clock advances from10:15 into departure window. Satellite/trace, cars/buses and right-hand dashboard rendered in screenshot; break status reads11:45–11:55. No browser FPS measurement was available. Browser console reports Vite proxy/HMR websocket failure; hard navigation served current code successfully.
- Preview remains running at `http://localhost:5194/` (server`bg_650918cf-e809-4ab7-a6e1-7a59fdd74365`).

## Important remaining blocker: sustained traffic gridlock
A6,300-second numerical run of the new schedule completed without route-construction errors, but traffic stalled. At the end only113 cars had entered;93 moving vehicles remained, and shuttle trips stopped increasing. `eleven-service-timing-run.json` records this adverse result, not a successful full-service demonstration.

At2,100seconds the blocked-state snapshot shows:
- Bus wait cycle:shuttle4→shuttle1→shuttle5→shuttle4 near the shared Black Permit/internal corridor.
- A-North arrival/departure wait cycle:964→91→188→964; opposing provisional staging connectors share the same narrow track.
- Exact snapshot saved in `eleven-blocked-state.json`. MINION2 independently confirmed these cycles from code/data.

Do not fix this by waiving following, occupied-crossing holds, or swept-body checks. Next routing work is explicit, direction-aware internal corridor admission/reservations and verified shared queue segments (or source-approved separate aisle paths). The present performance fix makes calculations faster but does not establish reliable end-to-end11 a.m. traffic throughput or a fully completed fleet break in congestion. Approved physical geometry remains unchanged.
