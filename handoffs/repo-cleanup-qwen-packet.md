# QWEN packet — repository cleanup Phase 1 (archive, not delete) — rev 3 DRAFT FOR SPARTAN REVIEW

Author: CLAUD. Reviewer: SPARTAN. Implementer: QWEN (sole writer).
Supersedes rev 2 (artifact ab1fa943, SHA e69c9cc6…). Revised against SPARTAN re-review ba5d3c0f (SHA bfb7ba21…). Earlier review: b860bf53. Sequencing record: e1aa7e96 (PARKED-S1, display work first). Plan: `handoffs/repo-cleanup-claud-plan.md` rev 3.

## Rev 3 changes (bounded; everything else is rev 2 wording)
1. **Two releases.** Part A (archive, recovery proof, helper fixtures) runs under release 1 and ends at a STOP handback. No original is removed under release 1. Part B (removal) and Part C (post-checks) run only under a second, separate SPARTAN release that names the exact helper, manifest and tar SHAs. Part B repeats the original/index/tracked/scope/checksum checks after that release.
2. **Immediate removal counts.** A new helper subcommand `count` uses one enumeration rule. It runs immediately before removal and immediately after removal, before any functional check or new document. The exact-decrease proof uses only those two counts. Final counts are recorded separately and accounted for, not required to equal the manifest.
3. **Final status reconciled with generated output.** Step 12 stays strict. After functional checks, every status delta must be one of the two named documents or a verified generated path under `research/layout-check/` or `dist/`. Anything else is STOP-REPORT.
4. **Conditional-stray exception made explicit** (hard rule 9).
5. **External negative fixtures** (step 9b) must reject 15 named failure cases before the Part A handback.
6. **Writer inspection.** The fixed Sunday blackout is replaced by a check of all routines and active peer work before each part.

## Fixed values
```
PROJ=/Users/adonispuente/Desktop/Developer/parking-sim
ARCH=/Users/adonispuente/Desktop/Developer/parking-sim-archives/2026-11-10-phase1
EV=$ARCH/evidence
TOOLS=$ARCH/tools
FIX=$ARCH/fixtures
STRAY=south-clearance-seven-failures-2026-11-10.md
STRAY_REF=research/qwen-tasks/south-clearance-seven-failures-2026-11-10.md
STRAY_SHA=b95a4fb30aa241bfc1e107233e62ea82158cabd77164736463c83758d8bbbfbb
```
Frozen list. Write this literally to `$EV/frozen.txt`, one path per line, relative to `$PROJ`. Never derive it from a glob or a search:
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
```
The root stray is appended to the archive list only if step 3 qualifies it.

## When you may start
- **Part A:** only after SPARTAN posts release 1 naming this rev 3 packet's SHA. Release 1 must also say that QWEN's exit-trace display work is accepted or explicitly stopped. S1 stays PARKED (e1aa7e96); do not restart it.
- **Part B:** only after SPARTAN posts release 2 naming the SHA-256 of `$TOOLS/phase1.py`, `$EV/manifest.tsv`, and `$ARCH/phase1.tar`, all three exactly as you handed them back.
- Neither release is implied by the other, by silence, or by this packet existing.

## Hard rules
1. **No Git mutation in the project.** Never run `git add/rm/mv/reset/clean/stash/commit/checkout/restore/update-index` with cwd in, or `-C`/`--git-dir` pointing at, `$PROJ`. Only read-only Git (`ls-files`, `status`) is allowed there. The one exception is step 9b: `git init` and `git add` inside fixture repositories under `$FIX`, which is outside the project.
2. Never run `scripts/apply-removals.py`, `scripts/maintain-research.py`, or any old cleanup manifest.
3. **Never touch a path outside the frozen list plus the qualified stray.** No loose research `.log`/`.json` file is in scope, including any untracked one that appears later. Never follow symlinks: no `-L`, `-h`, or `--dereference`. Python must use `lstat` and `os.readlink`.
4. Never edit `src/ tests/ layout/ images/ scripts/ package*.json index.html` or any tracked file.
5. **Reads and writes use fs tools** (`fs_read`, `fs_write`) for the report and docs. Use a shell heredoc only after an fs write has actually failed and a read-back confirms the file did not land. Record that fallback in the report.
6. **Every shell step runs with `set -eu` and no pipelines.** A pipeline hides exit codes. Write intermediate output to files, then process the files. Record every exit code in `$EV/steps.log` as `step N: <command summary>: exit <code>`.
7. Any STOP means: stop, preserve `$ARCH` exactly as it is (archive, evidence, scratch, fixtures), write the report, and hand back. Never improvise a fix, never edit app code, and never remove a changed original because the archive passed earlier.
8. **Writer inspection before each part.** Each release must list every routine that can write into `$PROJ` (all of them, not only Sunday `63e3336b`) with its next run time, and every active peer assignment touching the project. The release must also state the window you may run in. If a release lacks this, or the window has passed, or a listed writer is running or due before you can finish, STOP and ask SPARTAN for a quiet window or a coordination hold. Never pause, edit, or disable a routine yourself. Record the release's writer list in `$EV/release.txt` (Part A) or `$EV/release2.txt` (Part B).
9. **Special-entry rule and the stray exception.** Inside the nine frozen trees, any unsupported entry is STOP: fifo, socket, device, a bad name, or a symlink ancestor. The root stray is the only exception, and only at step 3. If the stray is missing, changed, tracked, a symlink, or not a regular file, record the reason, leave it untouched, and continue with the nine trees. Once step 3 qualifies the stray and it is in the manifest, it is held to the same drift rules as every other manifest row. Any drift on it at step 10 is STOP, because the archive and manifest include it.

## Helper script (you write it; spec is exact)
Write `$TOOLS/phase1.py` (outside the project) and run it as `python3 -I "$TOOLS/phase1.py" <subcommand> ...` with cwd `$PROJ` (or `$FIX/...` during step 9b). It exits 0 on success and 1 on any failure, printing `FAIL: <reason>` to stderr. It uses only the stdlib: `os, stat, hashlib, tarfile, subprocess, sys, json`. Hash with `hashlib.sha256` fed in 1 MiB chunks; do not use `hashlib.file_digest` (missing on this Python).

Common rules for every subcommand:
- **Paths:** relative to the working root, `/`-separated. Reject (FAIL) any name containing `\t`, `\n`, `\r`, or a byte that is not valid UTF-8.
- **Entry types:** only directory, regular file, and symlink. Any other type (fifo, socket, device) is FAIL. Do not skip it. The stray exception (hard rule 9) is applied by step 3 before the helper sees the stray, never inside the helper.
- **Mode:** `oct(stat.S_IMODE(st.st_mode))`.

Subcommands:
1. **`manifest <listfile> <out.tsv>`**
   - For each listed path, first check its ancestry. Every ancestor component from the working root down must `lstat` as a real directory, never a symlink. A frozen tree must `lstat` as a directory, and the stray as a regular file. Anything else FAILs.
   - Then walk the path with `os.walk(followlinks=False)`, emitting the root and all descendants.
   - Each row is `type\tpath\tsize\tmode\tsha256-or-linktarget`. `d` rows use size 0 and `-`. `f` rows use `st_size` and the hash. `l` rows use size 0 and the `os.readlink` target string.
   - Any `d` row whose final component is `node_modules` is FAIL. The `count` rule prunes such directories, so they would break the count proof.
   - Sort rows by path (byte order) and write UTF-8 with a final newline.
2. **`tracked <listfile>`**
   - Run `git ls-files -z --cached -- <path>` for each path (use subprocess with an argument list, never a shell string).
   - Any output at all, tracked symlinks included, is FAIL, naming the tracked members.
3. **`index-snapshot <out.bin>`**
   - Write the raw stdout bytes of `git ls-files --stage -z`. A nonzero git exit is FAIL.
4. **`tracked-tree <out.tsv>`**
   - Take every path from `git ls-files -z`, then `lstat` it in the working tree.
   - Regular file: `f path size mode sha`. Symlink: `l path 0 mode target`. Absent: `MISSING path`, which records a pre-existing deletion and is not a failure. A tracked entry that is a directory, such as a submodule, is recorded as `d`.
   - Sort rows by path.
5. **`check-archive <tar> <manifest.tsv>`**
   - Open with `tarfile.open(mode='r:')`. Never call `extract`.
   - FAIL on any member name that is absolute, contains a `..` component, or appears twice.
   - Normalize each member name by stripping one trailing `/`.
   - The member set must equal the manifest path set exactly: no extras, none missing.
   - Each member's type must match its row: `isdir` for d, `isreg` for f, `issym` for l. Regular-member size must equal the row size. `mode & 0o7777` must equal the row mode. A symlink's `linkname` must equal the recorded target.
   - Write the counts to stdout.
6. **`compare <root> <manifest.tsv>`**
   - Rebuild a manifest by scanning the same paths under `<root>` (same rules as `manifest`, with ancestry checked relative to `<root>`).
   - Require it to be byte-identical to `<manifest.tsv>`. On mismatch, print the first 50 differing rows.
7. **`protected <out.tsv>`**
   - Hash every untracked file under these paths, if they exist:
     - `research/runs/exit-pilot-3dbb`, `research/runs/exit-paths-8831`, `research/runs/lot-a-main-followthrough-8408`, `research/runs/lot-a-south-followup-e4f0`
     - `research/runs/m4-uniform-dfd8`, `research/runs/m4-nomedians-4357`
     - the top-level files of `lot-a-main-takeover-5cd4`, `lot-a-main-repair-claud`, and `lot-a-main-gridlock-claud` (those directories' files only, not their subdirectories)
   - Do not descend into any `node_modules` directory and do not follow symlinks.
   - The rows have the same format as `tracked-tree`.
8. **`count <out-list.txt>`** (new in rev 3)
   - Walk the working root with `os.walk(followlinks=False)`.
   - Prune `.git` at the root only. Prune every directory named `node_modules` at any depth.
   - Count entries that `lstat` as regular files. Symlinks are not counted and not followed.
   - Write the sorted relative paths to `<out-list.txt>`. Print exactly two lines to stdout: `project <N>` (all counted files) and `research <M>` (counted files whose path starts with `research/`).
   - This is the only counting method in this packet. Do not use `find`, `wc`, or `du` for any count that is compared.

## Part A — release 1: baseline, archive, recovery proof, fixtures (no project change)

**0. Workdir.**
- `mkdir -p /Users/adonispuente/Desktop/Developer/parking-sim-archives`, then `mkdir "$ARCH"`. Plain `mkdir` fails if the directory exists; that is STOP.
- Then `mkdir "$EV" "$TOOLS" "$FIX"`.
- Write `$EV/frozen.txt` and `$TOOLS/phase1.py`.

**1. Release check.** Record in `$EV/release.txt`:
- the release-1 artifact ID and the packet SHA it names;
- the display-work status (accepted or stopped) with its artifact ID, and S1 = PARKED (e1aa7e96);
- the writer list and window from hard rule 8.

If any of these is missing, STOP. Then run `shasum -a 256 handoffs/repo-cleanup-qwen-packet.md > $EV/packet.sha256`. It must equal the released SHA.

**2. Baselines.** Run each command separately and check every exit code:
- `phase1.py index-snapshot $EV/git-index-before.bin`
- `git status --porcelain=v1 -z --untracked-files=all > $EV/git-status-before.bin`. A nonzero exit is STOP. Do not suppress stderr.
- `phase1.py tracked-tree $EV/tracked-before.tsv`
- `phase1.py protected $EV/protected-before.tsv`
- `phase1.py count $EV/count-partA.txt > $EV/counts-partA.txt`. This is informational only; the removal proof uses step 10c.
- Also record `du -sk research` in `$EV/counts-partA.txt`, appending with `>>`.

**3. Stray qualification.** This is the only place hard rule 9's exception applies.
- If `$STRAY` is absent, record `stray: absent, skipped`.
- If it is present, it must `lstat` as a regular file, not a symlink. Compute its SHA and the SHA of `$STRAY_REF`.
- If both equal `$STRAY_SHA` and `git ls-files -z --cached -- $STRAY` prints nothing, copy `frozen.txt` to `$EV/archive-list.txt` and append `$STRAY`.
- Otherwise record `stray: not qualified (<reason>)`, leave the file untouched, and use `frozen.txt` unchanged as `archive-list.txt`.
- Never STOP on the stray alone.

**4. Dependency kill-test.** Write each grep result to a file, then read the files. Do not pipe.
```
grep -rlE "trial-(main-)?1[0-4]|iso-(before|fix|index)" src tests scripts layout package.json index.html > $EV/deps-app.txt   (exit 1 = no match = OK; exit >1 = STOP)
find -P research/runs \( -name '*.mjs' -o -name '*.js' -o -name '*.html' -o -name '*.sh' \) -not -path '*/trial-*' -not -path '*/iso-*' -not -path '*/node_modules/*' -print > $EV/deps-candidates.txt
```
- For each candidate line, run `grep -lE '<same pattern>' -- <file>` and append the hits to `$EV/deps-runs.txt`.
- `deps-app.txt` must be empty.
- `deps-runs.txt` may contain only `research/runs/lot-a-main-takeover-5cd4/trials.mjs`, `verify.mjs`, and `finalize.mjs`. Any other hit is STOP.
- `research/runs/lot-a-main-followthrough-8408/results.md` must contain the literal text `probe.mjs src`. If not, STOP.

**5. Scope checks.**
- `phase1.py tracked $EV/archive-list.txt` must pass.
- Every frozen tree must exist. A missing tree is STOP; do not substitute another path.
- Run `phase1.py manifest $EV/archive-list.txt $EV/manifest.tsv`.
- Expected: 907 `f` rows under the trees, 7 `l` rows, plus 1 `f` row if the stray qualified. The `f` sizes under the trees must sum to 33,889,136.
- Any other count or sum is STOP. Report it; do not reconcile it yourself.

**6. Archive.**
- `tar -cf "$ARCH/phase1.tar" -T "$EV/archive-list.txt"` with cwd `$PROJ`. bsdtar stores symlinks as links; never add `-h` or `-L`.
- `shasum -a 256 "$ARCH/phase1.tar" > "$ARCH/phase1.tar.sha256"`.
- `phase1.py check-archive "$ARCH/phase1.tar" $EV/manifest.tsv` must pass.

**7. Full extract into empty scratch.**
- `mkdir "$ARCH/scratch-full"` (plain `mkdir`; it must be new).
- `tar -xpf "$ARCH/phase1.tar" -C "$ARCH/scratch-full"`.
- `phase1.py compare "$ARCH/scratch-full" $EV/manifest.tsv` must pass.
- Keep `scratch-full` until Part B step 11 finishes.

**8. Sample recovery + overwrite protection.**
- `mkdir "$ARCH/scratch-sample"`.
- Pick three regular members, one each from `trial-11`, `iso-fix`, and `iso-before`. Take the first `f` row of each in manifest order.
- Pick one symlink member: the first `l` row.
- Extract each with `tar -xpf "$ARCH/phase1.tar" -C "$ARCH/scratch-sample" '<member>'`. Each file's hash and size must match its manifest row, and the symlink's target string must match.
- **Sentinel test:**
  - Overwrite the restored `trial-11` sample file in `scratch-sample` with the exact bytes `SENTINEL-phase1-<unix-seconds>\n`. These bytes must differ from the original; check that the hash changed.
  - Run `tar -xkf "$ARCH/phase1.tar" -C "$ARCH/scratch-sample" '<that member>'`, recording the exit code and stderr. Do not require a nonzero exit or any particular message.
  - The file must still hash to the sentinel. If it hashes to the original instead, -k overwrote it; that is STOP.
- Record everything in `$EV/restore-test.txt`.

**9. RESTORE.md (before any removal).** Write `$ARCH/RESTORE.md` with the following content:
- **Verify the archive first.** Run `shasum -a 256 -c phase1.tar.sha256` from `$ARCH`. If the check fails, do not use the archive.
- **Verified procedure (empty destination).**
  1. Create a new empty directory D and run `tar -xpf $ARCH/phase1.tar -C D`.
  2. Run `python3 -I $ARCH/tools/phase1.py compare D $ARCH/evidence/manifest.tsv`. It must pass.
  3. For each tree to bring back, confirm the destination path does not exist in the project.
  4. Move only that tree from D into the project.
- **Single member:** `tar -xpkf $ARCH/phase1.tar '<path>'` from `$PROJ`.
- **Caveats:**
  - `-k` never overwrites existing files and can exit 0 without saying so. A full `tar -xkf` into a changed project can therefore be partial, and is not proof of byte-identical restoration.
  - Symlinks are restored with their original target strings. The `node_modules` contents are not in the archive, so the project's `node_modules` must still exist.
  - `research/runs/lot-a-main-takeover-5cd4/verify.mjs` imports `trial-11/src/traffic.js`, and `trials.mjs` and `finalize.mjs` reference the trial trees. Restore those trees, with project dependencies installed, before rerunning them.

Read RESTORE.md back and confirm the file exists and is non-empty.

**9b. External negative fixtures (new in rev 3).**
All fixture work happens under `$FIX`, never in `$PROJ`. Write the driver as `$TOOLS/fixtures.py`, using stdlib only plus `git` via subprocess argument lists.
- Each case builds a fresh directory `$FIX/<case>/` containing a small `git init` repo. The repo holds a frozen tree `t/`, with at least two regular files of different sizes, one symlink, and one subdirectory, plus a stray-style root file `s.md`.
- Each case builds its own list file and baseline manifest/tar, applies exactly one change, and runs the named subcommand.
- **F0 must exit 0. F1–F15 must each exit 1 with a `FAIL:` line naming the cause.** A wrong exit code, or a FAIL for an unrelated reason, counts as a fixture failure.

| Case | Change applied after the baseline | Subcommand that must FAIL |
|---|---|---|
| F0 | none (happy path: manifest → tar → check-archive → extract → compare) | none; all exit 0 |
| F1 | same-size content change: flip one byte in a regular file, size unchanged | `compare` |
| F2 | delete one regular file | `compare` (missing entry) |
| F3 | add one new regular file inside `t/` | `compare` (extra entry) |
| F4 | change a symlink's target to a different string of the **same length** | `compare` |
| F5 | replace subdirectory `t/sub` with a symlink to an identical copy elsewhere | `compare` (symlink inside tree) |
| F6 | replace the list path's ancestor (e.g. `a/` of `a/t`) with a symlink to an identical copy | `manifest` and `compare` (symlink ancestor) |
| F7 | `chmod` a regular file, bytes unchanged | `compare` (mode) |
| F8 | replace a regular file with a symlink | `compare` (type) |
| F9 | create a fifo (`os.mkfifo`) inside `t/` | `manifest` (unsupported type) |
| F10 | `git add` one file inside `t/` in the fixture repo | `tracked` |
| F11 | handcrafted tar (python `tarfile`, write mode) with an absolute member name | `check-archive` |
| F12 | handcrafted tar with a `../escape` member | `check-archive` |
| F13 | handcrafted tar with one member name appearing twice | `check-archive` |
| F14 | baseline tar plus one extra member, and separately a tar missing one member (record both; both must fail) | `check-archive` |
| F15 | handcrafted tar whose symlink member has a different `linkname` than the manifest | `check-archive` |

- Also run `count` on F0's root. Its `project` number must equal the number of regular files you created, excluding `.git`. The count must also stay unchanged after you add a `node_modules/` directory containing one file, and after you add a symlink.
- Write every case, command, exit code and stderr line to `$EV/fixtures.txt`. Fixture results stay outside the project.
- Any fixture failure is STOP. Do not edit the helper to make a fixture pass and then continue. Report the failure; SPARTAN decides whether a helper change is allowed.

**9c. Part A handback — STOP here.**
- Record SHA-256 of `$TOOLS/phase1.py`, `$TOOLS/fixtures.py`, `$EV/manifest.tsv`, `$ARCH/phase1.tar`, and `$ARCH/RESTORE.md` in `$EV/partA-shas.txt`.
- Write the Part A report (format below) to `$ARCH/partA-report.md`. Do **not** write it into the project; the project must be unchanged after Part A.
- Copy the report, `phase1.py`, `fixtures.py`, `fixtures.txt`, `restore-test.txt` and `partA-shas.txt` to your workspace, publish them, and hand back to SPARTAN.
- Do not continue to step 10. Leave `scratch-full` and `scratch-sample` in place.

## Part B — release 2: removal gate and removal

**10. Pre-removal gate.** Steps 10a–10c run back-to-back immediately before step 11, with nothing else in between.
- **10a. Release 2 check.** Record in `$EV/release2.txt`:
  - the release-2 artifact ID;
  - its named SHAs for `phase1.py`, `manifest.tsv` and `phase1.tar`;
  - its writer list and window.

  Recompute all three SHAs now. Any mismatch, or a missing field, is STOP. Recheck the packet SHA against the released one.
- **10b. Original integrity.**
  - `phase1.py tracked $EV/archive-list.txt` must pass again; a newly tracked member is STOP.
  - `phase1.py compare "$PROJ" $EV/manifest.tsv` must pass. This rescans the originals: inventory, types, sizes, modes, hashes, link targets and ancestry. Any drift, including on a qualified stray, is STOP.
  - `shasum -a 256 -c "$ARCH/phase1.tar.sha256"` must pass.
  - Every line of `archive-list.txt` must be either an exact line of `frozen.txt` or exactly `$STRAY`; check this with a string comparison.
  - Rerun `phase1.py index-snapshot $EV/git-index-pre-removal.bin`, then `cmp` it with `git-index-before.bin`. A difference is STOP-REPORT: something else wrote to Git since Part A.
- **10c. Immediate pre-removal count.** Run `phase1.py count $EV/count-pre.txt > $EV/counts-pre.txt`.

**11. Remove.** For each line of `archive-list.txt`, in order:
- Trees: `rm -rf -- "<literal path>"`.
- Stray: `rm -f -- "$STRAY"`.

No globs. No variable that could be empty or expand to a parent. After each removal, `test ! -e "<path>" && test ! -L "<path>"`; failing that is STOP.

**11b. Immediate post-removal count (nothing in between).**
- Run `phase1.py count $EV/count-post.txt > $EV/counts-post.txt`.
- Required:
  - `project(pre) − project(post)` = the number of manifest `f` rows (908 with stray, 907 without).
  - `research(pre) − research(post)` = the number of manifest `f` rows whose path starts with `research/` (always 907).
  - Every path in `count-pre.txt` minus `count-post.txt` is a manifest `f` path, and `count-post.txt` gains no path absent from `count-pre.txt`.
- Any mismatch is STOP-REPORT.
- Only then run `rm -rf "$ARCH/scratch-full" "$ARCH/scratch-sample"` (outside the project; it does not affect the counts).

## Part C — post-checks (in this order)

**12. Integrity, before any functional check (strict).**
- Run `phase1.py index-snapshot $EV/git-index-after.bin`, then `cmp` it with `git-index-before.bin`. They must be identical.
- Run `phase1.py tracked-tree $EV/tracked-after.tsv`, then `cmp` it with `tracked-before.tsv`. They must be identical. This covers staged research logs and tracked symlinks, and pre-existing `MISSING` rows must stay as they were.
- Run `phase1.py protected $EV/protected-after.tsv`, then `cmp` it with the before file. They must be identical.
- Run `git status --porcelain=v1 -z --untracked-files=all > $EV/git-status-after.bin` and check its exit code. Compare its entries with `git-status-before.bin` as sets, splitting on NUL.
  - The only allowed difference is the removal of exactly `?? south-clearance-seven-failures-2026-11-10.md`, if the stray was archived.
  - No additions are allowed at this point. Every pre-existing entry must remain, including tracked `M`/`D`/`A` entries.
  - Any other difference is STOP-REPORT. The trees are gitignored, so they do not appear in status.

**13. Narrow functional checks.**
- First, capture the precheck generated-output snapshot:
  - Save the list of existing files under `research/layout-check/` and `dist/` with their SHA-256 in `$EV/generated-pre.tsv`. Use the helper's hashing; `dist/` may be absent, so record that.
- Then run the checks, recording each exit code:
  - `npm run layout:check` must exit 0.
  - `npm run build` must exit 0; the existing chunk warning is OK.
  - `node --test tests/exit-path-source.test.js tests/lot-a-main-two-way.test.js` must exit 0.
  - `node research/runs/lot-a-main-gridlock-claud/probe.mjs src 600 "$EV/probe-smoke.json"` must exit 0. This is a smoke check that the routine's script still runs; it is not a gridlock regression.

Do not run the full suite or long services.

**14. Generated-output accounting (after functional checks).**
- Rerun `index-snapshot` → `$EV/git-index-postchecks.bin`. It must `cmp` identical to `git-index-before.bin`.
- Rerun `protected` → `$EV/protected-postchecks.tsv`. It must `cmp` identical to `protected-before.tsv`.
- Run `phase1.py tracked-tree $EV/tracked-postchecks.tsv` and diff it against `tracked-after.tsv` into `$EV/generated-diff-tracked.txt`.
- Rebuild the `research/layout-check/` and `dist/` file list with hashes into `$EV/generated-post.tsv`. Diff it against `generated-pre.tsv` into `$EV/generated-diff-files.txt`.
- **Allowed:** a path may differ (added, removed or changed) only if it starts with `research/layout-check/` or `dist/` **and** it appears in `generated-diff-tracked.txt` or `generated-diff-files.txt`.
- Any tracked-tree difference outside those two prefixes is STOP-REPORT. Report the exact rows; do not revert anything and do not use Git to hide it.

**15. Final counts (recorded, not a pass/fail on 908).**
- Run `phase1.py count $EV/count-final.txt > $EV/counts-final.txt`, and append `du -sk research`.
- Report `project` and `research` at four points: Part A, pre-removal, post-removal, and final.
- Account for every path in `count-final.txt` that is not in `count-post.txt`:
  - each must be a generated path accepted in step 14;
  - or one of the two documents written in step 16 and the report (run this check again after step 17);
  - or a path whose disappearance step 14 accepted.
- Any unaccounted path is STOP-REPORT. Final net decrease is not required to equal 908.

**16. Project index.** Use `fs_write` to create `research/ARCHIVE-INDEX.md`, under 40 lines, containing:
- the archive path
- the tar SHA-256
- manifest row counts (f/d/l)
- logical bytes
- whether the stray was included
- a pointer to `$ARCH/RESTORE.md` and its verified procedure
- a pointer to the `verify.mjs` caveat
- the date
- "Phase 1 of handoffs/repo-cleanup-claud-plan.md rev 3"

Read it back.

**17. Final status evaluation.** Run this after the report file below is written and read back.
- `git status --porcelain=v1 -z --untracked-files=all > $EV/git-status-final.bin`, checking the exit code.
- Compare its entries with `git-status-after.bin` (step 12) as sets. Every delta must be exactly one of:
  - `?? research/ARCHIVE-INDEX.md`;
  - `?? research/qwen-tasks/repo-cleanup-phase1-results-2026-11-10.md`;
  - an entry whose path starts with `research/layout-check/` or `dist/` **and** was accepted in step 14.
- Pre-existing entries under those two prefixes are not exempt: one that appears, disappears or changes code must also be in step 14's accepted list.
- Any other delta is STOP-REPORT. Note that `dist/` is gitignored and `research/layout-check/` is untracked and not ignored. Generated layout files are therefore expected to show as `??` lines, and `dist/` should show none.
- Then repeat the step-15 path accounting against the final tree.

## On failure
- **Failure in Part A:** nothing in the project changed. Leave `$ARCH` intact, report, and stop.
- **Failure at step 10:** nothing in the project changed. Report and stop; do not refresh the manifest or tar yourself.
- **Failure during step 11 or 11b:** report exactly which paths were removed and the counts. The archive is verified, so do not restore without SPARTAN's direction.
- **Failure after step 11b:** report it. Do not edit app code and do not claim acceptance.

## Reports (fixed formats)

**Part A report** (`$ARCH/partA-report.md`, published from your workspace):
```
STATUS: PART A DONE — awaiting release 2 | STOPPED at step N (reason)
Release 1: <artifact id>, packet sha <...>, display: accepted|stopped (<artifact id>), S1: PARKED (e1aa7e96)
Writers checked: <routines with next run>, <active peer work>; window <...>
Archive: <path>  tar sha256: <...>
Helper sha256: <...>  fixtures.py sha256: <...>  manifest sha256: <...>
Manifest rows: f X / d Y / l Z ; logical bytes N ; stray: archived|absent|not qualified (<reason>)
Dependency kill-test: pass|STOP (<hits>)
check-archive: pass|fail ; full scratch compare: pass|fail
Sample recovery: 3/3 files + symlink match ; sentinel preserved: yes|no (tar -xk exit <c>, stderr <...>)
RESTORE.md written: yes (sha <...>)
Fixtures: F0 pass ; F1–F15 rejected <n>/15 (list any that did not fail as required) ; count fixture pass|fail
Counts at Part A: project <N>, research <M>
Project changed in Part A: no
Fallbacks used (fs→shell): none|<step, observed failure>
```

**Final report** (`research/qwen-tasks/repo-cleanup-phase1-results-2026-11-10.md` via `fs_write`, read back, copied to your workspace, published, handed to SPARTAN):
```
STATUS: DONE | STOPPED at step N (reason)
Release 1: <id> ; Release 2: <id>, named helper/manifest/tar sha match: yes|no
Writers checked before Part B: <...>; window <...>
Archive: <path>  tar sha256: <...>
Pre-removal gate: tracked pass, compare pass, tar sha pass, list check pass, index unchanged since Part A
Removed: <n> paths ; post-removal absence checks: pass
Immediate counts pre → post: project A→B (Δ <d>, expected <manifest f rows>), research C→D (Δ <d>, expected 907) ; path-set check: pass|fail
Index stage snapshot (after / postchecks): identical|differs ; tracked tree: identical|<rows> ; protected (after / postchecks): identical|<rows>
git status after removal: removed <...> ; unexpected: none|<...>
layout:check / build / 2 tests / probe smoke: <exit codes>
Generated deltas accepted: none|<paths under research/layout-check/ or dist/>
Final status delta vs step 12: <entries> ; unexpected: none|<...>
Counts (Part A / pre / post / final): project <...>, research <...>, research KiB <...>
Fallbacks used (fs→shell): none|<step, observed failure>
Not done / open: <anything>
```
Never claim disk space was freed: the bytes moved to the archive folder.
