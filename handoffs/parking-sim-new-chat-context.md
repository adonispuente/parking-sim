# Parking-sim — new-chat context (display accepted; cleanup still pending)

Updated by SPARTAN on 2026-11-10, run 4958396a. This is a usable migration checkpoint, NOT a completion report for cleanup or the live-driving pilot. The exit display is independently accepted. Finalize cleanup outcomes after its two gated stages; the Commander already requested the final context and need not ask again.

## Project and ownership
Project: `/Users/adonispuente/Desktop/Developer/parking-sim`.
Current ownership overrides older documents: **CLAUD plans features/milestones and writes all coding instructions; SPARTAN reviews instructions and independently verifies results; QWEN implements.** CLAUD and SPARTAN do not take over implementation under this allocation. One implementation owner, no concurrent pilot/display/cleanup writes.

## Milestone position
Still **M4, not M5**. M3 accepted for its original LabelMe/layout scope; it does not imply that new exit drawings are active. M1 timing/gate/cohort foundations and M2 estimated-demand shuttle dispatch implemented with remaining calibration/later passenger work. M4 presentation has technically checked pavement/material/grass work, but final visual approval and wider scene work remain. M5 expandable worker controls, M6 crosswalk control, M7 walking people/actual shuttle passengers, M8 expanded in-lot operations remain future work. Individual parking brings part of M8 forward.

## Commander decisions — do not re-ask
- No redraw needed for Lot A Main: aisle supports simultaneous entry/exit; separated North departure approach about 12 px south is acceptable.
- Connecting lot pavement is **appearance only**, not permission to change driveable routing.
- B North direct exits: northern-row starts suffice; B North can exit either side.
- Roundabout circles: A/C mark shuttle movements; B is primarily an annual reference marker. Do not infer new traffic policy from circles.
- Use `images/ExitPathsAndC.json` for realistic exits. Then replace section-count/shared-location parking with individual reserved locations, closest-to-church preference and worker-directed placement when flow warrants it. Pavement is not automatically parkable, and estimated positions are not surveyed stalls.
- Repository cleanup belongs between milestones; preserve drawings, active work, necessary evidence and recovery.
- Broad unrelated test cleanup is deprioritized, not narrow verification of changed behavior.

## Completed/accepted before current slice (historical recorded evidence)
- Lot A default 11:00 Main gridlock repair: North route separation plus local lane-builder preservation; focused 27 tests, production 10:05–11:00 progress, layout/build/browser/rewind checks recorded. Not universal Lot A acceptance.
- Exit catalog S0: `src/exitPathSource.js`, `tests/exit-path-source.test.js`; 32 exact source traces (A6/B12/C14), bound by source index 16–47, 1374×1118 frame. Source order retained; no smoothing/reversal. Source 48/49 roundabout annotations are not roads. 28 catalog tests passed in prior independent check.
- Drawing SHA-256 recorded: `bcbc332dda8ad2bb8ac5d7050bdb9b5877354a5d78e12ae0ef0e5d4c226b6eb0`.

## Current work — live inspection at this checkpoint
### 1. Exit display: independently ACCEPTED (2026-11-10, SPARTAN run 4958)
Fresh verification: 39/39 combined display/catalog tests; build and layout check exit 0. All 64 driving routes and auxiliary geometry unchanged. All 119 original protected paths present; only allowed Scene.jsx differs, plus two new overlay files = 121-path manifest. All 201 transformed world points and label anchors now frozen; exact one-line source fix and appended test verified against CLAUD packet d167d6ee. Geometry SHA d2b1d9210be6c1410672d80bc4871bdad3674e26701e1741f75c02d0f61d76e7 unchanged.

Top/3D Routes ON/OFF and repeated ON verified on-screen and via live canvas scene-traversal counts: exactly 32, no duplication. Off-white lines visible in all lots; small labels/overlap remain at overview zoom. Legend says 32 drawn, A6 B12 C14, 0 in traffic use. No new driving activation. Vite HMR websocket error observed in controlled browser, no application exception; build and rendering passed.

Independent acceptance: SPARTAN workspace `handoffs/exit-display-acceptance-4958.md` (also copied into project handoffs). Project evidence `research/runs/exit-display-independent-4958/`; `static-results.json.files` is the fresh 121-path post-correction baseline. That JSON's browser-pending status predates browser acceptance; use it together with the acceptance report. Test server at http://127.0.0.1:5222/ was started/confirmed alive as bg_3958d686-54ae-4d42-8293-80020dbbaeb8; later verify before claiming running.

Historical instruction provenance follows:
Approved instructions: CLAUD v3 packet, group artifact `31114363-28d2-4df6-9c43-30934ede88eb`, SHA `3f77f5c229965bc4de5a425642e0c4d91ea62b9931b59d4c426b48b11fd5dfe5`.
SPARTAN release: `e1aa7e96-943d-4b96-8ba7-cef79e15a222`, workspace `handoffs/exit-trace-display-v3-release-786abc75.md`.
Live files now include `src/exitPathOverlayView.js`; `src/Scene.jsx` imports it, builds tagged exit lines, exposes toggle-time line counts and shows the drawn-exit legend. `ACTIVATED_EXIT_IDS=[]` in inspected overlay source. This supersedes earlier messages saying the display files do not exist.
The former 10-test log is historical; fresh independent 39/39 combined results and browser acceptance above supersede its pending status. The display acceptance is complete. Preserve the newly named post-display baseline for later pilot work.

### 2. Live-driving pilot: PARKED, not released
Only `out:bNorth:bPocket`, trace #34 (six exact drawn vertices), unchanged staging + existing north departure suffix from vertex 1; lead about 4.01 px, outward join about 10.50 px. Other 63 routes must remain unchanged; preserve gate/batch/collision/access/diversion policies.
Original packet group `a592f229-808e-48b4-bcbe-f68c8748ec01`.
CLAUD amendment A1: project `handoffs/exit-pilot-s1-amendment-claud.md`, artifact `9b469fdb-d509-4cc1-a1b6-19409b99370c`, status HELD. Requires accepted post-display baseline and explicit SPARTAN release. Change trace #34 activation label only upon actual promotion, not during a rejected/isolated trial. Do not restart automatically or run concurrently with cleanup/display.

### 3. Cleanup: rev 3 APPROVED instructions; execution still HELD
SPARTAN review artifact `52fec8fb-5270-48f1-8056-b18576634ead` approved rev3. Neither archive-only Part A nor removal Part B has been released in this checkpoint. Display acceptance prerequisite is now met; next is scheduled/peer-writer check and archive-only release, not immediate removal.
Project packets: `handoffs/repo-cleanup-qwen-packet.md` and `handoffs/repo-cleanup-claud-plan.md`.
Correct plan artifact `abb903ca-acc1-4f8f-8945-3ff0228d9886`, SHA `73171c28db2201641276d3474c194133c22dc01dc2a0e2d05ad5ba6827d384df`. Ignore mislabeled artifact `8579dabf` (rev 2 bytes).
Packet artifact `c358eb8a-2742-441d-b369-6f80711d79da`, published SHA `f90d06460da575dc499e4b50d2ab79154e3f091109d9a6d2a1c29be6a84d4e0d`; verify live bytes against immutable version before release.
Scope from prior reviews: nine finished trial trees, 907 regular files/33,889,136 bytes plus seven symlinks, and one conditional byte-identical root report (908 regular files total if it qualifies). All 77 loose research log/JSON files stay (tracked). Preserve active exit work, open South trials, regression scripts and unapproved presentation reviews. This moves clutter to an external recoverable archive, not disk-space reclamation.
Two releases mandatory: A) create archive/helper, recovery proof and 15 negative fixtures, then STOP for SPARTAN review; B) only after a separate release naming exact helper/manifest/tar SHAs, recheck originals/index/scope and remove allowlisted originals. Count reduction immediately around removal, before build-generated output. No project Git mutations. Check scheduled/peer writers before each stage. No removals or savings claimed at this checkpoint.

## Open defects and limitations
- South-first 11:00 configuration: reproduced Main lock around 10:38:50 through 11:00; departure 251 waits on held arrival 1000. Four isolated geometry trials rejected, none promoted. Default 11:00/final-service results do NOT certify South-first.
- Seven inherited narrow Main/South failures recorded; later S0 full-suite handback reports 16 pre-existing failures (different scope). Do not conflate these counts or label every failure stale.
- Individual parking remains unimplemented. Needs safe aisle-connected candidate positions, unique reservations, capacity/access constraints and service carry/rewind metadata—not decorative scattering.
- Displaying 32 references is not activating 32 driving paths.

## Navigation and stale-record warning
Read actual files before acting. Project `research/PROGRESS-CHECKPOINT.md` and `research/spartan-milestone-roadmap-2026-11-09.md` currently lead with older solo-planning/pilot entries; they do NOT reflect the latest ownership/display-first/cleanup sequence. Preserve history but correct current headings when the round settles.
Useful evidence: `research/runs/exit-pilot-3dbb/before.json` (64 routes/119 pre-display protected files), `research/runs/exit-trace-display/`, `research/runs/lot-a-south-followup-e4f0/`, `research/runs/lot-a-main-followthrough-8408/`.
Preview was previously reported on port 5220; verify reachability/process ownership before claiming it runs. This checkpoint did not probe it or inspect current routines. Do not create duplicate regression routines.

## Finalize this migration note when the round finishes
Replace interim sections with exact display acceptance, cleanup Part A/Part B outcomes, archive/recovery paths and fingerprints, changes/tests/results, current protected baseline and next authorized owner. Keep unresolved pilot/parking/South work explicit. Give the Commander a compact copy/paste version plus the saved full context. Never mark incomplete work done just to close this chat.

## Server shutdown after acceptance
Temporary SPARTAN test server on5222 (`bg_3958d686-54ae-4d42-8293-80020dbbaeb8`) was subsequently stopped; process tree confirmed gone. It is not a current preview URL. Existing Commander preview was left untouched.
