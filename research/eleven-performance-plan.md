# 11 a.m. performance continuation

## Goal
Reduce lag in the unchanged 11 a.m. transition: preserve service demand, approved geometry, safe spacing and shuttle > departure > arrival priority.

## Inspected context
- `campusSimulation.js` already caches successful/failed routes and attempts departure admission once per access/zone per substep.
- `lanePath.js` already indexes traced segments without changing point/tangent semantics.
- `sharedTraffic.js` builds local conflict windows and repeatedly compares numeric IDs using locale collation; per-tick path poses and conflict pairs allocate extensively.
- `Scene.jsx` currently allocates three meshes with separate materials/geometries per car; count markers are persistent. Playback can run up to forty 0.05-second substeps in one slow 20x frame.
- Existing research has historical performance measurements; they are not all comparable because some include previously unresolved connectors. Fresh baseline recorded in `eleven-performance-before.json` and `eleven-performance-mixed-before.json`.

## Approach
1. Profile an identical 1,800-second 11 a.m. workload, including the mixed traffic period, and capture baseline outcome digest.
2. Optimize the measured hot path first using semantic-preserving indexing/caching. Preserve path sample values, pair ordering and operational priority; do not reduce simulation population.
3. Reduce rendering allocation/draw-call overhead if browser measurement supports it; otherwise avoid an unmeasured rendering rewrite.
4. Re-run the identical workload, compare digest/accounting and shuttle circuits, run the narrow priority/performance checks and production build.
5. Verify rendered 11 a.m. playback and document actual results and remaining limitations.

## Risks / exclusions
Do not infer new traffic permissions, move approved geometry, cap the vehicle population or disable conflict safety to hide lag. Broad tests and unrelated design changes are out of scope. Browser performance numbers apply to this machine, not every phone.

## Commander timing update during this run
- Confirmed approximately95% arrive by45minutes INTO the service; shuttle buses stop10minutes then restart.
- MINION2 owns deterministic arrival scheduler and timing checks. Lead owns the safe home-base shuttle break and dashboard status.
- Interpretation: actual service+45 to+55. Finish current circuits then hold at home; never stop or teleport a moving bus.
- Provisional tail: final5% over service+45 to+60. This changes timing intentionally AFTER the identical-workload performance comparison.
