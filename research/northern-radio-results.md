# Northern radio and reverse playback — 2026-11-07

Implemented directly while Commander reports CLAUD capped. Peer read-only reviews requested; no returned review claimed.

## Delivered
- C exit64 holds only conflicting local Corporate traffic for C shuttle final-return legs. Already-admitted cars and their physical queue leaders clear before the bus. Hold ends after shuttle tail clearance; bus/car body protection and temporary bus-to-bus passage remain.
- All8 staffed positions have shared parkingRadio fleet/status. North roles62/63/64 stay distinct; dashboard shows radio and holds.
- Ordinary C arrivals/departures use staffed west access. Stale cEast/split departure inputs cannot send normal cars through northeast shuttle exit.
- Sustained Clay/east-road waits divert B cars BEFORE launch on existing bWest routes. Provisional:3cars waiting8s east of source x1000, batches5,5s gap. No moving-car swaps; clear queue resumes normal policy.
- Separate elapsed timeline removed; Sunday clock retained. Matched negative/positive5/10/20/30. Reverse rebuilds private state in yielding chunks, never negative physics; pause/speed/input/reset cancel. Fractional reverse ticks preserved.

## Verification
`node --test tests/northern-radio.test.js tests/seekable-playback.test.js tests/black-permit-control.test.js tests/bus-passage.test.js tests/exit-priority-junction.test.js tests/traffic-priority.test.js tests/lot-a-main-position.test.js tests/corporate-wide-road.test.js tests/service-timing.test.js tests/equity-clay-stop.test.js`: **82pass,0fail**. Includes real40-minute eleven handoff regression and real-service private-state replay. Raw `northern-radio-tests.txt`.

`npm run build`: PASS, existing large-bundle warning. Raw `northern-radio-build.txt`.

`node research/northern-radio-smoke.mjs`:40simulated minutes of eleven;613entered(546/34/33),760departed(302A/370B/88C),82active,no routing issues. Bus trips10/10/10/10/8.32B cars diverted; C car access only cWest;8radio positions. Hold exercised2521fixed steps; occupied clearing1294steps; max11cars reserved for hold. Raw `northern-radio-smoke.json`.

First long smoke exposed a new controller deadlock: an admitted car queued behind a held leader on another final lane. Corrected leader-chain handoff while bus stays stopped and body protection remains. Before correction62held/Cbus5trips; after max11/Cbus8trips. Not proof all gridlocks resolved.

Final-source browser: all8signed speeds, elapsed timeline absent, radio panel, forward232.95s then reverse217.15s; pause cancellation verified. Earlier long-history reverse1326.95→1313s. Reconstruction becomes much slower than selected speed on long histories: **no realtime30×reverse guarantee**. Console: Vite HMR websocket warning, no observed application exception. Preview left paused.

## Files
Application: `src/northernCorporateControl.js`(new),`src/campusSimulation.js`,`src/sharedTraffic.js`,`src/playback.js`,`src/Scene.jsx`,`src/main.jsx`,`src/SundayControls.jsx`.
Tests: `tests/northern-radio.test.js`(new),`tests/seekable-playback.test.js`.
Plan/report/smoke/raw: research/northern-radio-*.
Source JSON, geometry and capacities untouched. Unrelated preexisting working changes/archive deletions not reset or claimed.

Preview http://127.0.0.1:5210/ ; existing server `bg_a1e95a87-0869-4dea-8614-1be9d7c8a7f9`.

## Remaining limits
Stop lines, queue thresholds, batch count and internal joins/turn clearance provisional.88C departures in40minutes is not full clearance; remaining internal congestion needs separate diagnosis. Full three-service completion and broad historical suite failures not rerun/resolved. Reverse needs checkpoint/private-state work for realtime performance. Radio assumes instant reliable knowledge, not audio or human reaction delays.