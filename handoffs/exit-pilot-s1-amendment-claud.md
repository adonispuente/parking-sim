# S1 amendment A1 — resume Lot B Pocket → north traced exit after the display slice

Author: CLAUD (plan only; wrote no application code). Reviewer: SPARTAN. Implementer: QWEN.
Amends: S1 packet `a592f229` (`handoffs/exit-pilot-3dbb-qwen.md`). Everything in `a592f229` stays in force unless this file changes it.
Requested by: SPARTAN display release `e1aa7e96` ("S1 resumption dependency").
Status: **DRAFT. HELD.** QWEN must not start S1 until BOTH of these exist:
1. SPARTAN's independent acceptance of the display slice (`research/runs/exit-trace-display/`), naming an accepted post-display hash file.
2. SPARTAN's explicit release of this amendment.

S1 must not run concurrently with the display slice or with repository cleanup.

Project: `/Users/adonispuente/Desktop/Developer/parking-sim`

## 0. Current state (checked read-only, 2026-11-10)

- `src/exitPathOverlayView.js`, `tests/exit-path-overlay-view.test.js`: absent (display not yet implemented).
- `src/tracedExitPilot.js`, `tests/traced-exit-pilot.test.js`: absent.
- `research/runs/exit-pilot-3dbb/qwen-s1/`: absent. No S1 trial tree exists anywhere under `research/runs`. S1 is clean and unstarted; there is no partial trial to salvage.
- `research/runs/exit-trace-display/` holds only display preflight files.
- SHA-256 at check time: `src/Scene.jsx` `54761a84…`, `src/parkingRoutes.js` `b9de117c…`. Informational only; the gate in section 2 uses the accepted post-display file, not these.

## 1. Ownership correction

`a592f229` says "CLAUD has no tokens; do not assign/wait for him" and "SPARTAN plans". That is superseded by the Commander's current rule: CLAUD writes all coding instructions, SPARTAN reviews and verifies, QWEN implements. QWEN still does not wait on CLAUD during implementation; questions go to SPARTAN. SPARTAN still owns final acceptance.

## 2. Baseline: post-display accepted state, not before.json

The pre-display `research/runs/exit-pilot-3dbb/before.json` is **obsolete as a gate**. After the display slice, `src/Scene.jsx` will intentionally differ from it, and two new files will exist. Using it would stop S1 for a correct reason-free mismatch.

Use instead:
- **Protected-file hashes:** the post-display hash file named in SPARTAN's display acceptance (expected to be built from `research/runs/exit-trace-display/protection-sweep.json` "after" values plus the two new overlay files). Record its path and SHA-256 verbatim. If SPARTAN's acceptance does not name one, STOP and ask SPARTAN; do not construct your own.
- **Raw routes:** still the 64 routes in `before.json` (the display slice must prove 64/64 identical; if SPARTAN's acceptance says otherwise, STOP).
- Keep `before.json` only as historical provenance for the route set and S0 numbers.

Preflight (record every result in `research/runs/exit-pilot-3dbb/qwen-s1/preflight.txt`):
1. Every path in the post-display hash file matches by path. Any change or missing = STOP. Do not restore files to pass.
2. `src/exitPathOverlayView.js` and `tests/exit-path-overlay-view.test.js` present, hashes equal the accepted values.
3. `ACTIVATED_EXIT_IDS` in `src/exitPathOverlayView.js` deep-equals `[]`.
4. `src/tracedExitPilot.js` and `tests/traced-exit-pilot.test.js` absent; `src/parkingRoutes.js` has no import matching `/^\s*import\s[^;]*?from\s+['"]\.\/tracedExitPilot\.js['"]/m`.
5. `node --test tests/exit-path-overlay-view.test.js` passes; record N/N. This is the pre-S1 overlay count.
6. Re-run `a592f229` step 1 drift check against the 64 raw routes.

## 3. Allowlist change (one file, one line, promotion only)

Add to `a592f229` "Allowed live changes":
- `src/exitPathOverlayView.js` — **only** the `ACTIVATED_EXIT_IDS` line, changed from `Object.freeze([])` to `Object.freeze(['exitpaths-34'])`. No other byte in that file may change. Not the color, labels, tag text, validation or exports.

Rules:
- Make this edit **only in the promotion step**, after every behavioral gate in `a592f229` has passed. Never edit it in the live tree during trial work.
- In the isolated trial copy, make the same one-line edit so the trial runs the overlay tests in the promoted configuration.
- **Trial rejected or stopped:** the live `ACTIVATED_EXIT_IDS` stays `[]`, and the live `parkingRoutes.js` has no `tracedExitPilot` import. Both must be true together; the overlay test 10 fails otherwise.
- No edit to `tests/exit-path-overlay-view.test.js`, `src/Scene.jsx` or any other display file. If the tripwire or any overlay test fails after promotion, STOP and report; do not edit the test to pass.

The activation tripwire (overlay test 10) is an integration alarm only. Passing it does not show #34 is behaviorally safe; the `a592f229` traffic gates do that.

## 4. Verification additions

Add to `a592f229` "Checks / evidence", in both the trial copy and the live tree after promotion:
- `node --test tests/exit-path-overlay-view.test.js` → must be N/N with the same N as preflight step 5. Record log and exit code.
- Protection sweep against the post-display hash file, keyed by path. Allowed differences after promotion: `src/parkingRoutes.js`, `src/exitPathOverlayView.js` (activation line only; prove with a diff showing exactly one changed line), `tests/exit-path-source.test.js`, `tests/b-north-direct-exit.test.js`, and `src/exitPathSource.js` comments only. Allowed additions: `src/tracedExitPilot.js`, `tests/traced-exit-pilot.test.js`. Anything else = FAIL. Write `qwen-s1/protection-sweep.json` with per-path before/after SHA.
- Browser step: in addition to `a592f229`'s Top/3D checks, read `canvas.dataset.exitTraceOverlay` and confirm `activated` equals `["exitpaths-34"]`, `total` 32, `initLines` 32; read `exitTraceLive` after one Routes OFF→ON cycle and confirm `lines` 32. Confirm the #34 tag reads `#34 · B · drawn, in traffic use` in the Top ON screenshot and the other 31 still read `drawn ref`. Save screenshots.
- `npm run layout:check` and `npm run build` as already required.

`tests/exit-path-source.test.js` count is still not isolation evidence. The protection sweep is.

## 5. Handback additions

Add these lines to the `a592f229` handback:
```
Gate prerequisites: display acceptance artifact <id>; amendment A1 release artifact <id>
Baseline hash source: <post-display file path + SHA-256>
Preflight: 6 checks, results
ACTIVATED_EXIT_IDS live at end: [] | ['exitpaths-34']
exitPathOverlayView.js diff: none | one line (paste)
Overlay tests: preflight N/N; trial N/N; live after promotion N/N
Protection sweep: paths checked; unexpected changes: none | list
Browser: exitTraceOverlay.activated; exitTraceLive.lines; #34 tag text seen
```

## 6. Unchanged from a592f229

All traffic-safety and promotion gates stand: isolated trial first; 63/64 raw and built routes identical; 8-car bPocket cohort alone and with live arrivals and buses; matched 11:00 and 1:15 services against control; Lot A raw and built exact; South-first lock remains open and is not to be relabeled; no traffic.js, campusSimulation.js, controller, policy, source JSON or presentation changes; stop on any bus or arrival conflict with the #34 dogleg. This is still not individual parking.

## 7. Riskiest assumption and kill-test

Assumption: SPARTAN's display acceptance will produce a usable by-path post-display hash file, so S1 can anchor to it without re-deriving one.
Kill-test: preflight step 1. If the accepted display artifact names no such file, S1 stops before any edit and SPARTAN names or creates the baseline. Cost of the test: one command.
