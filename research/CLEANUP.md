# Repository cleanup — 2026-11-07

Goal: reduce research clutter without changing simulation or losing evidence.

Inspected: root/package scripts, git status, research listing, checkpoint, active F1 audit and manifest, Equity/Corporate reports, scans workflow. Most clutter is historical research, repeated logs, profiles, backups and a tracked scans/.venv.

Plan:
1. Hash source/tests/maps/packages and inventory research; preserve current handbacks, parked fixes and audit dependencies.
2. Archive historical evidence and dormant scan environment outside Git with an explicit inventory; verify every archived digest/link before removing originals. Keep scanner source and original map/reference assets.
3. Shorten the stacked checkpoint, preserving its exact original in the archive. Keep progress-history.md and append a cleanup entry.
4. Add narrow generated-file ignore rules. Verify protected-file identity, current audit, retained path references and build. No traffic runs or unchanged full-suite cycle.

Out of scope: simulation changes, acceptance waivers, map deduplication, permanent evidence deletion, Git reset/clean/commit/history rewrite.

Archive metadata/restore commands will be recorded in research/cleanup/manifest.json and here. CLAUD was asked for read-only preservation review. A source-only cleanup follow-up is scheduled Nov 7 11:06AM Central, job bc62be15-15de-4fe0-adf1-069d24787f00; existing repair schedules unchanged.

## Applied archive
- External folder: `/Users/adonispuente/Desktop/Developer/parking-sim-archives/2026-11-07-repo-cleanup/`
- Archive: `research-history.tar.gz` — 9,680,191 bytes.
- SHA-256: `2ea0e0cffb4492c00eb90cdd2805d4bf8bb69d02e3eb1d44426270cb871976a2`.
- 1,144 original file/link entries archived then removed only after per-entry verification; 29,228,756 regular-file input bytes. Full old checkpoint is an additional snapshot-only member, not counted as removed.
- Current repair artifacts remain at original paths. No source/maps/tests/packages removed. Scanner source/reference assets kept; dormant `.venv` archived. Recreate the environment or restore at its original path if needed; relocated virtualenvs are not reliably runnable.

## Maintenance commands (from project root)
- Verify archive bytes, each member, source/test/map/package fingerprints and retained paths: `python3 scripts/maintain-research.py verify`
- Inspect exact inventory: `research/cleanup/manifest.json` (independent copy beside archive).
- Restore one missing artifact: `python3 scripts/maintain-research.py restore research/<exact-original-name>`; refuses overwriting existing files.
- Read historical checkpoint without overwriting current: `tar -xOf /Users/adonispuente/Desktop/Developer/parking-sim-archives/2026-11-07-repo-cleanup/research-history.tar.gz research/PROGRESS-CHECKPOINT.md`
- Audit current saved F1 evidence: `node research/spartan-feeder-f1-audit.mjs`.

## Keep it clean
Keep new routine logs, raw measurements and disposable outputs in ignored `research/runs/<repair-name>/`, with one concise committed handback pointing there. Preserve current source-backed evidence until the owning repair is accepted or explicitly superseded. Never commit virtualenvs or CPU profiles again; new ignore rules do not rewrite already tracked Git history. No Git commit/index/history operation was performed. The local external archive is recoverability on this computer, not off-device disaster backup.
