# Sunday service implementation

## Goal
Run configurable Sunday arrival/transition scenarios with section occupancy, staggered old-cohort departures, 50% reopening and service-specific shuttle circuits without modifying approved geometry.

## Inspected context
- traffic.js has three origins, per-lot reservations, immediate initial-departure queues, retained arrived vehicles and a binary phase. No zones or service clock.
- shuttles.js has five buses, 4B/1C or all-C dispatch, individual remote-stop return trips, adjustable dwell.
- shuttleRoutes.js computes obstacle-avoiding but provisional internal paths from the approved annotation; pavementRouting.js is a street grid with directed feeder edges. Corporate physically supports both directions but paths share centerlines.
- Scene.jsx renders outlines, grouped parked markers and live buses; main.jsx owns dashboard settings and resets.

## Approach
1. Add parkingZones.js: confirmed zone allocations, reservations, initial lot-to-zone distribution, defaults A North→South and B South→Banana→Pocket→North; badge capacity stays within A411.
2. Add sundayServices.js: fixed service presets for 9:00, 11:00 and 1:15; finite adjustable arrival demand, departure-dominant opening window, deterministic staggered old-cohort release and long-stayer tail. Reopening gates latch once50% of general A / full B clears. Partial B stays open. Preserve manual lot closures.
3. Integrate mixed mode, section assignment, continuous zone route endpoints and old-vs-new cohorts into traffic.js. Free occupancy only when a car leaves parking; never release new-service cars with old-service cohort. C remains operationally open, subject to physical capacity.
4. Delegate shuttleRoutes.js/shuttles.js and two-way street lane separation to GPT MINION 2, not LOCAL AI. B circuit: A Black Permit→B west→B South→B South pickup→B North pickup→B west→Black Permit home. C: preferred entrance→roundabout→selected N/S stop→valid exit→home. Three active at 9, five at transitions; adjustable C direction.
5. Dashboard service presets, clock, demand, arrival-source split, departure timing parameters, controls, zone progress. Occupancy polygon fill is clipped inside existing traced zone polygons, clearly represents occupancy percentage not real stall positions.
6. Verify capacity sums, reservations, badge restriction, A/B reopening, partial-B behavior, arrival-only first service, mixed transitions, old/new cohorts, B south-first paths, shuttle circuit order, opposing lanes and build; inspect browser if available.

## Assumptions / editable defaults
- Third service is fixed at 1:15, per Commander correction; do not add service-time editing. Internally use13:15 for daytime chronology. Final dismissal start defaults to12:30 as a documented illustrative parameter, not a service-time setting.
- 9 AM demand950; 11 AM illustrative general demand1224 (A general360+B487+C377≈55%C); final demand300. These are editable presets, not forecasts.
- First-service arrival window45min. Transition first20min departure-dominant, then arrivals; an adjustable early-arrival percentage can inject arrivals in the initial window and they are directed only to open lots.
- Departure cohorts use deterministic varied readiness with a configurable long-stayer tail; B slower than A, not invented physical obstacles. Passenger boarding/walking is not modeled.
- Badge capacities are51 inside A411; no unlimited parking or extra capacity. Unspecified zone paths remain provisional.

## Out of scope
No approved polygon edits, invented stalls, passenger agent simulation, new permissions, advanced vehicle physics or automatically inferred hidden aisles.

## Commander steering during implementation
- Third service fixed1:15, no schedule-time editor.
- Equity Drive is also two-way: apply direction-separated lanes inside existing Equity pavement; no geometry edits.
- Remove Run/replay10-car dashboard button.
- Add10× and20× playback beyond5×, retaining bounded physics substeps.
- Deprioritize formal tests for the next20minutes: paused scenario suites after steering; latest edits receive production-build and quick visible browser checks only.

## New operational default needing review
B departures default to a configurable section split: North/Pocket use northern exit toward Equity; South/Banana use west main exit toward Corporate/feeder. This split is an implementation assumption, not a newly confirmed volunteer rule. Dashboard can route all B departures to either exit. C defaults to northwest exit toward Equity and can choose northeast. C shuttle branch choice is made when reaching the roundabout.
