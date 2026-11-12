# Repository cleanup plan — CLAUD (planning only) — rev 3, 2026-11-10

Project: `/Users/adonispuente/Desktop/Developer/parking-sim`
Supersedes: rev 2 (artifact db6ed2af, SHA 0d6d52bf…). Revised against SPARTAN re-review ba5d3c0f (SHA bfb7ba21…). Earlier: rev 1 (92dae573), review b860bf53.
Status: PLAN. Nothing moved or deleted. Execution packet: `handoffs/repo-cleanup-qwen-packet.md` rev 3 (DRAFT, not released). QWEN is not released.

## Position
The clutter is research evidence, not code. Phase 1 moves the largest low-risk block into a verified external archive: nine duplicated source trial trees from two completed, accepted Lot A Main repairs. The byte-identical untracked root report is also moved. It goes to an archive outside the project, and nothing is permanently deleted.

## Changes from rev 2 (bounded; scope and inventory unchanged)
- **Two releases (judgment a).** Release 1 covers Part A only: baselines, archive, full and sample recovery proof, RESTORE.md and external fixtures. It ends at a STOP handback with the helper, manifest and tar SHAs. Removal (Part B) and post-checks (Part C) need a separate release 2 naming those exact three SHAs. Part B then repeats the tracked, compare, tar-checksum, list and index checks immediately before removal.
- **Count correctness (correction 2).** A single helper `count` subcommand prunes `.git` and `node_modules`, does not follow links, and counts regular files only. It runs immediately before and immediately after removal. The project decrease must equal the manifest `f` rows (908 with stray, 907 without), and the `research/` decrease must equal 907. Final counts are recorded separately, and every added path must be accounted for. There is no final-net-908 requirement.
- **Status correctness (correction 1).** The status check immediately after removal stays strict. After layout:check and build, index and protected checks rerun. Deltas are allowed only for verified generated paths under `research/layout-check/` (untracked, not ignored, so `??`) or `dist/` (ignored), plus the two named documents. Pre-existing entries there get no blanket exemption. Anything else is STOP-REPORT, with no Git change.
- **Stray exception explicit (judgment b).** A missing, changed, tracked or non-regular stray is recorded and skipped, as the only exception to the special-entry rule. Unsupported entries inside the nine trees remain STOP. A qualified stray is held to full drift rules.
- **External negative fixtures (judgment c).** QWEN writes the helper and must show, on fixture repos under the archive folder (never the project), that it rejects:
  - a same-size byte mutation;
  - missing and extra entries;
  - a same-length link-target change;
  - a symlink inside the tree and a symlink ancestor;
  - mode and type changes;
  - a fifo;
  - a newly tracked candidate;
  - absolute, `..` and duplicate tar members;
  - extra and missing tar members;
  - a tar link-target mismatch.

  This is 15 cases plus a happy path and a count fixture. A self-comparison alone does not count.
- **Writer inspection.** The fixed Sunday blackout is replaced. Each release lists every routine able to write the project, with its next run time, and every active peer assignment, then states a window. QWEN stops if the window cannot be met and never pauses a routine himself.

## Measured facts (SPARTAN 9dfb; re-verified by SPARTAN ba5d3c0f)
| Item | Value |
|---|---|
| Nine Phase-1 trees | 907 regular files, 33,889,136 logical bytes, 7 `node_modules` symlinks (target strings only; not followed), 51 directories |
| Tracked members inside the trees | 0 |
| Root stray `south-clearance-seven-failures-2026-11-10.md` | untracked, 11,663 bytes, SHA b95a4fb3…; identical to `research/qwen-tasks/` copy |
| Phase-1 total | **908 regular files** + 7 symlinks + directory entries |
| Loose research .log/.json | 77, all tracked → all KEEP |
| Live references to the trees | only `research/runs/lot-a-main-takeover-5cd4/verify.mjs:21` (imports `trial-11/src/traffic.js`; historical rerun only) |
| Generated output | `layout:check` writes `research/layout-check/` (untracked, not ignored); `build` writes `dist/` (ignored) |
| Tooling | bsdtar 3.5.3 / libarchive 3.7.4; git 2.54.0; Python without `hashlib.file_digest` (chunked hashing) |

## Frozen Phase-1 list (exact)
```
research/runs/lot-a-main-takeover-5cd4/trial-main-10
research/runs/lot-a-main-takeover-5cd4/trial-main-12
research/runs/lot-a-main-takeover-5cd4/trial-main-14
research/runs/lot-a-main-takeover-5cd4/trial-11
research/runs/lot-a-main-takeover-5cd4/trial-12
research/runs/lot-a-main-takeover-5cd4/trial-14
research/runs/lot-a-main-repair-claud/iso-before
research/runs/lot-a-main-gridlock-claud/iso-fix
research/runs/lot-a-main-gridlock-claud/iso-index
south-clearance-seven-failures-2026-11-10.md   (conditional: SHA must equal research/qwen-tasks copy; skipped, not STOP, if it does not qualify)
```

## KEEP (never touched)
- `src/ tests/ layout/ images/ scripts/ docs/ index.html package.json package-lock.json LICENSE .gitignore assessment.md handoffs/ handbacks/ node_modules/ dist/` (`dist/` and `research/layout-check/` may be regenerated by the narrow checks only)
- Every Git-tracked file, including all 77 loose research logs/json files. Explicitly cited: `research/claudy-main-stop-clearance-probe.log`, `claudy-asouth-departure-back-probe-fine.json`, `claudy-lot-a-stopback-before-nosefix.json`, `claudy-main-lock-probe-eleven.json`, `spartan-continuation-map-diff.json`.
- All of `research/runs/` except the nine trees. In particular:
  - top-level files of the three source run directories (`probe.mjs`, `results.md`, `scan.mjs`, `review.html`, `trials/verify/finalize.mjs`)
  - `lot-a-south-followup-e4f0/` (open defect)
  - `exit-pilot-3dbb/`, `exit-paths-8831/`, any `*qwen-s1*`
  - `lot-a-main-followthrough-8408/` (Sunday routine `63e3336b` output)
  - `m4-*` (review pages awaiting the Commander's verdict)
  - `c-east-independent-b606/` (shared browser tools)
- Source drawings, including identical aliases. Git history. Existing `archives/` metadata.

## Expected change
- **Part A:** no project change at all. Everything is written under `/Users/adonispuente/Desktop/Developer/parking-sim-archives/2026-11-10-phase1/`.
- **Part B, immediately after removal:** 908 regular files (907 if the stray is skipped), 7 symlinks and the nine tree directories are gone. Counts drop by exactly the manifest `f` rows. Git index is byte-identical, tracked content is unchanged, and only the stray's `??` line disappears.
- **Part C final:** plus `?? research/ARCHIVE-INDEX.md` and `?? research/qwen-tasks/repo-cleanup-phase1-results-2026-11-10.md`, plus any verified regenerated paths under `research/layout-check/` / `dist/`. Nothing else.
- **Disk:** unchanged. This is decluttering, not space reclamation.
- **Consequence:** `lot-a-main-takeover-5cd4/verify.mjs` cannot be rerun until `trial-11` is restored. Its results are recorded, and SPARTAN 8408 independently re-accepted the repair.

## Later phases (not authorized here)
- **Phase 2:** archive the 4 e4f0 South-first trial trees after that defect closes.
- **Phase 2b:** archive m4 screenshots after the Commander's M4 verdict, keeping `results.md`/`review.html`.
- **Phase 3:** a current-reference sweep. Tracked research files leave only through a separate Git decision. Drawings are never removed on "unreferenced" evidence alone.

## Sequencing
1. SPARTAN reviews this plan and packet rev 3.
2. The exit-trace display work (released in e1aa7e96, QWEN implementing) is accepted or explicitly stopped. S1 stays PARKED. Display work keeps priority.
3. SPARTAN inspects all routines and active peer writers, picks a quiet window or arranges a coordination hold, and posts **release 1** (Part A only).
4. QWEN runs Part A and stops with the helper, fixture, manifest, tar and RESTORE evidence.
5. SPARTAN independently reviews the helper, fixtures, manifest and tar. Only then does SPARTAN re-inspect writers and post **release 2** naming the three SHAs.
6. QWEN runs Parts B and C. SPARTAN independently verifies the counts, index and tracked integrity, generated-delta accounting, and narrow checks.

## Riskiest assumption and kill-tests
**Assumption:** nothing live (src, tests, scripts, the routine, the preview, or open-defect evidence) reads the nine trees.
**Kill-test:** packet step 4, the dependency grep. The only allowed hits are `lot-a-main-takeover-5cd4/{trials,verify,finalize}.mjs`. Any other hit means STOP before anything is archived.
**Second assumption (new in rev 3):** QWEN's helper actually detects drift instead of agreeing with itself.
**Kill-test:** packet step 9b. If any of F1–F15 is not rejected for its named cause, STOP at Part A. Nothing is removed.
