# Current source and routing correction

Commander corrected the source: use ONLY images/HopeCityLayoutVectors.json and matching images/HopeCityLayout.png (735×566). No active src import references the deleted Map with streets JSON. tracedMap.js now converts these native pixels directly, with no old-frame registration. WORLD aspect ratio matches the new image. Layout revision 2 migrates generated trace geometry on load and backs up previous local saved layout; operational lot settings remain.

pavementRouting.js computes directed, pavement-contained street paths inside the new feeder/Corporate/Equity polygons, including the labeled Equity Entrance junction. Grid search uses northbound-only feeder edges, and visibility simplification checks every 0.05 image pixel. Traffic uses piecewise linear curves so CatmullRom overshoot cannot cut corners outside the polygons. Vehicles leave street paths only at access throats. Internal connectors between entrance and exit remain illustrative; C east and B north use the labeled exit corridor in reverse for arrivals based on confirmed bidirectional access, not newly invented entrances.

Verification: npm run build passed. Street-segment probe passed 3,276 interpolated points. Five ten-car scenarios (empty, A full, A+B full, badges100%, shuttles100%) each completed all ten arrivals and departures. Initial occupancy remains parked. Full vehicle-body containment, swept turns, lane separation, merge priority, and browser visual approval are NOT verified. Shortest pavement-contained routes may run close to curbs; they are not engineered lane centerlines. Browser navigation is currently blocked by preview ownership verification after an initial blank-page check.

UI: dwell seconds, badge/shuttle percentages, departure counts. A/permit and B west exits head feeder north; B north and C head east to the Equity corridor. Equity route bends with the labeled road; do not confuse image-south on its bend with feeder southbound permission. Equity fallback C→B→A remains provisional.

Earlier research/vector-routing-notes.md registration is superseded by this source switch, not a current transformation.

Changed code: src/tracedMap.js, src/vectorRoutes.js, src/pavementRouting.js, src/traffic.js, src/Scene.jsx, src/main.jsx, src/model.js.
Preview launched at http://127.0.0.1:5186 via bg_53752fa6-c2d7-4499-89a0-fbaf1932d153. npm start remains the regular launch command.
