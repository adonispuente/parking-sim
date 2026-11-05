# Labeled arrival and departure routing

Goal: vehicles use HopeCityLayoutVectors labeled access corridors, feeder travel stays northbound, and departures follow confirmed destinations without changing approved map geometry.

Context: current traffic.js hardcodes arrival-only paths in Map with streets pixels; vectors use a separate 735×566 frame. main.jsx/Scene.jsx report arrivals but no departures.

Steps:
1. Register vector geometry using shared landmarks and document residuals; preserve both original image frames.
2. Build arrival and exit routes through labeled access polygons, including A public/permit, B west/north, C entrances/exits.
3. Add visible short-dwell departures and separate counters, keeping occupancy/reservations consistent.
4. Expose dwell/shuttle options and confirmed policy in controls; run production build and focused routing checks.

Confirmed: feeder north only; A/Black Permit exits to feeder; B west exit to feeder; remaining B/C exits east toward Equity. Permit accepts badges and shuttles only. Feeder fills A then B then C; Equity favors C.

Assumptions: short demonstration dwell (20 seconds) is not a real parking duration. Initial parked cars remain stationary; newly arriving vehicles depart. Internal paths remain approximate where no aisle trace is available. No new intersection priority or automatic turning permissions.

Out of scope: modifying approved buildings, parking space fabrication, full collision/intersection simulation.

## Source-image repair during implementation
The old `images/Mosst updated satelite image.png` import no longer exists. The scan manifest establishes its 1698×1378 coordinate frame; `research/scans/primary-preview.png` is available at those same dimensions and visually shows the matching campus. Scene now imports that retained image rather than stretching the differently framed 735×566 vector image. A build passed after this repair. Exact original-file hash equivalence was not established.
