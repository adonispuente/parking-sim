# Reverse playback and northern Corporate controls

CLAUD owns analysis and implementation; SPARTAN coordinates/reviews/verifies. Read-only route audit requested from MINION1; replay audit from QWEN. Handoffs queued, not completed.

Inspected: playback.js, Scene.jsx, main.jsx, campusSimulation.js, vectorRoutes.js, trafficPolicy.js, SundayControls.jsx, clearImageSource.js, shuttleRoutes.js, corporateDriveOperators.js.

1. Remove standalone Simulation timeline; retain Sunday service clock. Add -5/-10/-20/-30 alongside matching positive speeds. Rewind actual state deterministically, never negative physics; bound memory/work and cancellation.
2. Enforce C staffed entry63; far-right64 exit-only, normal operation shuttle-only. Normal C departures use west63. Source geometry stays unchanged.
3. Coordinate distinct northern staff62/63/64; detect east/Clay backup and dispatch provisional five-car B batches toward feeder on existing routes. Resume east on clearance. No artificial whole-road hold or moving-car teleport.
4. Preserve shuttle>departure>arrival priority, occupied crossing clearance, Main5 / feeder10:5 and UI ordering.
5. Verify focused replay/controller/route tests and build, actual mixed-service smoke, browser UI and decreasing real replay clock. Check private controller/dwell/reservation state roundtrip, reset/input cancellation, batch count and clear-road behavior.
6. Save evidence/checkpoint with limits. Historical B queues and full-service failures are not presumed resolved. Full-service30× reverse performance and field congestion thresholds remain unproven.

Assumptions: simulation-time removal refers to separate elapsed timeline, not Sunday clock; C far-right normal car use denied; small batch defaults to configurable5, not a claimed field count.
