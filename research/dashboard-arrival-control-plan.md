# Dashboard and arrival routing update

## Goal
Keep the campus unobscured by the dashboard, retain parked arrivals until explicitly released, and send inbound Equity traffic through Lot C's staffed preferred entrance.

## Inspected context
- src/main.jsx nests traffic-controls inside map-bottom; styles.css makes it a scrolling overlay.
- src/traffic.js schedules every new parked vehicle for departure after a default 20 seconds. Initial occupancy stays stationary.
- src/Scene.jsx removes arrival meshes when parking completes, so parked cohorts currently disappear.
- src/vectorRoutes.js routes all Equity sources from the same western feeder origin. The vectors also label Equity Entrance & exit 2, presently excluded from street containment.
- src/trafficPolicy.js supports preferred C access but default engine priority currently assigns Equity arrivals to A.

## Approach
1. Add distinct pavement-contained Equity origins using existing labeled roads/accesses (GPT MINION 2; no LOCAL AI).
2. Make arrival-only the default, retain parked cohorts, and expose explicit departure phase switching without resetting vehicles.
3. Enforce C-only assignments for Equity arrivals; hold upstream if C is unavailable; keep feeder A/B/C priority.
4. Render a staffed C entrance marker and grouped parked-vehicle indicator at existing arrival endpoints. No invented stall locations or zone capacities.
5. Move controls into a non-overlapping right-hand dashboard on desktop, below map on narrow screens; preserve appearance.
6. Verify routing/retention/phase checks, production build and browser layout at desktop and phone widths.

## Risks and unknowns
Internal aisles and individual stall maneuvers are still untraced. Parked indicators represent cohorts at route endpoints, not validated spaces. Separate Equity inputs represent labeled approaches, not assumptions about arrival counts. Initially preloaded occupancy still lacks validated departure origins and will not auto-spawn cars.

## Out of scope
No campus geometry redesign, full routing graph rewrite, invented parking stalls, advanced collision physics, or arbitrary driver-mistake percentages.
