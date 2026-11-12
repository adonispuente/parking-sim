# PARKING-SIM — CLAUD CODE HANDOFF (2026-11-08)

From QWEN. You (CLAUD) are the code owner and are resuming after a token reset.
This is a cold-start briefing: what is verified done, what is open, and the exact
next coding steps with their gates. Nothing here is a decision you were never given.

**Read this first, then read `research/PROGRESS-CHECKPOINT.md` (latest section) and
`docs/positions.md`. Do NOT re-run work marked DONE below — it is already merged and
independently verified. Re-running the traffic acceptance or the legacy cleanup is the
single most wasted budget this project has had.**

---

## 0. WHERE THE CODE STANDS (QWEN-fresh, verified against the live tree)

I re-ran the suite and build myself on current sources before writing this:

| Check | Result |
|---|---|
| `node --test tests/*.test.js` | **251 tests -> 242 pass / 9 fail / 0 todo** |
| `npm run build` | **exit 0** (72 modules; existing >500 kB bundle-size warning only) |
| The 9 failing names | exactly CLAUD's Task-C stale-fixture group — **zero new failures** |
| Overall traffic acceptance | **STILL NOT ACCEPTED** (see §3) |
| Unused-code removal | **NOT applied** — clean slate (see §4) |

The 9 failing tests, all in the "stale fixture" group (Task C):
1. `closing a lot reduces capacity and removes its demonstration route`
2. `deleting a lot unassigns its parking rows rather than leaving dangling references`
3. `starter layout round-trips and has three provisional lots`
4. `confirmed section capacities total1584; badge51 stays inside A411`
5. `three full Sunday scenario runs finish their demands, retain new cohorts and clear previous cohorts`
6. `badge parking stays available when general campus is full without inflating 1584`
7. `B full switches to C after current trip completes at home, with no midroute jump`
8. `five persistent buses loop with four to B and one cycling all C stops`
9. `invalid imports are rejected without mutating input`

---

## 1. DONE — do NOT re-run

| Item | Status / evidence |
|---|---|
| **Positions registry** `src/positions/index.js` + `README.md` (8 staffed spots #57-64 + unstaffed Equity/Clay stop; missing staffed definition throws on load; legacy `src/trafficPositions.js` deleted, 8 importers rewired; `tests/positions.test.js`) | Done, independently verified (positions-independent-36e5, positions-final-8aa0) |
| **Equity/Clay starvation fix** `src/equityClayStop.js` (stopped >=20 s promoted next, oldest first; shuttles/occupied/clearances still preempt; 4 tests). Final worst wait 78->51 s; Equity worst 78->23 s | Done, verified |
| **1019 re-diagnosis** (the +1 episode is a fairness reorder, not a regression; wording-only, no 20 s "ceiling" implied). Suite 234/17, traffic identical | Done, verified (positions-final-8aa0) |
| **Lot C help-text fix** `src/SundayControls.jsx` (50/50 rule; `tests/lot-c-exit-help-text.test.js`) | Done, verified (lotc-independent-545a) |
| **Connector-disclosure repair** `src/parkingRoutes.js` + `src/sourceRouting.js` (`NONPAVEMENT_CONNECTOR_MODES`); labels only, no route/control change. Suite 236/15 | Done, verified (connector-independent-5007) |
| **Task A+B** (your latest, `claud-taskab-1108`): 6 current-frame test rewrites + additive `UNTRACED_ROAD_GAPS` list. **236/15 -> 242/9**, 0 new, build 0, waits byte-identical, exactly 5 files | **DONE — this is the current baseline** |
| **Legacy retirement** — 8 pre-traced files archived recoverably (`research/legacy-code-cleanup/`, external tar) | Done, audit exit 0. Do not re-delete. |
| **Docs** — `docs/positions.md` + `src/positions/README.md` reconciled to final wording | Done (SPARTAN-owned) |

---

## 2. THE 9 OPEN FAILURES (your next code work)

These are the ONLY failing tests. Grouping:

**A. Rewrite-to-current-rules — 9 fixtures (Task C). Needs a Commander ruling first.**
All 9 of the failures above belong to this group. They encode OLD rules the sim no
longer follows:
- **Starter layout x2** — assume Lot C starts closed (898 spaces); the layout now opens all three lots (1584).
- **Section capacities** — expects the old 2-section C; it is now 4 sections (total still 686).
- **Sunday scenario runs** — old cohort/capacity expectations.
- **Badge parking** — starts Lot A at 411 (already fills all 51 badge spots); the live rule parks both badge cars from a lower start.
- **B-full shuttle switch** — sets B's count directly; the sim recalculates occupancy every step.
- **5-bus loop** — B shuttle loop now includes a B North stop.
- **invalid imports** — fixture shape drift.

**Policy you need before touching them (Commander call, QWEN to ask since SPARTAN is
at his weekly limit):** does rewriting these 9 fixtures to match *current* rules count
as aligning-with-policy, or does it hide a real regression? If "align," rewrite them
**at least as strict** (keep the real invariants, update the drifted numbers only).
If any is actually a regression, flag it — do not loosen to pass.

**B. The two map gaps (Task D) — Commander approval required (map edit).**
`UNTRACED_ROAD_GAPS` currently *discloses* two road stretches the map has no pavement
outline for: `lot-a-entrance-road` (route #0 vertices 2-6 + Main #57) and
`equity-exit2-driveway` (route #10 vertex 0). Drawing those polygons is a **map edit**
-> needs explicit Commander approval. If approved: add the outlines, then delete those
two `UNTRACED_ROAD_GAPS` entries. Until then the tests treat the gaps as "disclosed,
not drivable" — leave them.

---

## 3. TRAFFIC ACCEPTANCE — still open, and the one thing I need you to look at

- The >=20 s count gate is **as originally defined** (a promotion threshold, NOT a
  hard wait ceiling). Do not silently change the acceptance gate.
- Commander's last complaint, to be checked in the **real app** (not the probe): at the
  11 AM service, a clog at **Corporate Drive right at Black Permit**, plus a **Lot C
  clog when the crowd is larger than expected**. CLAUD measured Black Permit holds of
  5.6 s in the probe (no 10:51 line reproduced there) and saw the line on the far-left
  Feeder road. The app calls `step(PLAYBACK_STEP, rates, lots)`; the probe calls
  `step(.05)` with neither `rates` nor `lots` — **copy the app's exact inputs** to
  reproduce the 10:51 state, then look.
- Lot C wide-aisle pass-through + switch-exits-only-when-actually-faster is the
  proposed fix but has **not been done** this run.

---

## 4. UNUSED-CODE REMOVAL — the part I own, and it did NOT land

Commander asked me (QWEN) to remove unused code **after** you finish the code above.
I staged two scripts in `scripts/` (`apply-removals.py`, `maintain-unused-code.py`)
at 18:30, but **a token reset caught me before `apply-removals.py` ran.** The project
is a **clean slate**: all 10 `images/`, `.cgap2.mjs`, `PLAN.md` are still present; the
`src/` files are unchanged (traffic.js is still Nov 7).

**Re-derive, do not trust my old inventory** — your Task A+B changed 5 files, so my
earlier reference counts are stale. Inventory: `research/unused-code-inventory-1108.md`.

Removal set (re-verify each against the CURRENT tree before touching):
- **Tier 0 — stale images (remove):** `Clear Image.json`, `HopeCityLayout.json`,
  `HopeCityLayout.png`, `HopeCityLayoutCUpdated.json`,
  `HopeCityLayoutFirstHalfincluded.json`, `Lot A revision.json`,
  `HopeCityLayoutVectors.json` (now comment-only after your Task A),
  `Vehicle Routes.json` (comment-only in a test).
  **KEEP:** `Clear Image.png` (live preview), `EverythingClearImage.json` (live source).
- **Tier 1 — dead exports** (own-declaration-line-only = refs 1): strip from their
  files. **KEEP these (now live):** `onLotGround` (your new test imports it),
  `internalPath` (parkingRoutes + a test use it — remove only the `internalShuttlePath`
  alias), `vectorToTrace`, `B7_ROW_SWEEP`, `C_MEDIAN_PROVENANCE`, `positionById`,
  `positionByIndex`, `A_DEPARTURE_MERGE` (Scene imports it), and your 3 new
  `UNTRACED_ROAD_GAPS` exports. Orphan chains to trim with their dead owner:
  `PAVEMENT` (only `insidePavement` reads it), `tracedFeatures` (only PAVEMENT line in
  traffic.js), `SHUTTLE_HOME` (only the dead `SHUTTLE_ACCESS` in vectorRoutes),
  `SOURCE_FILE` (only `POSITION_SOURCE` in positions/index.js).
- **Tier 2 — housekeeping (remove):** `.cgap2.mjs`, `PLAN.md` (describes the retired
  pre-traced plan). `dist/` is git-ignored build output — regenerate, don't commit.

**Gates before I delete anything:** archive to
`/Users/adonispuente/Desktop/Developer/parking-sim-archives/2026-11-08-unused-code/`
(tar + sha256) first; after removal, `npm test` must stay **242 pass / 9 fail with the
same 9 names, 0 new** and `npm run build` must stay **exit 0**, or I revert. No git
stage/commit.

**Sequencing you asked for:** you finish §2/§3 first -> I re-verify 242/9 + the 3
wait-probes against your saved after-JSON -> then I run the unused-code removal.

---

## 5. CONSTRAINTS (carry all of them)

- Save implementation + production-path coverage **before** running tests.
- Do **not** delete live tests to hide failures; align stale tests only to established
  approved policy, at least as strict. Map edits need Commander approval.
- No git stage/commit/reset/history changes.
- Traffic gate stays as defined; do not silently move the acceptance bar.
- If you (CLAUD) hit your token limit, QWEN takes over coding with a clean ownership
  transfer — we never edit the same file concurrently.
