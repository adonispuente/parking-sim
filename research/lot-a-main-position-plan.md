# Lot A Main Position and bus passage plan

## Goal
Manage the three Lot A Main Position approaches in five-car batches, using shuttle > departure > arrival priority; temporarily allow fleet buses to pass through one another while retaining all car interactions.

## Inspected context
- `src/lotAControl.js` currently gates only North/South departures in ten-car batches.
- `src/parkingRoutes.js` routes those departures via provisional station [112,50]; general arrivals currently bypass explicit station metadata.
- `src/campusSimulation.js` builds lane metadata only for those departures.
- `src/sharedTraffic.js` applies following, conflict reservations, and swept clearance to every pair.
- `src/shuttles.js` blocks launch for every moving vehicle near leg origin.
- `src/SundayControls.jsx` and `src/Scene.jsx` still describe ten-car departure-only control.

## Steps
1. Route general A arrivals via the existing station without altering approved pavement/building geometry; attach matching control metadata on normal and redirected routes.
2. Replace departure-only control with one three-approach admission controller: North, South, main inbound. Count actual cleared passages; switch ready approaches after five, preserving priority and clearance. Keep compatibility statistics for existing consumers.
3. In parallel, exempt only bus/bus pairs from following, crossing, sweep-clear, and leg-start blocking. Retain bus/car safety and existing independent scheduling.
4. Update dashboard/map names and document the temporary bus-only exception.
5. Run focused control and interaction checks and production build; attempt browser verification. Do not run broad tests.

## Risks / boundaries
The station and internal aisles remain provisional. Black Permit has a separate right-side route and shuttle home geometry does not traverse this station: do not invent a detour through it. Only paths physically passing the position participate. All three actual position approaches share the same controller, not independent departure and arrival gates. Queue readiness must not grant a distant car a permit that strands other approaches. Active crossings clear before priority changes. Bus mutual passage is a deliberate temporary nonphysical rule, not real-world permission and not a remedy for car/car head-on path conflicts.

## Out of scope
No changes to approved campus geometry, service timing, capacities, shuttle dispatch, or new traffic physics.
