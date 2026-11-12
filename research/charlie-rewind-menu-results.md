# Charlie entry, reverse playback, Operations cleanup — results (2026-11-07)

SPARTAN implemented most of this (plan: research/charlie-rewind-menu-plan.md; logs in research/runs/charlie-rewind-*.log) and stopped before browser verification. CLAUD took over at 13:22, re-verified independently, and finished it.

## Outcome
- **Charlie entry:** every built C arrival lane (cWest, eCWest, e2CWest × all four C zones) passes within 1.5 m of the Lot C entrance position (#63). After admission it stays west of x=1050, so it never heads toward the far-right northeast exit. Car departures use cWest only; the northeast exit is shuttle-only. Test: tests/charlie-staffed-entry.test.js.
- **Reverse playback:** recorded frames (src/playbackFrames.js, src/playback.js) restore earlier states immediately. The engine rebuilds once when forward playback resumes. Browser check at 11:00 and −30×: clock 10:45 → 10:43 → 10:40, and arrivals issued 284 → 195 → 108.
- **Operations menu:** small per-lot parked counts (Lot A / B / C) sit under Sunday service flow. Badge share is fixed at 5%. Removed: parking-occupancy section, empty-lots / A-full / B-full buttons, volunteer section, four-b-one-c section.
- **CLAUD additions (src/main.jsx):** removed the "C roundabout volunteer direction" selector, which now uses the engine default "auto" (busier C side). Removed the dispatch-mode status line that printed "four-b-one-c". The engine's dispatch logic is unchanged.

## Tests updated to match current Commander rules (tests/eleven-performance.test.js)
- C car departures now expect cWest only. The old expectation was cEast + cWest, which contradicts the shuttle-only northeast exit rule.
- The 5-bus repeated-trip window grew from 300 s to 600 s. Diagnosis showed no stuck bus: with staggered launches and 30–60 s boarding, the C bus finishes its first circuit after 300 s. At 600 s every bus has ≥2 trips; at 900 s, 3–4.

## Verification
- `npm run build`: pass.
- 57/57 focused tests pass: recorded-rewind, seekable-playback, playback, charlie-staffed-entry, eleven-performance, northern-radio, sunday-shuttle-circuits, shuttle-staggering.
- Full suite: 29 failures before these test updates, all in legacy suites (model, campus, lot-a*, shuttles, equity-routing on the retired HopeCityLayoutVectors.json, and others). They are not caused by this change and are not fixed.
- Browser: verified on http://127.0.0.1:5214/ (bg_93bcc05d-4583-4e9b-bc7e-9ca1e0810382).

## Limitations
- Headless rewind ran at about half nominal speed (≈2 sim-min per 8 s at −30×). Rewinding past the recorded window, and resuming forward, triggers a full rebuild that pauses visibly at 11:00 load.
- The Routes overlay still draws all source traces, including the shuttle-only northeast exit. Live car lanes are proven by test, not by the overlay.
