# Shuttle stagger and Lot A departure control

## Goal
Buses depart independently with varied 30–60 second boarding dwell, badge cars turn toward their parking area rather than A's shuttle pickup, and a staffed A North/South merge alternates up to ten exiting cars per side.

## Inspected implementation
- `shuttles.js`: five persistent buses, 3-second initial spacing, fixed dwell; breaks finish circuits.
- `parkingRoutes.js`: obstacle-avoiding internal paths to grouped section staging points.
- `campusSimulation.js`: section departures launch independently and immediately decrement occupancy; no A batch controller.
- `sharedTraffic.js`: physical following and priority-aware conflicts.
- `Scene.jsx`, `SundayControls.jsx`, `main.jsx`: staffing markers, reporting, fleet controls.

## Steps
1. Add reproducible per-bus/per-visit dwell and staggered home dispatch; preserve safety and service breaks.
2. Inspect badge route against labeled pixels, use an explicit right-side internal waypoint if verified by pavement/obstacle checks. Do not change approved geometry.
3. Give A North/South a common reviewable merge station and a ten-car alternating departure controller. Count actual gate passages, not assignment/parking deletion. Empty-side fallback; badge and buses excluded. Keep safety constraints intact.
4. Show staffed position and live batch/dwell status; update configuration controls.
5. Run narrow scenarios and production build, attempt browser validation, document what remains approximate.

## Risks and scope
Exact internal aisles/control station are not traced: route waypoints remain provisional. Incoming traffic is not newly batched because the explicit described alternation concerns North/South exits. No new capacities, geometry, passenger simulation, or broad performance rewrite. Existing internal-corridor gridlock is not assumed solved.
