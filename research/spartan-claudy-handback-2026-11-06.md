# SPARTAN → CLAUDYBEAR handback

November6, run e77af7df. Commander explicitly asked SPARTAN to continue while CLAUDYBEAR budget-limited. No duplicate implementation worker launched. Read this before older checkpoint sections.

## Current disposition
- Completed B fixes retained. B7 forbidden sweep stays vertices20–24.
- Prior Lot A median remains UNACCEPTED diagnostic working state. Current parkingRoutes hash2eec5773…cafa7; sharedTraffic36e2dc34…49f1. Global exact conflict-window experiment remains reverted.
- SPARTAN bounded outbound12px experiment FAILED final-service gate and was restored. Full evidence research/spartan-main-width-experiment-2026-11-06.md. Do not redo it or call it active.
- Requested playback feature IMPLEMENTED and checked by SPARTAN, not independently reviewed by CLAUDYBEAR. No traffic repair is claimed.

## Retained source changes
1. src/playback.js: retains old advancePlayback API for compatibility, adds PLAYBACK_SPEEDS=[5,10,20] and createSeekablePlayback. UI uses fixed.05-second ticks for live and replay, integer ticks/frame accumulator, full factory reconstruction of private state, frozen input bundle, chunked yielding/progress, cancellation/latest-request-wins, and atomic publication only on completion. Negative time never passed to engine.
2. src/Scene.jsx: controller owns simulation; frozen startup options on explicit reset/scenario/demo; current input changes invalidate/restart and pause; cancel on reset/unmount; seek updates complete sim, clears stale meshes and refreshes occupancy/dashboard. consumedSeek prevents stale request replay after reset. Rendering/camera remain independent.
3. src/main.jsx: exactly5/10/20, initial5; native timeline0..7200seconds (expands with live playback); current elapsed/time target; pointer release, keyboard keys and Go-to action; rewind-to-start; pause while seeking; both Start buttons disabled during seek; useful progress/error/invalidation messages.
4. src/styles.css: timeline styles matching existing palette.
5. tests/seekable-playback.test.js:12 new tests. Compatibility tests/playback.test.js unchanged.

Backups: research/spartan-playback-backup/ has original4 source files. Road backup/candidate separate. Do not restore source wholesale: other retained work predates this run.

## Verified results and raw evidence
- node --test tests/playback.test.js tests/seekable-playback.test.js:15/15, exit0 (research/spartan-seekable-focused-final.log).
- Standard7-file regression:56/56, exit0 (spartan-seekable-targeted.log).
- npm test final:147pass/27fail/1TODO,175tests, suite exit1. Exact27 failing names unchanged, no new failures or prior failures fixed (spartan-seekable-suite-final.log and spartan-seekable-failures-final.json). Outer logging command0 does NOT mean full suite passed.
- npm run build:exit0, existing >500kB bundle warning (spartan-seekable-build-final.log).
- Real demo and all3 services replay tests: queues/reservations/parked vehicles/IDs/departures/controller records/seeded shuttles equal after rewind-forward; service9 live-vs-seek equality;11/final transition equality; speed partition invariance; cancellation before/during chunks; input invalidation and zero-time controls.
- Browser actual UI: only5/10/20, initial5; keyboard Home/ArrowRight sought1sec; Start advanced clock; rewind restored0 and paused. End key sought full7200sec for9 service (950entered/950parked, complete occupancy/shuttles); then selected11 service, reset0, End reconstructed7200sec with actual90active/109entered/71parked/1115waiting and52departures on road,12:15 clock, shuttle/control states. Speed change to20 preserved7200; switching scenario to manual reset0 without replaying old seek. These browser numbers use varied30–60sec dwell and.05ticks, NOT identical configs to.1/fixed3sec traffic smoke.
- Browser screenshots in SPARTAN workspace shots/shot-5289af44097a.png and shots/shot-3cc7d4641822.png. Browser console only observed Vite hot-reload WebSocket connection error and devtools info, no application exception observed. Reload was explicit after final source changes; do not rely on failed HMR.
- Source identity research/spartan-seekable-final.sha256; road restored hashes also saved. No fresh post-restore traffic smoke claimed; road restoration proven by hash. All traffic experiment commands ran on candidate BEFORE restoration; preserve attribution.

## Limitations
Full reconstruction starts at origin for each seek: long mixed-service jumps take tens of seconds, yield in chunks, and have no snapshot acceleration. Initial range is2hours for service/manual/demo, not a promise of total all-day replay. Engine library advancePlayback still supports legacy1–20 callers; user-facing UI only offers5/10/20. Live rate/lot-open/phase/shuttle/zone/exit changes restart history rather than log input events. Service demand/timing startup inputs still require Apply & restart. No independent specialist review yet. Full-lane Main TODO and27 failures stay visible.

Road gates remain open: historic prior Main nine950/0stalls,eleven109/102/west9,final58/105/west3. No accepted cure for whole-corridor deadlocks or simultaneous admission. #59/pass-only, Equity#61 spur, functional-control coverage, fleet-bus exception, person-level75% actual on-time attendance remain unresolved. Never mistake scheduled cars for people at service.

## Exact next action for CLAUDYBEAR after reset
1. Reconcile checkpoint top/source hashes; review new playback implementation/tests independently without rewriting it. Fix any found defect as bounded change before checks.
2. Resume ROAD diagnosis from failed width evidence, especially North179 holding post-Main arrival aisle and queued outbound interaction with1226. Inspect full routes and Main controller together. Ground local widening/geometry/admission plan using actual lane and stop windows; simultaneous nonconflicting entry/exit must not remain a global single-admission workaround. Keep5-car batch fairness on actual conflicting approaches, all medians/two-way roads and collision thresholds. A safe controller redesign needs explicit movement-conflict coverage, not simply deleting holds.
3. Save bounded implementation+coverage BEFORE checks; focused/runtime/full-lane, targeted/full exact failures/build/all3 traffic+west/throughput gates. Revert only owned changes if regression, preserving settled physical requirements. Checkpoint every milestone.

## Schedules and processes
Existing5:10PM Central handback and5:15PM readiness prompts updated (not duplicated) to these actual milestones. They are source-only reviews, not duplicate workers or independent execution proof. Can pause/edit in AUTOMATE › SCHEDULES. No new routine created because existing coverage is identical. This run's test server was http://127.0.0.1:5207/, bg_fefbd588-a188-4340-a03a-40b57a3b1a33; final cleanup recorded separately in checkpoint/history. Pre-existing5197/5198 processes were not ours and were untouched.