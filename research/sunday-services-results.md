# Sunday service flow — implementation and evidence

## Included
- Fixed service starts9:00,11:00,1:15. No service-time input. 9AM scenario starts8:15;11AM transition starts10:15. Third transition dismissal12:30 is an explicitly provisional default.
- Finite demand presets950,1224,300; adjustable attendance, Equity approach share, early arrivals, main departure readiness window and lingerer tail.
- Previous-service vehicles receive deterministic varied readiness times; B is slower by a configurable-code assumption. New arrivals stay parked, not included in the old cohort release.
- A general capacity360 (North210,South150), badge51 within total411. B South75,Banana100,Pocket8,North304,total487. C North343,South343,total686. Campus1584, general1533+badge51.
- Lot A North-before-South; B South-first circulation and South→Banana→Pocket→North default assignment; C source-polygon occupancy fill west-to-east. Each zone selectable by volunteer direction, never beyond capacity.
- Full A general arrivals held until180 or fewer general parked/inbound remain, excluding badge pool. Initially full B held until243 or fewer; partial B stays open. Gates latch once reopened, manual lot closure still applies. C has no automatic departure hold but capacity enforced.
- Reservations only become occupied when arrival reaches the section staging point. Occupancy frees when vehicle starts departing from that point; downstream queue can remain on campus.
- Three active buses at9AM (illustrative2B/1C split); five in transitions. B pickup circuit visits South then North, west exit, Black Permit home. C preferred entrance→roundabout→volunteer-selected North/South pickup→exit→home. Direction choice occurs at roundabout. Extra buses home; active trips complete before retirement.
- Departure dispatch continues serving occupied B even if B was full; arrivals-only full-B dispatch sends active buses to C.
- Corporate and Equity two-way lane placement derives local cross sections from unchanged pavement, aims3.8 source pixels right of midpoint. Feeder remains operationally northbound. Following deadlock corrected using a common heading/order for near-parallel paths, spatial buckets limit neighbor comparisons.
- B departure section split is configurable: North/Pocket→north exit→Equity;South/Banana→west exit→Corporate/feeder. This is an illustrative default, not a confirmed new rule. C exit selectable. No pavement geometry changed.
- Next service button carries actual section occupancy after scheduled arrivals finish and roads clear of ordinary vehicles. This resets to the next service scenario/dismissal clock with buses staged at home; it is not a seamless all-day passenger simulation.
- Dashboard ten-car replay removed. Speed choices1,2,3,4,5,10,20× with simulation substeps≤.05s. Start/pause and speed accessible at top of dashboard.

## Evidence gathered before requested test pause
1. `node --test tests/sunday-services.test.js tests/arrival-controls.test.js tests/equity-routing.test.js tests/playback.test.js`:21/21 passed after preserving human-readable Equity route names.
2. `node --test tests/sunday-shuttle-circuits.test.js tests/sunday-services.test.js tests/equity-routing.test.js`:14/14 passed. This includes complete120-minute numerical runs with all active shuttles, no stranded demand, no routing issues, previous cohorts cleared, new cohorts retained; Corporate opposing bus-width cross sections west/north/vertical cleared.
3. Recorded 9AM numerical terminal occupancy A360,B487,C103;zero departures;950 arrivals; inactive buses4/5 remain home. 1:15 run retained300 in A,none in B/C.11AM issued1224;parking distribution varies with lingering old cars and available reservations, not a forced final55%C target.
4. All nine zone arrival/departure routes sampled against annotated roof/blocked polygons. Internal aisle plausibility and swept clearance not proved by this.

## Latest steering edits and validation boundary
Commander then requested two-way Equity, removal of ten-car replay,10×/20×,and deprioritizing tests for20minutes. Formal test suites were paused. Latest edits additionally include roundabout-time branch choice, initial-zone override behavior, corrected initial gate readout, carry-forward button, configurable B/C departure exit policies and controlled-area capacity display. Tests were not rerun for these edits; do not present older green suites as proof of them.
- Latest `npm run build`:PASS (50 modules). Existing large-bundle warning remains.
- Browser: desktop app renders;20× selected and clock advanced; A North fills210 then South, with source-aligned green fill visible.11AM scenario displayed10:15 and A/B departure holds,C open. Five active buses visible in roster. Phone390×844 renders map with dashboard beneath, not overlaid.
- Browser screenshot evidence: shots/shot-43be7d4bacb8.png desktop during9AM; shots/shot-b01c1a022e1b.png phone during transition.
- Browser dev websocket warning present; headless preview needed a manual page reload after edits, so do not claim browser HMR verified.

## Changed implementation files
New:src/parkingZones.js,src/sundayServices.js,src/campusSimulation.js,src/parkingRoutes.js,src/occupancyFill.js,src/SundayControls.jsx,tests/sunday-services.test.js,tests/sunday-shuttle-circuits.test.js.
Updated:src/traffic.js,src/shuttleRoutes.js,src/shuttles.js,src/pavementRouting.js,src/sharedTraffic.js,src/parkingAvailability.js,src/Scene.jsx,src/main.jsx,src/styles.css,src/playback.js,tests/playback.test.js.
Plan:research/sunday-services-plan.md.

## Open limitations
- Individual stall selection/maneuvers, walking, passenger boarding and passenger-based bus demand are not modeled. Section staging points/grouped markers are honest abstractions, not invented stalls.
- Internal routes remain reviewable estimates in traced pavement/connector corridors. No surveyed aisle directions or swept bus turning safety assertion.
- Equity two-way lanes and latest B split need full-demand mixed-direction scenario reruns after the requested pause. Only Corporate's earlier sampled bus clearance has focused-check proof.
- Fixed starts approved; final dismissal12:30, departure/linger distributions,11AM1224/final300 demand, B zone assignment order after South and B exit section split remain implementation assumptions.
- Backend route graph is a pavement grid plus explicit driveway/internal paths and policies, not surveyed lane/intersection control or realistic signal physics.

Preview server: npm start -- --port5192; http://localhost:5192/ ; network http://10.21.40.70:5192/ ; bg_dba345fa-8bf8-4af7-b1c0-a74f969c4fe7. A stale prior5191 server was stopped to free a background-process slot. Existing other previews were not stopped.
