# Exit-trace display — SPARTAN independent acceptance

Date: 2026-11-10. Project: `/Users/adonispuente/Desktop/Developer/parking-sim`.
Decision: ACCEPTED for display-only scope. This is not live-driving activation, M4 visual sign-off, individual-parking completion, or cleanup completion.

## Review and ownership
CLAUD's freeze correction packet SHA-256 `d167d6eeb8a9b8c19f35973116c897be64b5331d337ff20c747df5ebea03ef9c` was verified against the project bytes. QWEN had already landed the correction before this review; SPARTAN did not edit implementation. The packet's technical approach is approved retrospectively; no claim that a new implementation release preceded the already-landed change.

Independent exact-content assertions prove the source is its pinned pre-fix version with exactly the permitted one-line replacement. Test bytes begin with the pinned complete prior file; the appended test exactly matches the packet. Tests 1–10 are untouched. QWEN's saved red log shows 10 passing and test 11 failing with `world point not frozen in exitpaths-16`; SPARTAN freshly ran the final combined tests, not the historical red step.

## Fresh commands and results
Executed from the exact project root:
- `node '/Users/adonispuente/Library/Application Support/ai.skynet.harness/workspaces/agent/verification/exit-display-4958.mjs'`: exit 0.
- `node --test tests/exit-path-overlay-view.test.js tests/exit-path-source.test.js`: 39/39 passing, exit 0.
- `npm run build`: exit 0; bundle-size warning remains.
- `npm run layout:check`: exit 0; existing B North width warning remains (no physical-clearance certification).

Static results: `research/runs/exit-display-independent-4958/static-results.json`.
121-path CURRENT manifest is the `files` object in that JSON, independently generated after the freeze correction. It supersedes the earlier QWEN post-display manifest's stale defect note and pending-state interpretation when used with this acceptance record. The static JSON retains `browser-acceptance-pending` because it was emitted before the browser check; this report records the subsequent browser acceptance.

- 32 traces: A6/B12/C14; all 201 world-point arrays and all label anchors frozen.
- Geometry SHA-256 before/after/live: `d2b1d9210be6c1410672d80bc4871bdad3674e26701e1741f75c02d0f61d76e7`.
- All 64 raw routes and staging/main/exit-tail/vector/shuttle geometry exactly match `research/runs/exit-pilot-3dbb/before.json`.
- 119 original protected paths present: only permitted `src/Scene.jsx` differs from pre-display baseline. The new overlay source/test bring current manifest to 121 paths.
- `ACTIVATED_EXIT_IDS=[]`; pilot source/test absent. No traffic activation.

## Browser evidence
Agent-owned isolated Vite server `http://127.0.0.1:5222/`, background `bg_3958d686-54ae-4d42-8293-80020dbbaeb8`, was confirmed running before testing. The existing Commander preview was not replaced. A stale agent-owned server on port 5208 was stopped to free a background slot.

Browsed live source, clicked existing Routes/Top/3D controls, and checked the actual canvas using exact CSS attribute selectors through `browser.test_state` (arbitrary page eval was refused, so no eval used).
- 3D Routes ON: `data-exit-trace-live={"routes":true,"groupVisible":true,"lines":32}` matched.
- Top Routes ON: same matched, Top `aria-pressed=true` inspected.
- Top Routes OFF: `{"routes":false,"groupVisible":false,"lines":32}` matched.
- 3D Routes OFF: same matched.
- 3D Routes ON again: 32 matched, no duplicate build. Actual off-white lines reappeared.
Legend reads `32 drawn · A6 B12 C14 · 0 in traffic use`, and `drawn exit geometry; traffic use listed above`.

Screenshots (SPARTAN workspace):
- Top ON: `shots/shot-7779287b0e85.png`
- Top OFF: `shots/shot-f45d835053b0.png`
- 3D ON (initial and repeat same pixels): `shots/shot-2058899fb499.png`
- 3D OFF: `shots/shot-33177069ccd0.png`
Visual review confirms off-white paths in all three lots, not just stored inventory. Thin overlapping lines and tiny labels are not individually readable at campus zoom; panels cover portions of the map. Exact line count is established by live scene-traversal instrumentation, not inferred from pixels. No direction arrows added to these reference traces. Other older overlay chevrons remain unrelated.

Console: Vite websocket/HMR connection error in controlled-browser transport; no application runtime exception observed. HTTP rendering and explicit UI toggles worked. Build succeeded independently. Do not describe console as error-free.

## Files involved
QWEN's complete display slice: changed `src/Scene.jsx`, added `src/exitPathOverlayView.js`, added `tests/exit-path-overlay-view.test.js`. SPARTAN changed none of these.
SPARTAN saved verification script, independent evidence, this acceptance, and refreshed migration context/current-record headings. No original files moved/deleted by cleanup.

## Next boundary
Display work is finished and accepted. QWEN may close its display task; no further display edit requested. S1 remains PARKED and requires a separate release naming this post-display baseline and A1. Cleanup rev3 planning was approved previously, but neither archive-only Part A nor removal Part B is released by this report. Before archive-only release, check scheduled/peer writers and revalidate the approved packet/scope. Removal remains separately gated after recovery evidence review. Individual parking and South-first Main gridlock remain open. M4 remains in progress.

## Test-server cleanup
After evidence capture, SPARTAN stopped temporary server `bg_3958d686-54ae-4d42-8293-80020dbbaeb8` on port5222; tool confirmed the process tree gone. No new test server remains running from this acceptance. The Commander's pre-existing preview was not stopped.
