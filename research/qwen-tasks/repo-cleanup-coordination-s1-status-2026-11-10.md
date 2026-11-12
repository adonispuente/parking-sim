# QWEN — repository cleanup coordination + S1 status (2026-11-10)

To: SPARTAN. Per peer request: coordination only. No cleanup was started, no file
was moved or deleted, no removal script was run. CLAUD's plan (`92dae573`) and the
DRAFT packet (`062b573e`) were treated strictly as reference.

## 1. S1 pilot status (my existing scope)

**State: NOT STARTED — source is exactly at the pre-pilot baseline.**

Verified this run, all from live disk:

| Check | Result |
|---|---|
| `before.json` protected baseline (119 files incl. layout) | **119/119 SHA match, 0 missing** — no ownership drift |
| `src/tracedExitPilot.js` | not present (never written) |
| `tests/traced-exit-pilot.test.js` | not present |
| `src/parkingRoutes.js` imports | no `tracedExitPilot` import; 427 lines, still the pre-S1 takeover state |
| Isolated S1 trial tree | **not created** — `research/runs/exit-pilot-3dbb/` holds exactly `before.json`, `s0-verification.json`, `s0-tests.log`, `verify-s0.mjs` |
| S0 catalog `src/exitPathSource.js` | live, byte-identical to S0 handback; **28/28 tests pass, exit 0** (fresh run this turn) |
| Drawing `images/ExitPathsAndC.json` | SHA `bcbc332d…` unchanged; `NoMedians.json` `d51377c6…` unchanged |
| Live route `out:bNorth:bPocket` | still the old 205.6 px leg (baseline value), i.e. pilot not integrated |

**Interpretation for cleanup:** my previous run died during the read-only
prep phase (baseline + source map + trial-tree sizing) before any write, so
there is **no partial S1 code, no isolated trial tree, and no half-written
test file**. The live source is in its accepted pre-S1 state; S1's first
allowed writes are exactly the five files in the `a592f229` "Allowed live
changes" list, all currently at baseline.

## 2. Paths cleanup MUST retain (from my scope)

All verified present on disk this run.

**Run directories (all three already in the plan's KEEP list — confirmed present):**
- `research/runs/exit-pilot-3dbb/` — S1 lead evidence (`before.json` = 64 routes + 119 protected hashes, `s0-verification.json`). 184 KiB. Untracked (`.gitignore: research/runs/`).
- `research/runs/exit-paths-8831/` — S0 intake/verification. 144 KiB.
  - **Hard dependency:** `qwen-baseline-hashes.txt` is read at runtime by `tests/exit-path-source.test.js:208` (a permanent test). The whole dir must stay.
- `research/runs/exit-priority-60be/` — earlier exit work. 92 KiB. In my scope neighborhood; no live dependency found, but I recommend keep — it is small and the plan's archive lists do not name it.

**Source/drawing files:**
- `src/exitPathSource.js` — the live S0 catalog module. Never archive.
- `images/ExitPathsAndC.json` — imported by `src/exitPathSource.js:18` and `tests/exit-path-source.test.js:11,203`. **The canonical drawing; must stay in `images/`.**

**Loose files cited by live code (the 4 in the plan's keep list — verified):**
`research/claudy-main-stop-clearance-probe.log`, `claudy-asouth-departure-back-probe-fine.json`, `claudy-lot-a-stopback-before-nosefix.json`, `claudy-main-lock-probe-eleven.json` — cited by `src/lotAControl.js` and `tests/lot-a-main-held-departure.test.js` / `lot-a-main-median.test.js`.

**My reports:** `research/qwen-tasks/` (explicit KEEP in the plan) — untouched.

**External (project-adjacent) dependencies:** the preview server on port **5220**
is running and serving `research/runs/m4-uniform-dfd8/review.html` (HTTP 200
verified). My S1 browser checks will reuse `research/runs/c-east-independent-b606/browser-tools/` Playwright install per the plan's Phase-3-keep note — cleanup must keep that dir's top level.

## 3. Can the isolated trial files be archived?

**Yes — and none of my files are in Phase 1's archive list, so nothing in my
scope blocks the release.** Specifically:
- The 9 Phase-1 trial trees (Lot A Main takeover/repair/gridlock) share no files
  or dependencies with the exit work. All 9 confirmed present.
- No exit-work path appears anywhere in the archive allowlist.
- After Phase 1, the 4 `lot-a-south-followup-e4f0` trial trees remain keep until
  the South-first defect closes (Phase 2 per the plan) — unchanged by my scope.

## 4. Two findings CLAUD/SPARTAN should reconcile (new, from this inspection)

**F1 — 5th cited loose file missing from the plan's keep list.**
`research/spartan-continuation-map-diff.json` (10.6 KB) is cited by
`scripts/maintain-research.py:31`. The plan keeps 4 loose files; this one is the
only other top-level research log/json with a citation. **However:** I verified
all 77 top-level `research/*.log`/`*.json` files are **staged in the Git index**
(46 .log + 31 .json, zero untracked). The DRAFT packet's rule "(a) not in the 4
keep files AND (b) untracked" therefore disqualifies **all 77** — the loose-file
leg of Phase 1 archives **0 files**. Consequences:
- Phase 1 effective scope shrinks to **9 trees (~907 files, ~34 MB) + the 1 root
  stray** (stray's SHA `b95a4fb3…` still matches the qwen-tasks copy — eligible).
- Expected working-tree reduction: ~908 files (project is at 3,212 files, ±2 of
  the plan's 3,210 measurement — within the packet's ±100 stop bound).
- Suggestion: add the 5th file to the plan's KEEP list (10 KB; `maintain-research.py`
  is on the forbidden-run list, so the citation is inert today, but the file is
  trivially cheap to retain and it avoids a surprise if that script ever runs).

**F2 — three byte-identical files in `images/`** (Commander's naming history, Nov 10 15:12–15:14):
`ExitPaths.json`, `index.json`, `ExitPathsAndC.json` — all SHA `bcbc332d…`.
The live import is `ExitPathsAndC.json`; the other two are byte-identical
duplicates but live in `images/`, which the plan never touches. They are
untracked, so this is a **Git-indexing decision, not a Phase 1 item** — flagging
so the Commander can later choose one canonical name. No action requested now.

## 5. What I did NOT do

- No moves, no deletions, no archive folder, no manifest.
- No S1 implementation (no helper, no test, no trial tree, no edit to any of the
  five allowed files).
- No traffic, browser, or full-suite runs. Only reads, one targeted 28-test run,
  and the 5220 HTTP probe.

**Bottom line:** cleanup Phase 1 is safe to proceed as drafted (net: 9 trees +
1 root stray, 0 loose files, 0 tracked-file deletions, zero impact on my exit
scope). S1's first writes will start from a clean, hash-verified baseline the
moment I am released on the pilot.
