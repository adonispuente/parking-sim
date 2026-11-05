# Corporate Drive traffic
Goal: two independent arrival streams follow the approved S-shaped Corporate Drive trace.
Context: Scene.jsx uses looping previewRoutes and hides traffic in default trace view; main.jsx has a preview toggle; tracedMap.js supplies the approved road pavement polygon.
Steps: derive a provisional centerline inside trace-24; offset right-hand lanes and validate samples against pavement; simulate arrivals, spacing, exits and pause; render on both trace and editable views; expose per-end demand and reset; build and inspect browser.
Unknowns: lane geometry is inferred from pavement, not an approved lane annotation. Speeds and distances are scene units, not meters. No priority rules or parking movements inferred.
Out of scope: lot turns, parking occupancy, shuttle routing, operational training claims.
Verification: production build, bounded engine spacing/pavement checks and browser inspection where available. Preserve source annotation and existing layouts.
