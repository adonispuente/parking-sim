# Parking simulation — proposed milestone roadmap

## Current — Exit reference display independently accepted (2026-11-10, 4958)

CLAUD plans all features/milestones and coding instructions; SPARTAN reviews/verifies; QWEN implements. This overrides older solo-planning entries below. Display accepted: all 32 drawn exits A6/B12/C14 visible in Top/3D under Routes; ON/OFF/repeated ON live scene counts remain exactly32 without duplicates. Labels are small at overview zoom; no direction inferred and ACTIVATED_EXIT_IDS remains empty. Exact one-line deep-freeze correction plus appended test verified; all201 world points frozen, geometry unchanged. Fresh combined tests39/39, build and layout check exit0. Vite HMR websocket error observed in controlled browser, no application exception. All64 driving routes/auxiliary geometry unchanged. Original119 protected paths present, only allowed Scene.jsx changed; fresh121-path current manifest at research/runs/exit-display-independent-4958/static-results.json (files object). Browser-pending field there predates subsequent acceptance; use with handoffs/exit-display-acceptance-4958.md.

S1 live-driving pilot remains PARKED, A1 technically approved but requires separate release. Cleanup rev3 instructions APPROVED, execution HELD; display prerequisite met but archive-only Part A requires scheduled/peer-writer check and explicit release, removal Part B a later separate release after recovery review. No cleanup removal or savings claimed. Individual parking and South-first Main lock OPEN; M4 still in progress, not M5. Refreshed migration context handoffs/parking-sim-new-chat-context.md; final cleanup outcomes still owed when complete. Older entries below preserved as history, not current ownership/status.


## Current — Exit catalog independently verified; bounded Pocket north pilot specified (2026-11-10, 3dbb)

QWEN S0 received and SPARTAN fresh28/28catalog tests PASS. All112baseline entries unchanged/present; fresh recursive snapshot64routes/119protected files. No live app changes this turn. QWEN-reported build/full-suite baseline is not independent behavioral acceptance; South-first lock remains an actual open defect, not automatically a stale fixture.

Next isolated pilot is ONLY out:bNorth:bPocket, using exact six vertices from ExitPathsAndC source34 in outward draw order, unchanged staging and downstream north-road suffix from vertex1. Derived lead4.010px and outbound join10.504px are roof-clear;203internal samples match display pavement. Not yet activated/accepted. QWEN codes alone from handoffs/exit-pilot-3dbb-qwen.md; SPARTAN plans alone while CLAUD unavailable. Packet requires63other raw/built routes exact, live-production cohort+arrival+shuttle progress, matched default eleven/final horizons, narrow tests/layout/build/browser/rewind and safe rejection instead of scope expansion. Queue outcome recorded separately.

Catalog cleanup moves non-durable git/untracked and whole-tree assertions into one-time evidence without weakening source contracts. Individual coordinate parking is still a later implemented slice: safe row/aisle candidates, unique reservations and metadata lifecycle, nearest grounded church destination default, worker-directed placement, capacities/access retained. No random pavement scattering or visual-only placement claimed as simulation behavior. Evidence research/runs/exit-pilot-3dbb/. No redraw needed. M4 remains in progress; no South-first repair or universal-green claim.

## Current — SPARTAN solo planning while CLAUD unavailable (2026-11-10, 82b4)

Commander temporarily directs SPARTAN to plan alone because CLAUD has no tokens. QWEN remains sole coding owner from detailed bounded packets. CLAUD's previously queued review is not a blocking prerequisite; no new CLAUD work and no claim that the queued request was canceled. Existing QWEN S0 assignment is preserved, not duplicated. Review actual catalog handback first, then SPARTAN selects and specifies one live exit pilot; coordinate parking follows separately. No application/test/map edits or fresh behavioral acceptance in this ownership update. South-first gridlock and seven legacy failures remain open; M4 remains in progress.

Updated plan/packet and solo-planning-update.md in research/runs/exit-paths-8831/. One-shot read-only handback follow-up scheduled in two hours (1a4f79f2-2f50-4366-bfd1-b17f3fc17499); no new recurring review. Earlier joint-planning/CLAUD-dependency entries below are historical and superseded while CLAUD is unavailable.

## Current — ExitPathsAndC and coordinate parking prioritized (2026-11-10, 8831)

Commander supersedes South-clearance follow-up as next priority: use images/ExitPathsAndC.json for realistic exits, then individual parking throughout lots with nearest-church preference and worker-directed flow overrides. New standing crew allocation: SPARTAN+CLAUD plan together; QWEN codes from detailed bounded packets. One implementation owner.

SPARTAN verified50shapes (32exit lines: A6/B12/C14,11polygons,4points,3circles), all coordinates finite/in1374x1118 frame; referenced PNG byte-identical to registered Clear Image.png. Source SHA bcbc332dda8ad2bb8ac5d7050bdb9b5877354a5d78e12ae0ef0e5d4c226b6eb0. ExitPaths.json currently byte-identical. NoMedians now48shapes equals first48new-source shapes; its old16shape/hash acceptance is historical, seven used presentation polygon bindings unchanged. Do not restore/trim Commander drawings. New C point48/polygon49 are not automatically traffic or median policy.

Actual parking model remains zone counts plus shared launch points, not per-car spots. Lead plan describes slot identity, exclusive reservation, local arrival/departure joins, metadata carry/rewind and nearest-vs-flow policy. Pavement is not all parkable; approximate candidate positions must not be advertised as surveyed stalls or used to inflate capacity. No new redraw requested.

CLAUD read-only design review confirmed QUEUED f54ddc48; not received. QWEN isolated S0 exit-catalog implementation/tests confirmed QUEUED bd3ada93; not executed or accepted yet. S0 allowed only new src/exitPathSource.js and tests/exit-path-source.test.js plus report; no runtime activation. SPARTAN changed research/docs only, no app/test/map/controller files and no traffic/build/full-suite runs this turn.

Evidence/packets: research/runs/exit-paths-8831/{intake.json,intake-and-plan.md,qwen-s0-packet.md}. Next reconcile CLAUD plan+QWEN coded catalog, then assign smallest live trace-to-exit pilot with actual lane/traffic progress checks. South-first lock remains OPEN/deferred, seven legacy failures remain; M4 still in progress and visual approval separate.


## Current — South-first Main lock reproduced; unsafe trials rejected (2026-11-10, e4f0)

South robustness is now a confirmed preference-dependent behavioral defect, NOT just stale tests. Fresh public solver sweep on actual a/eA entries and both exits:16pairs/6204samples,23 before-release and114 downstream obstructions (South/South). Eleven default auto10:05–11:00 and final default12:05–13:15 clear; eleven A preference=aSouth freezes from~10:38:50 through11:00. Confirmed repeat: admitted South departure251 yields to gate-held South arrival1000; final Main201/138/39. Zero routingIssues does not mean no lock. No universal Lot A clearance.

Four isolated trial variants rejected: clearing one conflict exposes others; tested alternatives also freeze default or South-first. NONE promoted. All114 protected files and64raw routes EXACT unchanged before/after. Fresh focused27/27 PASS and original default eleven probe/progress gate PASS. Diagnostic verification exit0 explicitly records SouthFirstBehavioralAcceptance=false; it proves reproduction, not repair. No app/test/map/policy edits, build/browser/full suite or server changes. Seven inherited failures remain recorded, not rerun. QWEN bounded assertion inventory queued6009a4c2, not received; CLAUD unassigned after quota exhaustion.

Evidence:research/runs/lot-a-south-followup-e4f0/results.md and verification.json, solver sweep, live scenarios, repeat dependency chain, rejected isolated trials. Next: jointly resolve South approach and terminal-arrival interference in isolation; require both default AND South-first eleven through11:00, final default through13:15, unchanged gate/batch/hold/collision rules and unrelated routes before promotion. No redraw requested. M4 remains in progress; uniform pavement/grass visual verdict remains separate. Earlier repaired-default claims stand only for that scenario, not South-first.


## Current — Lot A Main fresh verification and QWEN receipt (2026-11-10, 8408)

QWEN independent source-state audit RECEIVED (b03b06a0):111/113 original protected files match; only parkingRoutes.js and traffic.js differ, controller and maps unchanged. His failed CLAUD partial progress artifact predates SPARTAN's lane-builder repair; it is not the final repaired run. QWEN did not run fresh behavioral acceptance.

SPARTAN freshly reran the production eleven scenario10:05–11:00 (.05step,rates18/18/0):firstLock=null, progress gate PASS, Main counts210/150/360. Focused27/27 PASS; layout/build PASS with existing warnings. All114 current protected hashes (includes new regression test) and64 raw routes match accepted takeover snapshot exactly. No further app/test/map/policy edits. No fresh browser or full suite; independent-agent behavioral acceptance not claimed. Seven inherited legacy failures and broader South clearance remain open. M4 remains in progress; pavement/grass visual verdict pending.

Created and listed enabled Sunday07:00 America/Chicago Main-gridlock regression routine63e3336b-5fc1-498c-9155-aaf2acc03a04, first Nov15, results here. Existing routines not duplicated. Evidence:research/runs/lot-a-main-followthrough-8408/results.md and verification.json. Earlier QWEN-queued wording below is historical and superseded by this receipt.


## Current — Lot A Main takeover repair verified (2026-11-10, 5cd4)

SPARTAN took sole source ownership after Commander requested takeover from quota-exhausted CLAUD. Live source contained CLAUD's North separated approach despite earlier stale absent/pending records. Fresh partial control reproduced296→961 Main freeze through10:50. SPARTAN preserved already-separated Main routes locally in lane building (60px arc, exact Main anchor), rather than changing gate/collision/hold policy. Only raw out:a:aNorth differs vs original64-route baseline; six built Main combinations change,58 unrelated built routes exact. Raw Main/common tail/staging/vector/shuttle geometry and maps/policies unchanged. Original strict traffic.js file gate expanded explicitly for this local geometry fix, not silently weakened.

Fresh live UI-faithful eleven/.05/rates18/18/0 run through11:00: no60s near-Main stall sample; original progress gate PASS; final Main counters North210/South150/inbound360. At10:50 browser counters210/150/329 and exact rewind reconstruction; zero page errors/routing issues. Built North held clearance1.225world; new public-production North solver and45-minute progress regression PASS. Focused27/27 PASS; layout/build PASS with existing warnings. Source changes are CLAUD's src/parkingRoutes.js, SPARTAN's src/traffic.js plus new tests/lot-a-main-two-way.test.js;111 of113 original protected files unchanged.

LIMITATION: legacy narrow command still fails7 of31 assertions (control9 failures; no new failing names). Broader South full-lane/chord conflicts remain open, plus stale fold/setback/offset assertions. Existing tests not weakened; no universal Lot A clearance certification, no full suite. Repair of reported scenario verified; broader South robustness remains follow-up. QWEN takeover check queued, not independently received. M4 remains in progress; uniform pavement/grass visual verdict separate/pending. Earlier queued/absent implementation wording below is historical, superseded by this entry.

Evidence/results/review: research/runs/lot-a-main-takeover-5cd4/. Existing preview5220/bg_f9778b74-93b8-4662-afad-1ca45ad598b7 confirmed RUNNING. No redraw needed.


## Current — Lot A Main independent gates ready (2026-11-10, 2e0e)

Approved no-redraw repair remains assigned to CLAUD; implementation and independent acceptance remain PENDING. Intake of live parkingRoutes.js still showed the original shared connector. Follow-up status/evidence request on the existing assignment confirmed queued this run (turn3e82fe6e-6fcf-4479-9b72-4641dc602416); no completed handback received. No duplicate implementation or source-owner reassignment.

SPARTAN prepared research-only acceptance tools under research/runs/lot-a-main-independent-2e0e/: before.json captures64 exact raw route combinations plus Main/common tail/staging/vector/shuttle geometry and113 protected hashes. gate.mjs self-test passes10 assertions, including rejection of the known blocked10:50 baseline, short horizon, persistent pending admission freeze, unrelated geometry/common-tail drift and policy-source drift. Syntax passes for capture/gate; all113 protected files unchanged. No application/test/map edits, new long simulation, build or browser run.

Next: actual CLAUD handback, fresh capture/clearance/UI-faithful10:50 probe using results.md commands, plus production-solver regression, layout/build/narrow tests/browser and manual diff review. Derived route must stay pavement/roof checked; held gap>=0.9 world; only aNorth approach may change. Uniform M4 pavement/grass visual approval remains separate and pending.

## Current — Lot A Main repair approved, implementation queued (2026-11-10, f914)

Operational interruption to M4: Commander approved the separate aNorth departure approach roughly12px south of inbound traffic with NO REDRAW, confirming simultaneous entering/exiting near Main. CLAUD is sole source owner; implementation confirmed queued (turn9fe63dc7-0fb3-413f-8d2a-15782d4669a7), not completed or independently accepted. Preserve unrelated route geometry, common tail, batch/gate/collision/priority/hold-back policy and source drawings. This explicit route repair does not broaden presentation-only M4 work.

SPARTAN freshly reproduced the UI-faithful eleven/.05/rates[18,18,0] lock through10:50: arrival957 yields to gate-held114; first sustained-stall sample10:37:29, still blocked10:50.113 enumerated src/tests/layout/images files unchanged during baseline; syntax/reproduction assertions exit0. Evidence and bounded contract: research/runs/lot-a-main-repair-f914/. CLAUD diagnosis is received, superseding older queued-only wording.

QWEN source-integrity audit received (5cf7c9a5): four bounded checks pass, no new visual or traffic acceptance implied. Next is actual repair handback then independent clearance, sustained gate progress, route isolation, narrow tests/build/browser checks through at least10:50. M4 remains in progress; uniform pavement/grass visual verdict remains pending. No application edits or full-suite/build/browser execution by SPARTAN in this preparation.

## Current — M4 uniform pavement and grass gaps (2026-11-10, dfd8)

Commander requested all pavement one color and visible non-pavement medians (grass acceptable), superseding earlier per-section color preservation. World pavement now uses existing accepted B North tone #aca9a2 across lots, source roads and S5 patches. NoMedians coverage and building exclusions remain exact. Material-only partitions removed; one pavement mesh has1424 triangles. One flat illustrative #6f8758 grass mesh (822 triangles) colors existing lot-footprint ground minus all approved pavement and buildings; these gaps include landscaped margins, not surveyed individual medians. No tree placement or curb heights invented. Source drawing and all traffic/route/controller/occupancy files unchanged. Diagnostic colors remain unchanged; overlays can span gaps.

Only src/Scene.jsx, src/presentationLots.js, src/presentationMaterials.js and src/presentationPavement.js changed (4 of121 protected files). Fresh20-minute eleven/C300 traffic capture exactly matches before: all geometry/provenance hashes, scenario and departures A208/B270/C138,0routing issues. Independent96600 point samples check pavement and grass exclusion;1494523 non-boundary Canvas pixels show0pavement mismatch. Production build PASS, existing bundle warning. Sixteen matched before/after Top/3D Routes/Occupancy screenshots each,0page errors. Four300-frame running medians16.7ms for both live and isolated pre-edit control, p95≈33.4ms both; first seek7518ms vs7391ms, exact cross-version and backward/forward state. Software-rendered only; no native FPS or full suite.

Review: research/runs/m4-uniform-dfd8/review.html; results.md/verification.json/performance-verification.json alongside. Final visual approval pending; M4 remains in progress. Previous per-section colors are superseded by Commander request, not newly approved. S5 World-road standalone acceptance is not silently closed by this scope.

Separate Commander-reported eleven-service Lot A Main gridlock around10:35 remains OPEN: the20-minute guard ends10:25 and is not evidence against the report. CLAUD's complex diagnosis is confirmed queued, not yet run or received; read-only live sources, isolated exploratory repair only. QWEN's simple source-binding/import check is confirmed queued, not received. SPARTAN owns live presentation; CLAUD and SPARTAN handle complex work, QWEN bounded smaller tasks. No traffic repair claimed; do not assume display change caused gridlock. Preview5220 existing background bg_f9778b74-93b8-4662-afad-1ca45ad598b7 reused. Earlier next-review/per-section/CLAUD-unavailable wording below is historical.


## Current — M4 approved NoMedians coverage integrated (2026-11-10, 4de7)

Commander approved the source preview with "I like the preview, continue". Lot A/B continuous-looking pavement and median gaps now render in World view using literal even-odd source polygons #4/5/6/7/8/11/12, union between pieces and existing building exclusions. Original drawing, all routing/traffic/occupancy/controller sources and diagnostic views unchanged. Points/circles/crosswalk create no new meshes or behavior. Approved B North and existing adjacent section materials remain clipped to the new pavement; new connectors use existing neutral pavement tone. Changed Scene.jsx plus new presentationFill.js/presentationLots.js only; existing S5 road presentation preserved, its separate acceptance not inferred.

Technical checks PASS: source/protected isolation, six synthetic geometry cases,96,600 independent samples,1,494,523 non-boundary Canvas pixels (zero mismatch), fresh20-minute exact traffic geometry/scenario/departures A208/B270/C138 and0issues, build,16 matched before/after Top/3D Routes/Occupancy shots each with0page errors. Initial slow13,155-triangle version optimized by exact slab merging to1,562; rerun four300-frame running medians16.7ms vs old-render control16.7ms; p95≈33.4ms both. Exact seek reconstruction and cross-version state; native performance unmeasured. No full suite.

Review: research/runs/m4-nomedians-integration-4de7/review.html (32 images verified loaded), results.md/verification.json alongside. Final rendered visual approval pending; M4 remains in progress, not complete. Thin seams/angular etched boundaries remain; medians flat, no curbs/landscaping yet. Existing occupancy/Routes diagnostics may span gaps unchanged. QWEN current bounded read-only audit queued, not received; CLAUD unavailable. Next: Commander connected-pavement review, then choose the next visual slice. Earlier provisional/unintegrated statements below are historical for this slice.

## Current — M4 NoMedians intake reconciled (2026-11-10, 78cb)

Corrected drawing source is `images/NoMedians.json`; no longer wait for the originally proposed Lot B returned filename. Registration and 16-shape intake independently checked by QWEN (`research/qwen-tasks/nomedians-intake-audit-2026-11-10.md`). Commander clarified A/C circles mark shuttle-bus travel locations and B circle is a once-yearly reference marker. Keep circles out of pavement fill/cutout geometry and do not create new routes. No mathematical fill-rule ruling needed from Commander based on circle containment. Polygon coverage remains provisional because of self-crossing median traces; review the existing literal-coverage preview before mesh adoption. Review page: `research/runs/m4-nomedians-4357/preview.html`.

Appearance-only scope is unchanged. No source drawing, application geometry or traffic behavior changed by this reconciliation. M4 remains in progress; no new visual acceptance inferred. Earlier absent-return/unreceived-audit/unresolved-circle statements are historical. CLAUD unavailable; SPARTAN/QWEN only. Road-patch independent acceptance remains a separate open thread.

## Current — M4 S5 roads-in-World queued (2026-11-10, e143)

CLAUD's pavement assessment is reconciled against Scene.jsx/layoutOverlay.js/tracedMap.js. Next bounded implementation: render both existing Commander S5 road polygons in normal World view, without changing routing or other traffic behavior. CLAUD is sole application source owner for minimal Scene.jsx + display-only presentationPavement.js. Assignment queued through the group; implementation and independent acceptance remain pending. Contract: research/runs/m4-pavement-connectivity-08bb/s5-world-implementation.md; immutable group artifact 5dd4e597-8528-4468-a89f-20ae5d86cb84.

Narrow verification: exact before/after traffic/scenario/departures, protected-source isolation, build and matched Top/3D Routes/Occupancy checks covering both roads, roof and low-angle layering. No full suite. Lot B returned drawing absent from designated folder this pass: outer outline and landscaped islands still needed. Building cutout redundant; source #43 supplies existing footprint. Packet instructions corrected. No invented geometry or visual-* adoption into routing. Approved B North and pending Banana/Pocket approval states unchanged. M4 remains in progress. SPARTAN changed documentation only; no app/map/test edits or tests run. Earlier assessment-next wording is superseded.

## Current — M4 pavement continuity, presentation only (2026-11-10, 08bb)

Commander clarified the desired connections: **“Pavement appearance only.”** Prioritize continuous-looking pavement rather than another recolor pass. No change to drivable ground, routes, capacity, exit policy, occupancy or controllers. Start with Lot B; separate PNG/LabelMe drawing packet at research/runs/m4-pavement-connectivity-08bb/. Open lot-b-pavement.png in LabelMe (not SVG/HTML), trace visual-pave:lot-b-main and interior visual-cutout:* polygons, save lot-b-pavement-returned.json. These are proposed presentation-only labels, NOT supported runtime overlay kinds; do not merge into layout-overlay.json or the frozen indexed map. No boundary invented.

Preparation verified byte-identical 1374×1118 source PNG, empty sidecar, original65shapes and all111protected files unchanged. No app/map/test edits, build, traffic rerun or server re-probe. CLAUD read-only integration assessment is next; implementation and visual continuity acceptance remain pending. M4 stays in progress. Existing pilot2 technical acceptance remains recorded; new visual approval not inferred. Earlier color-only next-step wording is superseded. Full packet/plan/limitations: research/runs/m4-pavement-connectivity-08bb/README.md.


## Current — M4 pilot 2 technically accepted; visual review pending (2026-11-10, a4a2)

CLAUD's Banana/Pocket World-only materials pilot independently accepted by SPARTAN. Original-image histogram resampling reproduces clear-41 #a19e99/15,661px, clear-42 #9b9791/7,027px and unchanged approved clear-44 #aca9a2/59,271px. Stale peer request's different values are superseded by final live file and reproduced evidence. Only src/presentationMaterials.js changed in CLAUD implementation; all111 protected files unchanged during acceptance. Scene/maps/routes/controllers remain unchanged.

Fresh20-minute eleven/C300 capture: every geometry/provenance section, scenario and departures exact (A208/B270/C138), zero routing issues. Build PASS with existing chunk warning. Fresh matched current/control isolated browsers: live materials, eight screenshots each, zero page errors, exact backward/forward10:40 state reconstruction. Four600-frame medians16.7ms; render counters unchanged. Investigated3D p95 flag with byte-exact approved module served only inside control browser:33.3ms p95 occurs in current clean/control Routes, while opposite views16.8ms. No consistent material-dependent regression demonstrated; native performance unmeasured. Initial seeks current7.45/7.50s vs control6.99/6.91s, below20% review threshold.

**New visual approval remains pending; M4 stays in progress.** Pocket shadow/tree contamination, seams to untreated surfaces, roof contrast and occupancy tint disclosed. No markings/textures, campus expansion, broad suite, app/map/test repair or calibration work. Approved pilot1 remains approved. Evidence/review: research/runs/m4-adjacent-independent-a4a2/{results.md,verification.json,review.html}; http://127.0.0.1:5220/research/runs/m4-adjacent-independent-a4a2/review.html. Existing preview5220/background bg_f9778b74-93b8-4662-afad-1ca45ad598b7 confirmed running and reused. Next: Commander matched visual review before another expansion. Earlier implementation-queued wording below is historical and superseded.

## Current — M4 pilot 2 scoped and implementation queued (2026-11-10, ee79)

Commander said **“continue”** after visually approving the B North pilot. SPARTAN re-read the approved review/results, material lookup, Scene integration and registered source polygons. Next bounded slice: independently image-sampled World materials for **clear-41 (Lot B banana)** and **clear-42 (Lot B pocket)**. Preserve approved clear-44 unchanged; no universal pavement color, photo textures, invented markings or traffic changes. If either candidate lacks adequate photo evidence, leave it unchanged and disclose why.

**CLAUD sole application owner: implementation confirmed queued**, turn 1a0d10d6-df07-4712-bab5-745a094936e4; not yet run or accepted in this preparation record. Full contract: research/runs/m4-next-ee79/implementation-packet.md; immutable group artifact 05e4263f-4411-481d-a8a0-ba1cdc27a799. Reuse existing sampling/browser/capture methods with fresh before/after evidence, build/hash/material isolation and bounded performance/rewind checks. No full suite or duplicate broad campaigns. New appearance needs Commander review; M4 remains in progress. SPARTAN made no application/map/test changes or test/server runs in preparation. Existing preview status was not re-probed, so no current-running claim. QWEN is not assigned a duplicate inventory. Next: receive CLAUD implementation, independently accept, then present matched review.

## Current — M4 pilot 1 visually approved (2026-11-10, d5b4)

Commander verdict: **"I accept the changes"**, responding to the matched B North pilot review. **Pilot 1 is now technically accepted and visually approved. M4 overall remains in progress.** Approval covers the existing World-only clear-44 pavement material #aca9a2 in `src/Scene.jsx` and `src/presentationMaterials.js`, without invented painted lines or traffic changes.

Approved reference: `research/runs/m4-independent-50d1/review.html`, its matched screenshots, and `research/runs/m4-independent-50d1/results.md`. The disclosed neighboring seam, reduced roof contrast and preserved occupancy tint remain known limitations. Use this as the approved pilot reference, not a universal pavement color. Photo textures/aerial draping remain undecided; campus-wide expansion and M4 completion are not inferred.

Approval record only: no application, map or test changes and no test reruns. Earlier visual-review-pending entries below are historical and superseded. Next: scope the next reference-supported M4 presentation slice, preserving routing, capacities, controllers and exit policy. M3/S6 remain accepted. QWEN's incomplete inventory is not retroactively accepted.

## Current — M4 pilot 1 technically accepted (2026-11-10, 50d1)

**B North materials-only pilot implemented by CLAUD and independently technically accepted by SPARTAN. M4 remains in progress, pending Commander visual review; no resemblance approval, photo-texture decision or campus expansion is inferred.** World-only clear-44 material #aca9a2; no painted lines. Independent original-image resampling reproduces 59,271 pixels and the exact recorded median. Both implementation hashes match; reverse-edit reconstruction reproduces the old Scene hash. Against the 110-file baseline only Scene.jsx changed, plus new presentationMaterials.js. All 111 current protected files stayed unchanged during this acceptance.

Fresh 20-minute eleven/C300 capture matches every pre-edit geometry/provenance section, aggregate 4ccccd1f…10b6, departures A208/B270/C138, zero routing issues. Build PASS (existing chunk warning). Fresh isolated browser: zero page errors, eight Top/3D clean/Routes screenshots including Occupancy-off; exact 10:40 seek reconstruction. Four 600-frame medians remain 16.7ms; draw-call/triangle summaries and texture count26 exact; geometry median/max141/142 unchanged, one minimum varies140→141. Top Routes maximum50ms vs33.5ms baseline, while median/p95 show no regression. Initial full seeks6975.5/6932.6ms vs7598.8/7683.8ms baseline: no speedup claim. SwiftShader comparative check, not native FPS or approved budget.

Visual caveats: sharp light/dark seam, reduced roof contrast, preserved green occupancy tint. Original aerial and fresh views inspected. QWEN reconciliation received (2026-11-10, immutable artifact 84317abb-8460-4249-8aba-5fb74360a5e8): his reference inventory was NOT completed and no saved findings exist. This closes the pending-inventory handoff, not an independent reference audit. CLAUD's pixel sampling was already independently reproduced by SPARTAN; the 0–5% parked-car coverage remains a peer visual estimate, not a count or texture approval. Reconciliation report: research/qwen-tasks/m4-reference-reconciliation-2026-11-10.md. No duplicate audit requested; visual review remains next. No full suite, app repair or map/test edit. Evidence: research/runs/m4-independent-50d1/results.md, verification.json, scripts/logs/captures and browser screenshots. Review page: research/runs/m4-independent-50d1/review.html. Existing preview5220/bg_f9778b74-93b8-4662-afad-1ca45ad598b7 reused; no server changes. Next: Commander visual review before expanding the pilot; aerial drape remains a proposal. M3/S6 remain accepted. Earlier preparation-only entries below are historical and superseded.

## Current — M4 baseline reconciled (2026-11-10, d7fe)

**M4 remains in reference/baseline preparation, not visual acceptance.** CLAUD's proposal received and reconciled. B North is surface clear-44/source #44; there are no road items in the generated layout, so no road-ribbon change or whole Equity/Corporate recolor is authorized. Candidate: world-only sampled material for clear-44, with markings only if QWEN's pending reference inventory identifies actual visible lines. Occupancy tint masks pavement: preserve it and add Occupancy-off companion views for visual review, not a hidden simulation change.

Fresh four600-frame running samples, 1440x900 Bravo Top/3D clean/Routes, eleven default A360/B487/C103/5buses, each10:40-start at5x. SwiftShader comparative baseline, not native FPS: median16.7ms in all; p95 Top33.4/33.4ms,3D33.3/16.8ms. Draw-call medians82/152/79/156, texture count26. Exact10:05->10:40 reconstruction7598.8/7683.8ms; backward10:05≈200ms; repeat10:40 car/bus/departure/occupancy state exact. Zero page errors,110protected files unchanged. Fresh separate20min C300 path guard0issues,A208/B270/C138,all4ccccd1f… saved for future before/after. No app/map/test changes, full suite or build run. Initial missing-script check repaired by copying saved research probe after background-limit rejection; same syntax/capture check then exit0.

Evidence: research/runs/m4-baseline-d7fe/results.md, baseline.json, four matched before images, traffic-before.json, protected manifests. Lead-proposed regression review threshold=20% repeat median/p95/seek change, not a Commander-approved budget. Next: QWEN inventory -> CLAUD sole source owner for bounded Scene.jsx surface material + presentationMaterials.js, exact paths/captures/non-display hashes/build/browser/perf proof. Do not invent markings while inventory pending. Final resemblance requires Commander review before campus expansion. M3/S6 stay accepted. Previous kickoff pending/unmeasured wording is historical and superseded.

## Current — M4 started (2026-11-10, 490a)

Commander asked to begin M4 and confirmed crew token reset. **M4 reference/baseline and pilot planning are now started; no styling implementation or visual acceptance yet.** Canonical M4 scope remains reference-led resemblance, unchanged simulation semantics and measured performance/rewind comparison. M3 and S6 maintenance remain accepted.

SPARTAN read the canonical scope/current rendering sources and captured four BEFORE Bravo Top/3D views with Routes off/on, on existing preview5220 (server confirmed running), paused11:00 preset at10:05, A360/B487/C103, 5shuttles, 0roadcars. Provisional pilot=B North, not an approved aesthetic. C staging is not a physical median. CLAUD read-only rendering proposal and QWEN reference inventory are confirmed queued, neither received; no app/map/test source edits or broad tests. High-load performance budget remains unmeasured, not inferred from paused screenshots. Single source owner to be assigned after proposal reconciliation.

Evidence/scope/screenshots: `research/runs/m4-kickoff-490a/`. Lead group packet `d58908bd-cadc-48d2-b689-887a0e00d5dc`. Next: reconcile references/proposal, establish representative render+seek baseline and choose minimal presentation-only implementation. Final pilot resemblance needs Commander review before campus expansion. Earlier M4-unstarted entries below are historical and superseded.

## Current — M3 usability accepted (Commander verdict)

Commander confirms: **“drawing in labelME is easier.”** This satisfies the remaining practical usability criterion. **M3 is complete on the recorded local acceptance gates:** technical slices S0–S6 are implemented and locally verified, and the drawing workflow is accepted. Keep LabelMe with PNG drawing inputs; no replacement editor is needed on usability grounds.

QWEN's independent S6 audit and CLAUD's bounded redraw repair are now accepted. SPARTAN independently verified the repair on 2026-11-10: all six handback hashes match, the real seven-feature layout check and four B North tests pass, isolated +1 px join and roof-blocked copies produce the named checker diagnostics/red lane, runtime rejection/fallback order remain unchanged, blocked provenance warns once and reports configured-not-used, and successful provenance cites the three-point overlay/exit #11. Fresh 20-minute C300 capture matches CLAUD's saved pre-repair record in all eight captured sections and departures (A208/B270/C138), with zero routing issues; build passes with the existing chunk warning. Real Routes view/legend/toggle and Top/Bravo lane label checked. No live source/map/test changes by SPARTAN; 110 protected files unchanged. Full suite and M4 not run. Evidence: `research/runs/s6-redraw-independent-c9da/results.md`. The fail-fast runtime join requirement is intentionally retained, not silently snapped. Parser already enforces three-point/car-only geometry; do not reopen that rejected parser-gap suggestion.

**S6 maintenance accepted — 2026-11-10, c9da:** CLAUD implementation `research/runs/s6-redraw-repair-claud/results.md` independently accepted by SPARTAN. Original packet `9279c1d1-f35a-4631-86e4-9c548a8f939b` is closed; no implementation or acceptance remains pending for this repair. Browser preview reused at http://127.0.0.1:5220/ (`bg_f9778b74-93b8-4662-afad-1ca45ad598b7`), paused Top/Bravo with Routes on. Existing HMR websocket warning remains. Blocked display was verified by a Node runtime/view probe, not a live-map mutation. M3 remains complete; M4 remains unstarted. Earlier sections below are historical.

**Next milestone: M4 — reference-led real-world visual styling.** M4 has not started; this verdict does not choose its aesthetic or authorize an unreviewed visual redesign. M2 field calibration and confirmed directed shuttle-detour topology remain separate open items. The earlier usability-pending wording below is historical and superseded.

## Current — 2026-11-09, m3-s6-c549 (SPARTAN handback continuation)

**S5 visual check complete; S6 B North corridor pilot implemented and locally verified.** Both Commander pave patches render in Routes Top/3D; original Lot A boundary/roof exclusion remain intact. Added only runtime `lane:b-north-direct` with exact pre-existing three points, approved-abstraction/estimated, car-only. Northern-row starts, north AND west exits, section-weighted policy and shuttle paths unchanged. No western-arm connector or fixed split. Source wiring in parkingRoutes/layoutOverlay plus explicit view meaning and guide; original overlay shapes and frozen source untouched.

Fresh narrow checks: layout:check PASS (7 features, expected unknown-width warning); existing B North tests 4/4 PASS; build PASS (existing bundle-size warning); before/after 24,000×.05s eleven/C300 captures exactly equal in every traffic section, departures A208/B270/C138, zero routing issues. All eight raw B departure routes exact. Four named parser rejection probes PASS. Protected source/image/policy SHA checks PASS. Browser Top/3D lane/chevron/runtime labels and Routes toggle checked; existing sandbox HMR warning persists. No full suite or full-hour traffic run. Evidence `research/runs/m3-s6-c549/results.md`, verification.json, source-final.sha256 and screenshots. QWEN bounded read-only S6 audit queued, not received; no independent S6 review counted.

**Roadmap:** technical slices S0–S6 landed; **M3 overall remains open pending the Commander's practical LabelMe usability verdict**, not more drawings or broad tests. M4 styling not started. M2 field calibration and confirmed directed shuttle-detour topology remain separate. Existing preview http://127.0.0.1:5220/ (`bg_f9778b74-93b8-4662-afad-1ca45ad598b7`) reused and left paused, Routes on, Campus 3D. No server started/stopped. Earlier S5 drawing-pending/S6 not-started entries below are historical and superseded.


## Current continuation — 2026-11-09, m3-s5-3318

**S4 independent review received and accepted.** QWEN current immutable artifact `e1aa6094-6d66-4a78-96d2-36bf5e4c2784` supersedes stale `5ea549ec`. His executed review confirms all five additive API decisions, 10/10 S4 source hashes and unchanged traffic sections; current comparison anchor is `research/runs/m3-layout-baseline/s4-review-crosscheck.json`. These are peer results read this pass, not re-executed by SPARTAN.

**S5 drawing packet prepared; pavement integration NOT complete.** Current overlay has no pave polygons. Older maps and preliminary scans use 1698×1378, not current 1374×1118; no registration established. Keep both road-gap disclosures. Canonical plan requires Commander-drawn boundaries, not inferred centerline buffers. New reference: `research/runs/m3-s5-3318/drawing-reference.html`, two actual-source-photo crops, coordinate tables, separate `s5-drawing.labelme.json` + exact source image copy, audit and generator. 56 protected source/map/image files unchanged; packet parser/coordinate/hash checks pass and both crops reviewed in headless browser. No app/map/test edits or full suite/build/traffic rerun. S4 earlier traffic verification remains recorded, not fresh.

**Exact next:** Commander draws `pave:lot-a-entrance-road` and `pave:equity-exit2-driveway` as polygons in the separate packet, excluding nonpavement and joining existing pavement. Save under a NEW name, e.g. `s5-returned.labelme.json` (generator rerun overwrites starter packet). Description: evidence=traced, confidence=estimated, note with uncertainties. Then validate/merge two additions and explicitly wire pavement with explained path diffs; pave shapes are currently advisory. QWEN independent read-only historical boundary audit queued, no result received/counting yet. CLAUD unavailable, not invoked. Broad tests stay deprioritized.

Reference served on existing http://127.0.0.1:5220/research/runs/m3-s5-3318/drawing-reference.html; `bg_f9778b74-93b8-4662-afad-1ca45ad598b7` confirmed running. No server started/stopped. S6 B North pilot remains after S5, approved northern-row starts/both exits unchanged; practical drawing usability check still open. M3 overall not complete; M4 not started; M2 field calibration and confirmed directed shuttle-detour topology remain open. Earlier S4-review-pending wording below is historical and superseded.


## Current acceptance — 2026-11-09, m3-s4-a2d7

**M3 S4 advisory position foundation implemented and locally accepted.** One `pos:` LabelMe point plus one explicit definition now creates a registry entry without rebinding the frozen 65-shape map. Sample `pos:c-layout-demo` is inferred/unknown, unstaffed, advisory/inactive, not a real worker location. No worker/controller/hold/radio allocation. Original eight POSITIONS and CONTROL_POINTS exact; ALL_POSITIONS/OVERLAY_POSITIONS added, ID lookup merged, numeric aliases unchanged and null index guarded. layout:check checks definition stubs and strict role/staffed metadata. Routes Top/3D sample and diagnostics verified.

Fresh bounded verification: ten negative cases rejected; exact old registry; existing positions tests 4/4 pass; layout checker/build pass (existing bundle warning); 24,000-tick/.05s eleven/C300 before/after generated geometry, runtime settings, departures and source-map hash exact, zero routing issues. Overlay provenance/aggregate hashes intentionally differ for one added advisory feature; raw generic comparator exit1 disclosed, explicit path comparator passes. Not a fresh full-hour clearance run. No full suite or broad testing. QWEN read-only review queued, no response or independent acceptance counted; CLAUD not invoked.

Evidence `research/runs/m3-s4-a2d7/results.md` and sibling plan/logs/captures/check scripts/screenshots. Source changes: positions/index.js, new positions/overlayDefinitions.js, layoutOverlay.js, layoutOverlayView.js, RouteSourcesPanel.jsx, scripts/layout-check.mjs, images/layout-overlay.json; guides updated. Preview restarted on same http://127.0.0.1:5220/; replacement bg_f9778b74-93b8-4662-afad-1ca45ad598b7 confirmed running, paused Routes-on Top/Charlie. Old bg_eebde36c-17b9-40a5-8c7a-4e08fb07bf8f stopped. Existing sandbox HMR websocket warning remains.

**Next M3 S5 requires real pavement polygons** for Lot A entrance road and Equity exit2 driveway; source centerlines are not boundaries, so no geometry invented and both disclosures remain. S6 B North second pilot and practical LabelMe usability check follow. Preserve approved northern-row/both-exit behavior. M3 overall not complete, M4 not started, M2 field calibration and confirmed directed shuttle-detour topology remain open. Earlier S4-not-started wording below is historical.

## Current acceptance — 2026-11-09, m3-s3-takeover-9816

**M3 S3 Routes overlay accepted.** Commander transferred unfinished CLAUD work to SPARTAN after token exhaustion. Landed display code needed no repair. Fresh layout:check and build pass (existing bundle warning); fresh 24,000-tick/.05s C300 geometry deep-equals saved pre-M3 capture, all-hash 6cd4b3ec…, zero routing issues. Browser verified Routes off/on, Top/3D C labels and Feeder northbound chevrons, legend and all three diagnostic runtime/confidence/evidence rows. Existing Vite sandbox HMR websocket warning remains. No full suite, broad tests or full-hour smoke rerun. Evidence: `research/runs/m3-s3-takeover-9816/results.md`.

No simulation source/map/tests changed by SPARTAN. CLAUD not invoked; QWEN retains existing bounded tooling work, no pre-edit baseline claim. Existing server5220 reused and left paused; no new server. Next **M3 S4 map-defined position points and definition stubs**, then S5 untraced road patches and S6 B North pilot. Practical one-feature LabelMe check remains. M3 is NOT complete; M4 styling not started. No full worker behavior, new roads or detours claimed. M2 field calibration and confirmed directed detour topology remain open. Earlier S3 queued-only/CLAUD ownership wording below is historical and superseded.

## Current acceptance — 2026-11-09, m3-checker-independent-b6c2

M3 S1–S2 fully accepted, including the bounded checker repairs. Fresh checks: eight/eight malformed-coordinate/cardinality cases produce named errors; real layout validation passes; exact SVG assertions prove only the failing lane red. Repaired source hashes match CLAUD's handback, runtime parameters unchanged. Fresh comparison of saved pre-edit/post-repair geometry captures passes; no fresh traffic run or full suite. Existing build/C300/browser acceptance remains recorded evidence. Parser-rejected files still have no SVG; post-parse geometry errors have exact red highlighting.

Continue **S3: overlay visualization in Routes** with CLAUD sole application owner. Confidence legend, feature IDs and runtime/advisory labels; staging is not median and Feeder rule is not surveyed lane geometry. No new routing/policy/positions. Peer S4 label is numbering drift; positions remain S4 in canonical plan. QWEN retains existing tooling assignment; no duplicate. Broad tests remain deprioritized; narrow post-change checker/build/path comparison/browser only. Contract: `research/runs/m3-checker-independent-b6c2/results.md`. Earlier pending-repair wording below is superseded. M2 calibration and confirmed shuttle detour topology remain separate open threads.

## Current acceptance — 2026-11-09, m3-independent-3b4e

M3 S1–S2 runtime migration independently accepted: fresh 20/60-minute generated geometry deep-equals CLAUD's pre-edit captures, build passes, and the production C300 smoke exactly matches accepted C East evidence (300 clear by10:45, zero routing issues, concurrent623/816, shuttle trips14–15). Browser confirms source-photo review SVG and three legible runtime labels. Full suite not run; broad tests remain deprioritized.

Editing/checker workflow is **conditionally accepted**, not fully closed: malformed points `{}` / `[null]` produce raw TypeErrors, and checker error-color lookup truncates full feature IDs. CLAUD has a confirmed bounded repair queued; no repair result counted yet. Preserve staging-not-median and both distinct Feeder rules. After the exact repros pass, continue S3 overlay visualization in Routes without policy/path changes. QWEN's capture/compare tools are in progress and are post-edit cross-checks, not a pre-edit baseline. Independent evidence: `research/runs/m3-independent-3b4e/results.md` and `verification.json`. Earlier queued-only S1–S2 status below is superseded by this checkpoint.

## Current direction — 2026-11-09, m3-start-ccc4

Commander has deprioritized tests and reports good flow with no observed gridlocks. Continue into **M3 S0–S2** rather than blocking on M2 field calibration. M2 remains provisional and uncalibrated; no new independent handback is counted here. Existing C East acceptance stands; the additional production-preemption test is skipped, not completed. This direction supersedes historical next-step wording below.

CLAUD owns overlay/checker and behavior-preserving C staging/Feeder parameter migration. QWEN owns generated-route baseline tooling only in `research/runs/m3-layout-baseline/`; SPARTAN coordinates and accepts returned work. Assignment status is queued, not a completed implementation. C throat parameters are **not** an observed physical median/no-drive polygon; preserve both different Feeder predicates exactly. No invented roads, source rebinding, import cycles or physical-width certification.

Narrow verification: layout checker, useful invalid-input rejection, unchanged generated paths, production build and existing C300/.05-second smoke. No broad traffic-test expansion or unrelated suite cleanup. S3 visualization follows the returned slice. Execution packet: `research/handoffs/m3-layout-start-ccc4.md`; CLAUD code plan: `research/runs/m3-layout-claud/plan.md`. No simulation source edits, tests or build by SPARTAN in this coordination pass.

## Priority interruption acceptance — 2026-11-09, c-east-independent-b606
SPARTAN independently accepts CLAUD's bounded #64 dependency repair and compatible simultaneous Equity/C-exit flow. No app source changed in acceptance. SHA-verified pre-fix module reproduces C300 stuck283 with86stalls at11:10; repaired .05/badge5/demand clears300by10:45,zero routingIssues. Six-case matrix clears103/300/403 demand/fixed; transient high-load queues disclosed. Actual Equity sources1/2 concurrent623/816ticks; moving cross-gap1.134,local shuttle/car gap1.984. Actual lanes from both flow categories stop for returning C shuttle; no radio stops without release bus.19/19focusedpass;330suite318pass12fail:8standing+4QWEN failures proven identical pre/post radio on immutable test snapshot. Buildpass. Isolated headless browser C300readback,10:38/10:40/10:45/11:10,reverse exact reconstruction/forward resume,zero page errors; screenshots saved. Report research/runs/c-east-independent-b606/results.md.
Detours NOT implemented; no second directed return path established, no road/reversal invented. CLAUD queued permanent actual-lane preemption NEW test only; QWEN queued exclusive M2 test completion plus read-only alternative-route audit. Neither result counted returned. M2 calibration/review remains next roadmap work; full suite not green. Existing5220server still live,no new server. Below historical M2 checkpoint remains relevant to estimator limits.

SPARTAN 117 · 2026-11-09 · Living roadmap; original proposal retained below, implementation status supersedes its historical planning-only wording.

## Implementation checkpoint — m2-demand-5516

M1 independent gate accepted: QWEN22/22, fresh baseline305/297/8 reproduced. M2 first estimated-demand/dispatch slice now implemented. Application defaults to demand; fixed mode retained for comparison and low-level API compatibility. Per-area directional event estimates, committed capacity, nominal trip-time scoring,240s quiet-area priority, home/roundabout-only decisions, zero-demand hold, break/retirement behavior and recorded demand presentation are in place. UI labels provisional2.5people/car×50%ride and20serviceunits/circuit/direction; NOT actual passengers/boardings.

Verified55/55focused; full315tests307pass8fail, exact same8names as baseline; buildpass(existing warning). Three full service probes:zero routingIssues, proxy ledgers reconcile. Controlled200unit fixture/threebuses/20min:fixed160remaining vs demand0, estimated waiting194950→46100unit-seconds; artificial fixture, not field forecast. Browser displayed changing estimates/commitments and quiet safeguard; reverse presentation checked; exact seek reconstruction tested. Preview5220RUNNING,leftpaused5×11am; existing HMRwarning. Evidence `research/runs/m2-demand-5516/results.md`.

**Next acceptance:** QWEN M2 independent new-test gate is queued, not returned. Calibrate demand and compare realistic scenarios before declaring M2 fully accepted or advancing M3. Proxy return demand uses vehicle readiness and does not constrain car departures; first two lifecycle endpoints still have285estimated return units each despite cleared vehicles. M7 must replace this approximation with actual transport/people conservation; do not claim passenger clearance. Reset/carry reinitializes estimate; no daily people ledger. B pickups combined. M1 timing calibration/3pm real staff target remain open. Following checkpoints are historical, superseded here.

## Implementation checkpoint — m1-cohorts-9ab3

M1 gate foundation and vehicle-cohort lifecycle are implemented. Approximate5%early perlot (floor(N/20)), A-only~2%late with <1car rounding; dismissal-linked readiness for initial/current/final cars; transition pre-roll10:05/12:05 with incoming arrival wall clocks unchanged. The25minute main spread and5minute A late tail are provisional, not field calibration. Carry-forward preserves parked car IDs/service/readiness/sections and A gate/release minute; starts no earlier than current clock, stages buses at home. Readiness is a vehicle proxy, not conserved individual people.

Verified83/83focused; full283tests275pass8fail, no new failing names versus273test264pass9fail baseline; buildpass with large-bundle warning. Three full preset lifecycles and reduced-demand nine→eleven→final carry smoke: zero routingIssues; all modeled vehicle readiness due by dismissal+30. Final run at3pm has zero modeled parked/onroad cars, NOT a forced zero target or validation of real cleanup staff: residual cleanup/serve-team population, walkers and return transport remain unmodeled. A blocked-launch regression preserves ready queued cars past3pm.

Browser: final preset begins12:05, dismissals12:15outgoing/2:30current, proxy/limitations visible, recorded reverse clock12:10→12:05. Preview5220leftpaused5x; existing HMR websocket warning. QWEN independent new tests/review queued, not counted as returned. Evidence `research/runs/m1-cohorts-9ab3/results.md`, exact logs, lifecycle.json and failure-comparison.json.

**Next implementation: M2 demand-responsive shuttles.** M1 mechanical lifecycle is ready for independent review; duration calibration and 3pm people/staff acceptance remain open. Do not call the full suite green or claim the observed church attendance/staff target simulated. Original source-grounded table below describes pre-M1 state, not current code.

## Recommendation

**Correct service timing and Lot A's closure first. Second, send shuttles toward the greatest pickup demand instead of a fixed fleet split. Then improve the lane/layout workflow, bring the scene closer to real life, expand positions and add a controlled crossing with walkers and actual shuttle passengers.**

### Revised milestone order

M0 is the comparison baseline, not a competing feature priority. The proposed feature sequence is:

1. **M1 — Sunday timing and Lot A closure.**
2. **M2 — Demand-responsive shuttle routing.** Explicitly the Commander's second priority.
3. **M3 — Real-world lane/layout workflow.**
4. **M4 — Real-world visual styling.** Proposed placement; reference collection can start alongside M1/M3.
5. **M5 — Expandable positions.**
6. **M6 — One controlled crosswalk.**
7. **M7 — Walkers and actual 20-person shuttle loads.** Feed real passenger queues back into M2.
8. **M8 — Expand lot by lot.**

Use small, independently verified slices, not a broad rewrite. No code, maps, schedules or servers change in this pass. CLAUD is unavailable per the Commander; this roadmap does not queue work to him.

## Confirmed requirements from the shared conversation

- Service dismissal is 75 minutes after start.
- Approximately 5% leave 5–10 minutes before dismissal across all lots.
- Approximately 2% linger late in **Lot A**. B/C percentages and linger duration are not established.
- By approximately **3:00 p.m.**, the church is almost completely empty; cleanup crew and some serve-team members remain. This is an attendance/end-of-day constraint, not an exact residual vehicle count or a requirement that all lots be empty.
- Once A closes, vacancies from early departures do not reopen it for stragglers. Reopening needs both dismissal and the 50% threshold. This special latch is A-only; B/C retain normal capacity/manual-closure handling.
- Future work: inside-lot positions, crosswalks, pedestrians and approximately 20-person shuttles. Many people walk instead.
- Improve the current manual LabelMe-coordinate workflow for real-world lot interiors.
- Shuttles should serve the areas with the most people needing pickup; demand-responsive routing is the second feature priority.
- Add a styling milestone to make the simulation look much closer to the real site. Its proposed placement is not a separately approved priority.
- Preserve approved B section-weighted exits and northern-row staging abstraction, C staffed arrival access and current two-exit car policy, occupied-road clearance and deterministic rewind.

## Source-grounded current state

| Area | Current evidence and implication |
|---|---|
| Service timing | `src/sundayServices.js:5–10,92–100`: scenarios begin 8:15/10:15/12:30; departure readiness is relative to scenario origin, default 40-minute window, global 15% lingering plus 35 minutes. Replace timestamps/cohorts, not merely 15 with 2. |
| Reopening | `sundayServices.js:86–105`: A/B gate initialization; occupancy/reservations alone reopen them. Add A's dismissal condition; remove B's special half-full latch, not its capacity protection. |
| Lifecycle | `src/campusSimulation.js:35–38,107–124`: initial cars are previous cohort; only previous-cohort cars depart in transition. `sundayServices.js:93` gives non-transition cars infinite readiness. Dismissal changes require cohort/lifecycle coverage, not just a constant. |
| Carry-forward | `src/SundayControls.jsx:14–20,48`: transfers lot/section totals and resets scenario. Totals alone do not preserve why A is closed or cohort dismissal time. |
| Arrivals | `sundayServices.js:11–18,48–57`; `tests/service-timing.test.js`: retain existing 75% on-time and 95% by start+45 minute arrival policy. Early arrivals and early departures must remain distinct. |
| Positions | `src/positions/index.js`; `src/positions/README.md:26–31`: registry already exists for eight staff plus an unstaffed control. Extend it rather than replace it. |
| Source binding | `src/clearImageSource.js:3–9,25–42`: image 1374×1118; strict 65-shape index/label bindings. Appending a raw point fails; extensions need deliberate migration or a versioned overlay. |
| Geometry | `src/sourceRouting.js:1–2,34–63`: obstacle-checked connectors and lot polygons do not establish legal aisles, direction or vehicle-body clearance. Two untraced road gaps are explicitly disclosed. |
| Shuttles | `src/shuttles.js:14–20,45–50,117–132`; `src/main.jsx:231`: circuits/dwell exist, passenger queues/counts do not. `trafficPriority.js:1–4` has 20-car priority equivalence, NOT 20-seat capacity. |
| Dispatch detail (read for this revision) | `src/shuttles.js:54–70,89–114`: C's automatic branch already compares parked occupancy north/south; fleet assignment still chooses fixed two-B/one-C or four-B/one-C patterns, with an all-C condition. Extend demand response beyond C's branch; occupancy is a proxy, not a measured passenger queue. |
| Presentation (read for this revision) | `src/Scene.jsx` builds material-colored ground/meshes, building masses, vehicles and staff, with source/debug overlays. Plan reference-led improvements to those presentation layers separately from route, capacity and control policy. |
| Replay | `src/playbackFrames.js:1–12`: new visible latch/people/queue state needs frame capture and deterministic reconstruction coverage. |

### Quality baseline: do not restart from stale figures

Latest saved `research/PROGRESS-CHECKPOINT.md`, **connector-independent-5007**: 251 tests, 236 pass, **15 fail**, build passed with existing warning; overall traffic repair is **not accepted**. It records nine peer-classified stale expectations, five A/map cases requiring geometry review and one unresolved C first-tick departure case. These are historical saved results, not tests rerun during planning.

CLAUD's `research/game-plan-2026-11-09.md` is retained as a separate proposal. Its 27-failure baseline is stale; its B-gate question is answered by the A-only instruction; extending 2% lingering to every lot is not supported.

## Proposed interpretations, not new confirmed rules

- Keep A's existing general-capacity basis initially: 360 general spaces, threshold ≤180, badge spaces separate, existing inbound-reservation accounting retained. Confirm before changing that denominator.
- Represent the 5% early share initially as a deterministic **vehicle-cohort approximation** of the stated people behavior. Separate readiness from actual road exits; congestion can delay a ready car.
- Keep LabelMe and add a lightweight connected-lane overlay, not a GIS migration or every-stall reconstruction.
- Use milestone gates rather than speculative dates. Missing measurements are collected before their milestone, not a long interview before planning.

## M0 — Honest comparison baseline

**Deliverable:** exact current failure ledger, saved inputs/source fingerprints and reproducible fixed-tick nine/eleven/final reference runs.

Re-run tests before implementation. Classify failures against current map/policy; do not assume all are obsolete. Require no unexplained new failing names and repair touched-path blockers before accepting a milestone. A fully green suite remains the target; unrelated failures stay explicitly tracked rather than making timing work wait indefinitely.

Capture per-lot parked/inbound/departed counts, routing issues, waits/queues and shuttle circuits. Compare future runs by **wall-clock time/service event**, not merely minutes from a changed scenario origin.

**Gate:** reproducible failures, preserved inputs and passing changed-path checks. Do not delete tests to manufacture green.

## M1 — Dismissal timing and Lot A closure lifecycle

**Deliverable:** accurate departure cohorts and an explicit A closure latch, first on one transition, then all service boundaries.

1. Define start, dismissal=start+75, early window=dismissal−10 through dismissal−5 once per service cohort.
2. Cover early departures. Proposed origins: 10:05 for the 11:00 scenario and 12:05 for 1:15, or equivalent pre-roll. Rebase the first-20-minute arrival stream and phase labels deliberately while retaining arrival quotas.
3. Deterministically assign ~5% early readiness across all lots, document integer rounding. Give A ~2% late lingerers. B/C linger rates and tail duration stay explicitly unmeasured/provisional; do not silently make them 2%.
4. A lifecycle: open → closed/latched → eligible only after dismissal AND ≤50% occupied/reserved general capacity → reopened. Early vacancies never clear the latch. A later fill/closure must support the next service cycle.
5. Remove B's special 50% reopening hold; retain capacity, reservations, manual closures and controller safety.
6. Preserve cohort/service IDs, dismissal time and A latch/reason across carry-forward, or reconstruct them explicitly. The final 1:15 service also needs its 2:30 departure-only tail; no fourth arrival preset is required.
   - Extend final-service validation through **3:00 p.m.**, 30 minutes after dismissal. Ordinary attendees should largely have left the church by then; preserve a separate residual cleanup/serve-team population rather than forcing everyone out. Its headcount, parking distribution and departure times remain unmeasured. Do not equate the Lot A 2% linger estimate with the whole-site staff remainder, silently extend it to B/C, or teleport queued vehicles away to meet the clock.
7. Show gate reasons: “closed until dismissal,” “dismissed; waiting for ≤50%,” or “open.” Keep the simplified menu.

| Cohort | Dismissal | Early-departure window |
|---|---|---|
| 9:00 | 10:15 | 10:05–10:10 |
| 11:00 | 12:15 | 12:05–12:10 |
| 1:15 | 2:30 | 2:20–2:25 |

**Gate:** A stays closed below half before dismissal and above half after dismissal; reopens only when both conditions pass. Full→closed behavior, reservation/badge handling, manual closures and carry-forward are tested. B/C never inherit A's latch. Readiness matches deterministic quotas with documented rounding; actual departures are reported separately. Existing arrival quotas/routes/shuttle clearance do not regress. Rewind through gate transitions and forward resumption reproduces state.

Likely touchpoints: `sundayServices.js`, `campusSimulation.js`, `SundayControls.jsx`, frame capture if needed, service/gate/replay tests. No larger route rewrite here.

**Additional final-service gate — 3 p.m.:** run the 1:15 cohort through 2:30 dismissal and 3:00. Report ordinary attendees still at church separately from cleanup/serve-team members, parked vehicles, people awaiting transport and vehicles queued on the road; until people are modeled, label vehicle-cohort results as proxies. Verify the ordinary departure-readiness tail supports the near-empty church target without inventing a numeric emptiness threshold, deleting cars, bypassing traffic controls or forcing staff to leave. Exact residual staffing and late-tail calibration remain open field inputs.

## M2 — Demand-responsive shuttle routing (second feature priority)

**Deliverable:** buses favor the areas with the greatest unmet pickup demand, with visible reasons for each assignment. Replace the fixed fleet split without inventing roads or waiting for a full pedestrian simulation.

The Commander's operational intent is more service where more people need pickup. Road congestion alone is not passenger demand: a car queue can be inbound, outbound, or unable to reach a pickup. Likewise, a nearly full lot can have few people waiting once service has begun. The estimator must account for the service phase and direction of travel.

### M2a — A small, honest demand signal

- Begin at existing approved pickup stops/circuits. Keep A/home as the current hub; do not invent an A pickup circuit. Include home-to-lot dismissal demand when estimating return trips.
- Record a demand snapshot per served area/direction, separating estimated demand, observation/test-input overrides, and eventually measured simulated passenger queues. Show which kind is in use.
- Initially estimate demand from recent parking arrivals, service/dismissal timing and the population still needing transport, with explicitly provisional people/car and walk/ride inputs. Do not count every parked person as a waiting rider or accumulate demand forever without subtracting estimated service.
- Use controlled demand fixtures to prove dispatch behavior independently of uncertain estimates. Actual onboard/boarding claims wait for M7; M2 may track a labeled estimated-service balance, not pretend that placeholder service equals measured boardings.

### M2b — Allocate buses at safe decision points

- At home dispatch or the existing shared C branch, assign the next available bus toward the greatest unmet need relative to service already committed there. Buses en route must count as committed capacity, so every bus does not chase the same peak.
- Balance demand with time since last service and route travel time. Give quieter areas with nonzero demand a minimum-service/maximum-wait safeguard; do not interpret “majority” as starving everybody else.
- Use stable tie-breaks, a minimum reassignment interval or equivalent anti-flapping rule, and deterministic state. Choose exact weights/limits after comparison runs; they are proposed settings, not field facts.
- Never teleport or reroute a bus mid-leg. Preserve current route continuity, pickup stops, launch staggering, service-break behavior, fleet limits, occupied-road clearance and Corporate radio/hold rules. Demand scoring cannot override physical/control constraints.
- Display demand by area, buses already assigned, last-service age and the reason for the next assignment. Prefer this explanation over exposing a new collection of unexplained tuning sliders.

**Gate:** deterministic tests shift demand from B to C and between C branches; the next safely available assignments follow the shift, quieter nonzero-demand areas still receive service, and committed buses prevent over-allocation. Cover zero demand, ties, a one-bus fleet, disabled/retiring buses, service breaks and delayed routes. Compare queue/wait estimates and trips against the fixed-split baseline using identical demand. Reset, rewind and forward reconstruction reproduce demand balances, assignments and pending decisions. Browser-check the explanation and visible route continuity.

Likely touchpoints: `shuttles.js`, `shuttleRoutes.js` for existing circuit choices, simulation service/occupancy inputs, dashboard statistics and replay capture. Inspect current interfaces before final code design. No new crosswalk, individual pedestrians or road geometry is required for this first slice.

**Later connection:** M7 replaces provisional demand/service accounting with actual waiting groups, onboard loads and boardings. Retest M2's allocation against conserved passenger counts; do not maintain two competing passenger ledgers.

## M3 — Real world → reviewed lane/operations model

**Deliverable:** versioned layout/operations overlay and one reviewed pilot area. Collect a small observation packet alongside M1; do not retrace the entire campus first.

Keep LabelMe for visual capture. Coordinates answer “where”; add “connected to what, which direction, how wide, who controls it, and why do we believe it?”

**Pilot areas:** B North's exit corridor and C's shared entrance/exit median. Exercise approved staging, directional lanes, simultaneous movements and uncertain geometry without inventing new rows.

1. Preserve the current image/JSON pair. Record dimensions, version/hash and coordinate convention. Use the current image-to-world transform; physical widths/scale remain estimates until measured.
2. Annotate driveable boundaries, directional lane centerlines, median/no-drive regions, junction nodes, lane connections, stop/release lines and officer points. Later add walking/crossing/boarding areas on a separate layer.
3. Use stable IDs independent of LabelMe array order; retain source index/version references. Do not renumber source bindings or silently promote optional routes into approved roads.
4. Add operating metadata: allowed classes/turns, one-/two-way direction, width estimate, controller membership, entry/exit permission and evidence status (traced, measured, inferred or Commander-approved abstraction).
5. Validate connectivity, disconnected paths, legal direction, roof/median/parking-row exclusion, opposing-lane separation and **body clearance**, not just polygon containment. Retain untraced-gap disclosures until evidence replaces them.
6. Review a visual diff: raw evidence versus derived lanes, allowed turns, control lines and uncertain links. Warn/refuse unknown connections instead of manufacturing shortcuts. Preserve approved B North staging unless deliberately superseded.

**Gate:** one changed connection or position imports, validates and previews without hand-editing route coordinates across multiple modules. Invalid direction/connectivity fails usefully; old IDs/aliases remain valid. Geometry tests do not certify field safety.

## M4 — Reference-led visual styling: closer to real life

**Deliverable:** a recognizable, reference-led site presentation, first in one pilot area, then across the campus. This is a separate presentation milestone, not an excuse to change operational geometry.

1. Collect an approved reference pack: current aerial/source image plus available ground-level photos or annotated screenshots of buildings, pavement, markings, medians, curbs, vegetation, cars, buses and staff. Record camera/view and uncertain details; do not fabricate unseen architecture.
2. Select a few fixed review views and save before screenshots. Start with C's entrance/median or B North's corridor from M3, rather than rebuilding everything at once.
3. Match real proportions and recognizable site features first: building massing/rooflines, road and parking surfaces, painted markings, curbs/medians, landscape and stop/staff placement. Verify changes against M3's coordinate/scale evidence; decorative meshes must not silently become drivable or blocking geometry.
4. Improve vehicle/bus silhouettes and scale, restrained material/texture detail, lighting/shadows and camera framing. Proposed aesthetic: recognizable real-world materials and proportions, not a stylized game reskin; agree on the reference comparison before a larger asset pass.
5. Keep simulation overlays/labels available separately. A clean presentation view and a diagnostic view must describe the same underlying state. Do not hide routing or queue problems behind scenery.
6. Measure frame time, memory/draw calls and rewind responsiveness at the same camera, fleet and 11:00 load before/after. Use instancing or simpler/distance-based detail where warranted; set performance budgets from the baseline rather than promising a frame rate in advance.

**Gate:** the Commander reviews matched before/after views against the reference pack and accepts the pilot's real-world resemblance. Route coordinates, capacities, exit selection, controller decisions and fixed-input simulation results stay unchanged; source alignment remains reviewable. Representative high-load rendering and rewind fit the agreed performance budget. Any necessary operational geometry correction returns to M3 with its own evidence and tests.

Reference collection can begin early, but the proposed main styling pass follows the lane/layout pilot to avoid polishing geometry that is about to change. People animation can be refined after M7; do not block the first styling pass on it.

## M5 — Extend positions without rebuilding the existing registry

**Deliverable:** small registration/control interface, one behavior-equivalent existing controller adapter, then one real in-lot role.

- Keep location/identity, real duty, implementation and provisional settings distinct.
- Integrate a versioned additive position overlay with registry, scene markers, route association and validation. A new JSON file alone does not solve the 65-shape coupling.
- Capabilities may overlap: controller, checkpoint, radio participant, visual marker. A rendered worker must not silently impose a hold.
- Specify approaches/conflict region, hold/release lines, release conditions, occupied-zone clearance, radio partners and exceptions.
- Adapt one current controller with equivalent results before implementing one observed inside-lot marshal. Do not invent the marshal's location or duties.

**Gate:** a supported new position uses one location/definition and tested controller configuration without unrelated loader changes. Existing behavior remains equivalent; the new role affects intended traffic only. Preserve all eight distinct current staffed roles.

## M6 — One crosswalk with controlled test demand

**Deliverable:** an observed crossing location, connected walking approaches and tested pedestrian/vehicle conflict control.

Start with aggregate pedestrian batches as a prototype, **not an asserted real-world policy**. Obtain location, staffing/right-of-way practice and crossing time first. The current shuttle > departure > arrival vehicle ranking does not establish pedestrian right-of-way.

Model pedestrian waiting → crossing → clear, and vehicle hold → occupied vehicles clear → crossing release → pedestrian tail clears → vehicle release. No release into an occupied conflict region. Feed deterministic test demand before building all campus people flows.

If observation shows continuous flow or an unstaffed crossing, model that rather than forcing timed batches. Track pedestrian wait and vehicle queue; set numeric targets after baseline measurement.

**Gate:** no conflicting admissions in production paths; no trapped group; both flows recover after demand subsides; queue/delay impact is visible. This validates a simulation, not a field traffic-safety plan.

## M7 — Walkers and actual 20-person shuttle loads

**Deliverable:** conserved people flows linked to cars, stops and the crossing.

- Add people-per-car and walk/ride inputs with uncertainty, allowing lot/service/direction differences. Do not guess that half walk.
- Separate arrival trips (lot→church) from dismissal trips (church→parked car), including walking/boarding/alighting delays.
- Introduce passenger capacity **20 by default**, stop/direction queues, onboard counts, boarding/alighting and documented dwell. Keep passenger capacity separate from priority equivalence.
- Replace M2's explicitly provisional demand/service balance with actual queues and committed/free seat counts. Dispatch follows unmet rider demand and updates after boarding/alighting; parked occupancy and road traffic remain contextual signals, not rider counts.
- Link car readiness to people returning. Replace overlapping generic walking-delay multipliers instead of charging the same delay twice.
- Conserve people across waiting, walking, riding and arrived states. Nobody walks and rides the same trip simultaneously; a bus-waiting group does not become an already-departing car.
- Use aggregate groups if sufficient for operational questions; animated individual walkers are a later presentation choice. Include people/queue display in rewind frames and reconstruct private state deterministically.

**Gate:** capacity never exceeded; people reconcile; walking demand drives crossing holds; changing walk share changes bus queues/load. Reset/rewind/forward never duplicate people.

## M8 — Expand real in-lot operations one area at a time

Use the M3/M5 pipeline for observed row-fill marshals, internal traffic roles and pedestrian paths. Keep before/after inputs, throughput, queues/delay, exceptions and evidence for every addition. Improve simplified staging only when the operational question needs it; do not recreate every stall for appearance alone.

## Low-burden field capture packet

Use one annotated screenshot per small area plus short notes. No plates, faces or individual tracking needed. Observe from an authorized safe location; do not enter traffic to measure it.

### Layout / operating-feature card

| Field | Capture |
|---|---|
| Stable ID / area | e.g. `c-main-mouth`; refer to existing source IDs |
| Geometry | Entry/exit side, median endpoints, junction/stop lines, approximate or measured widths |
| Connectivity / direction | Lane A connects to B; turns/classes; one-/two-way |
| Worker/control | Where, what is held/released, radio partners, response to a bus/pedestrian |
| Evidence | Photo/diagram filename/date, source version, Commander observation or measurement |
| Confidence | confirmed / estimated / unknown; disputed items stay visible |
| Exceptions | badge/emergency access, full-lot handling, shuttle priority |

### One-Sunday timing/count sheet

Record service start and actual dismissal. If practical, sample each lot's parked count at dismissal−10, −5, dismissal, +5, +10, +20 and +40 minutes. Record A closure/reopen time and remaining count; define “linger” with an observed cutoff. Note weather/events or late service release. Rough count ranges beat invented precision.

For shuttles, sample by pickup area and trip direction in comparable time windows: people waiting, boardings/alightings, queue left behind, bus arrival times and dwell. Record where demand shifts during arrival versus dismissal; a parked-car total alone does not reveal that. Note rough ranges when exact counts are impractical. At the intended crossing, sample count/group size, crossing duration and whether flow is continuous. Compare walk/ride counts in the **same area/time window**, not unrelated snapshots.

For styling, attach available reference views with a rough camera location/direction and note what should look different. Record confirmed versus hidden/estimated features; exclude faces/plates from shared references. Reuse these views for M4's before/after review.

Begin with a narrated screenshot walkthrough of the two pilot areas and one dismissal observation, not a full survey. If unavailable, retain provisional inputs and sensitivity ranges rather than claim calibration.

## Decisions needed later — not blockers to planning

| Before | Missing input |
|---|---|
| M1 distribution acceptance | Definition/duration of A's late linger; B/C late rates unmeasured. Keep current general/badge threshold basis unless corrected. |
| M1 lifecycle acceptance | Exact event that closes A if not simply filling; preserve its latch through scenario handoff. |
| M2 dispatch acceptance | Demand observations by area/direction; provisional estimator inputs; service interval, anti-flapping and allocation settings validated against comparison runs |
| M3 pilot approval | Corridor directions/widths and uncertain median/connector geometry |
| M4 visual acceptance | Reference pack, pilot area, comparison views and measured performance budget |
| M5 new role | One actual in-lot post, location, holds/releases and exceptions |
| M6 | Crossing location(s), walking approaches and real right-of-way/staffing practice |
| M7 | People/car, walk/ride shares by lot/direction and boarding observations |

Do not re-ask A-only latch, 75-minute dismissal, ~5% early departures across lots or ~20-person shuttle capacity.

## Ownership and verification

- SPARTAN: roadmap, scope, small packets, evidence reconciliation and independent acceptance.
- CLAUD, when available: detailed code design and large implementation. **No new CLAUD run requested in this takeover.**
- QWEN: one bounded test fixture/schema validator/observation inventory per packet, with complete context, permitted edits, exact output and checks. No overlapping source ownership.

For implementation: run focused production-path tests, then `npm test` and `npm run build` from `/Users/adonispuente/Desktop/Developer/parking-sim`; preserve exact failing-name deltas. Do not call the suite green while standing failures remain. Browser-check gate reasons, overlays, crossing states and rewind. Compare changed scenario origins by wall-clock/event, not the older 760 departures at 40 scenario minutes as an invariant.

**Next implementation slice:** M0 baseline plus explicit dismissal clock and Lot A closure-latch truth table on the 11:00 transition; then early readiness, carry-forward and other-service coverage before M1 acceptance. M2 demand-responsive shuttles are next. Collect pickup-demand observations, the small M3 layout packet and M4 visual references alongside early work; collecting evidence does not change the implementation order.

**Revision, 2026-11-09:** added the Commander's second-priority demand-responsive shuttle milestone and requested real-world styling milestone; renumbered dependencies. These additions are roadmap work only, not implemented shuttle or rendering changes.

**Status:** proposed roadmap only. No simulation code/map changed, no tests/build/server run or started in this pass. Existing traffic/test issues remain open. Saving this document is not approval to implement it.
