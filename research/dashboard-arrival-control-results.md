# Dashboard, retained parking, and Equity arrivals — verified results

## Implemented
- Dashboard is a separate right-hand column on desktop, below campus on phones, never a traffic-control overlay.
- Arrivals stay parked indefinitely; explicit Departures phase releases newly simulated parked cohorts without resetting the simulation. Initial occupancy remains a count without invented departure positions.
- Equity Entrance and Equity Entrance & exit 2 have separate arrival-rate controls and distinct traced origins; both use the staffed Lot C preferred entrance, never the normally exit-designated access.
- Feeder retains A → B → C preference. Lot C-only Equity traffic holds outside campus if C is unavailable but other lots have room. This holding behavior is a reversible implementation assumption, not a newly confirmed church procedure.
- All lots allocated/full: campus-at-capacity status, send-away counts, no overflow destination or indefinite full-campus queue.
- Visible staffed C marker and grouped parked-arrival markers. These are not traced stalls, full internal-aisle navigation, or a complete parking maneuver implementation.
- Approved source geometry and saved layouts unchanged.

## Verification
Command: `node --test tests/arrival-controls.test.js tests/equity-routing.test.js && npm run build`
Result: all 9 focused checks pass; production build passes with existing >500 kB bundle warning.
Checks cover ten retained arrivals over 600 simulated seconds, explicit continuous departure start, distinct Equity origin containment, staffed C entrance stations, feeder spillover, C-only upstream waiting, all-full rejection, and reservation overbooking prevention.

Browser checks at http://127.0.0.1:5190:
- Desktop 1440px: map ends at x1100 and dashboard begins at x1100; no overlap and no horizontal body overflow.
- Phone 390px: map bottom y666.8 equals dashboard top y666.8; body width390; no overlay/horizontal overflow.
- App and WebGL canvas render without an application alert. Vite HMR websocket failed in the controlled browser; manual reload successfully rendered changes.
- All lots full + Start traffic: visible at-capacity notice, 10 then20 sent away, zero campus entries, zero queued arrivals.
- Visual review confirms desktop dashboard and mobile placement. C volunteer marker visible but label small at full-campus zoom; phone readability remains limited.
- Browser preview server: bg_bd2a97ae-721c-40dd-bcda-0c135c4df5a9, port5190. Replaced stale agent preview at5186 to free an exhausted background-process slot; other running previews untouched.

## Files
src/main.jsx, src/styles.css, src/Scene.jsx, src/traffic.js, src/trafficPolicy.js, src/vectorRoutes.js, src/pavementRouting.js; tests/arrival-controls.test.js, tests/equity-routing.test.js; research/dashboard-arrival-control-plan.md and this report.

GPT MINION 2 handled the two road-routing modules and initial Equity test. Lead inspected/fixed the entrance2 boundary spawn and test station indexing, integrated the engine/UI and performed verification. LOCAL AI was not used.

## Remaining limits
No individual stall assignments or traced internal-aisle parking paths; grouped markers sit at observed arrival endpoints. Shared-intersection collision handling remains incomplete. Initial parked counts have no observed positions and are not emitted in departure mode. Newly parked simulated cars are released only after the explicit phase change. Sending away occurs outside campus, counted without inventing a turn-around journey.
