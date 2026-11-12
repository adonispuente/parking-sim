# Parking operations positions

A reference for operators and developers adding inside-lot positions. These are simulation definitions, not certified field safety instructions.

## Map identity

Source: `images/EverythingClearImage.json`, bound in `src/clearImageSource.js`. Numbers are zero-based shape indices, not employee numbers. Eight staffed points: #57–64. Old points #31–35 alias #57/#61/#62/#63/#64 and are not additional people. A visible worker or radio membership does not establish an independent admission controller.

**Current code registry:** `src/positions/index.js` contains the eight staffed definitions and the unstaffed Equity/Clay stop, canonical bindings, alias lookup, duties, current implementation, unmodeled duties, provisional settings and controller paths. Its short guide is `src/positions/README.md`. It replaces the deleted legacy `trafficPositions.js` module; current importers use the registry. Adding a staffed map point without a definition throws at registry load. That guard checks documentation coverage, not correctness of new traffic behavior.

## #57 — Lot A Main (`aMain`)
- **Location:** canonical #57; #31 is an alias.
- **Person's duty:** coordinate inbound Main, North departures and South departures in five-car handoffs; keep held vehicle bodies out of the released movement's sweep.
- **Implemented:** `src/lotAControl.js` attaches route-relative stop/release distances, selects one admitted movement, counts clearances and hands off approaches after five. Higher-priority ready traffic may preempt; already-clearing cars continue. Badge/shuttle paths elsewhere are not detoured through Main.
- **Provisional:** North departure setback 3.0 scene units, South 3.2, inbound Main at least 2.2. South has thin clearance margins. These are model distances, not surveyed stop lines.

## #58 — Lot A Feeder exit officer (`aExitOfficer`)
- **Location:** #58, separate from Main and Corporate.
- **Person's duty:** admit Lot A departures onto Feeder while preserving the occupied merge and shuttle approach.
- **Implemented:** `src/feederOfficer.js` detects nearby lanes and ready queues, admits under class priority when clear, and leaves Feeder free without waiting A exits. Occupants and physical leaders of buses clear first.
- **Provisional:** radius, setbacks and bus lookahead. Confirmed three-lane Feeder operation does not itself prove every modeled lane is correct.

## #59 — Feeder / Corporate officer (`corporateOfficer`)
- **Location:** #59, the Feeder/Corporate decision area.
- **Person's duty:** favor exiting traffic; manage competing entries; offer Bravo when Alpha backs up and return to Alpha when it calms.
- **Implemented:** `src/exitPriorityJunction.js` counts **10 actual departure clearances / 5 arrival clearances** when conflicting ready queues compete. Lone approaches do not wait for empty quotas; nonconflicting paths need not serialize. Shuttles and occupied-junction clearance take priority.
- **Diversion:** `src/alphaQueueRelief.js` and `src/campusSimulation.js` can assign/redirect eligible Feeder-origin general arrivals toward B before the decision point, conserving reservations.
- **Open limitation:** relief currently counts only the last 12 scene units before Main, with provisional six-car activation/two-car release. Earlier evidence found this reach could miss actual backups. Expanded-reach candidate was shelved after regression. Intended field duty is recorded; effective current-model diversion is not accepted.

## #60 — Black Permit officer (`permitOfficer`)
- **Location:** #60 at Black Permit / Corporate.
- **Person's duty:** briefly hold Feeder-to-Corporate B/C arrivals so outbound Black Permit shuttles can leave.
- **Implemented:** `src/blackPermitControl.js` recognizes outbound buses by lane geometry, holding source-0 arrivals progressing east before the local stop. Already-crossed cars clear; departures are not administratively held by this rule. Physical clearance remains enforced. `src/corporateDriveOperators.js` also reports passage.
- **Not its duty:** a whole-road Corporate direction valve or Main admission.

## #61 — Bravo entrance (`bEntrance`)
- **Location:** #61; #32 is its alias.
- **Person's duty:** coordinate the staffed entrance, observe its queue and communicate with #59/#60 and the fleet.
- **Implemented:** `src/parkingRoutes.js` and `src/vectorRoutes.js` bind entrance-area routes. Feeder arrivals use a median-separated entrance-side turn instead of reversing across Corporate to touch the exact point. Corporate operator reporting counts local passage. Default wide-road mode imposes no independent alternating quota at #61.
- **Not yet represented:** a complete inside-Bravo marshal/row-filling workflow. Do not infer it from a rendered person or the old diagnostic valve.

## #62 — Bravo north exit (`bExit`)
- **Location:** #62; #33 is its alias.
- **Person's duty:** coordinate B departures and radio public-road/shuttle conditions.
- **Implemented:** `src/northernCorporateControl.js` and `src/campusSimulation.js` can send B North departures west in prelaunch five-car batches during sustained eastbound backup. Already-moving cars are not teleported. Normal B split remains section-based, **not a fixed per-car percentage**.
- **Limits:** backup thresholds (three cars, eight seconds, five-car batches) are provisional. The approved northern-row staging abstraction serves B North north-bound departures; it is not a surveyed connector from the original west staging. No standalone #62 admission gate exists.

## #63 — Charlie staffed entrance (`cEntrance`)
- **Location:** #63; #34 is its alias.
- **Person's duty:** receive ordinary C arrivals, coordinate with #62/#64, and keep entry and exit movement separated.
- **Implemented:** `src/parkingRoutes.js` checks that ordinary C arrival access ends at #63 before the interior join; median geometry separates opposing movement where modeled. `src/vectorRoutes.js` and northern radio bind this point.
- **Limits:** route checkpoint/radio role, not an independent per-person quota. Multiple departure exits do not grant new ordinary-arrival entry permissions.

## #64 — Charlie exit (`cExit`)
- **Location:** #64; #35 is its alias.
- **Person's duty:** coordinate C shuttle returns with Corporate and tell conflicting cars to hold or clear.
- **Implemented:** `src/northernCorporateControl.js` detects C North/South exit-leg shuttles, computes local lane conflicts and holds cars before the region. Already-admitted cars and physical leaders clear first; bus waits when needed.
- **Current car policy:** C cars may use both exits, with configurable default deterministic 50/50 split. Shuttles retain their #64 return/hold behavior. Old shuttle-only car-exit descriptions are obsolete. This differs from B's section-based policy.

## Shared rules

Ordinary class priority is **shuttles > departures > arrivals** (`src/trafficPriority.js`). Officer release never overrides occupied-road clearance, following gaps or body/crossing checks. Separate #57/#58/#59, and separate coordinated #59/#60/#61, must not collapse into one worker.

Corporate is confirmed wide and two-way. Historical #60–#61 narrow-corridor valve is **off by default** (`narrowCorridor: false`), retained for diagnostic fixtures only. Do not reapply shelved historical candidates as current policy.

All eight staffed positions receive parking-operations radio; northern coordination names #62–64 explicitly. Telemetry is not proof of an independent gate at every point.

## Equity / Clay three-way stop — not a numbered staffed point

Derived from shared turn vertices on source routes #10/#11/#13/#15, approximately [1031.2764, 1041.5849] image pixels. Three-way stop and two-way approach width are confirmed; a ninth staff member is not invented.

`src/equityClayStop.js` requires a provisional 0.8-second stop and one movement clearing before another admission; setbacks/release are provisional five-scene-unit parameters. The current revision promotes cars recorded at the stop for **20 seconds or longer**, oldest first. Below that threshold it retains class priority, numeric ID, then stopped time. The 20-second value is a provisional model choice, not a field measurement.

**This is overdue-queue ranking, not a guaranteed 20-second maximum wait.** An approaching shuttle still preempts the queue; an admitted movement, occupied intersection and physical clearance must clear first. Upstream time before reaching the ready band is not the controller's stop timer. Observed near-stationary waits can therefore exceed 20 seconds.

Independent service evidence: `research/runs/positions-independent-36e5/verification.json`. Those three 5400-second runs reproduce CLAUD's saved outputs exactly; final worst Equity/Clay wait drops from 78 to 23 seconds. The thresholded eleven-service count rises from three to four episodes. That count alone does not measure total delay.

Latest local admission-timeline review: `research/runs/positions-final-8aa0/verification.json`, calculated from the raw `heldSince` fields in `research/runs/claud-1019-1108/timeline-{before,after}.json`. Arrival 1029 changes from 31.20 to 23.40 seconds first-held-to-admission; arrival 1019 changes from 19.75 to 23.25 seconds. Their combined wait drops from 50.95 to 46.65 seconds, and their worst wait drops from 31.20 to 23.40 seconds. The extra qualifying episode is a reorder across the reporting cutoff, not proof of greater combined delay. These are local two-arrival results, not whole-service total delay or a hard wait ceiling. Raw first-held timestamps differ from the earlier report's assumed timestamps; controller stop timers and near-stationary wait probes are also distinct measurements. Retain the original threshold-count flag for traceability; do not silently redefine its gate or claim overall acceptance. The subsequent connector-disclosure repair was independently verified in `research/runs/connector-independent-5007/verification.json`: 236 pass / 15 standing failures, no new failing names. Its provenance-label fixes do not establish geometry or traffic acceptance.

## Adding inside-lot positions

For map-defined advisory points, **do not rebind the strict 65-shape source**. Draw one `pos:` point in `images/layout-overlay.json` and add its explicit definition in `src/positions/overlayDefinitions.js`. The copyable guide is [`src/positions/README.md`](../src/positions/README.md). Run `npm run layout:check`, then inspect Routes and the Map-defined positions diagnostics.

The registry keeps `POSITIONS` (the original eight staffed points) and `CONTROL_POINTS` unchanged, adds `OVERLAY_POSITIONS`, and exposes `ALL_POSITIONS` plus merged `positionById`. Advisory points have no numeric source index. `staffed=true` is proposed-role metadata only; S4 entries stay inactive with no controllers, radio membership or staffing allocation. The illustrative `pos:c-layout-demo` is unstaffed, inferred/unknown, not a real worker location.

Actual worker/controller activation is later M5+ work: define traffic served, holds/releases, occupied-zone clearance, radio partners, exceptions and provisional parameters; then implement and verify production behavior, shuttle precedence, upstream blocking and reset/replay. A visible point must never introduce an unexplained hold. Adding an actual source-bound point would still require deliberate version/count/label/type changes together, preserving existing indices and aliases; that is not needed for the overlay workflow.
