# Charlie entry, rewind, Operations cleanup

Goal: C cars enter at staffed #63, reverse displays earlier vehicle states, and Operations shows small per-lot parked totals without retired controls.

Read: playback.js, Scene.jsx, main.jsx, SundayControls.jsx, vectorRoutes.js, parkingRoutes.js, sourceRouting.js and replay tests. Current reverse reconstructs the whole engine every frame. C access names are not proof of final path geometry.

1. Audit/repair full C entry paths, preserving source map and northeast shuttle-only access.
2. Record bounded presentation history for immediate reverse; rebuild private engine state once on forward resumption. Never step physics backward. Older history reconstructs with progress/cancellation.
3. Fix badge share at 5%, add A/B/C parked totals, remove mounted occupancy/volunteer sections, occupancy shortcut buttons and four-B/one-C material. Keep service clock and initial parked numeric controls.
4. Save focused coverage before tests. Verify replay determinism, cancel/reset, C geometry, build and fresh browser.
5. Save results/checkpoint. No unrelated Corporate repair. Bounded history cannot remove all old-history/resume reconstruction cost; disclose limitations.