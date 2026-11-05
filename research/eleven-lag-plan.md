# 11am transition lag fix

Goal: make the unchanged 11am service responsive, retaining vehicle demand, priority and routing.

Observed: departure admission scans every ready parked vehicle on every small simulation step. `startClear` resamples all active paths for each request. Route generation is cached only on success, so an unresolved internal connector is retried for each waiting driver on every step. First measured15 simulated seconds took26.2s CPU and reported `Unverified shuttle endpoint connector: b`, with only22 moving vehicles. Scene also reconstructs parked count labels and geometries whenever counts change. Playback may call40 substeps in a slow20x frame.

Plan:
1. Use a short repeatable11am benchmark and CPU profile to identify dominant work.
2. Remove repeated route-generation failures and redundant departure admission checks without suppressing parked cars or inventing routes.
3. Optimize shared path sampling/render churn only where the measured profile or browser check warrants it.
4. Repeat identical workload and compare state/accounting, run focused safety checks and production build, then verify11am playback in browser.

Risks: route-generation failures must remain visible and cannot strand a whole queue; existing geometry and approved operating rules remain authoritative. Do not lower demand, delete vehicles, disable safety priority or reduce simulation accuracy to hide lag. Broad historical suite and unrelated UI redesign are out of scope.
