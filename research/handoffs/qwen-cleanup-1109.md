# QWEN task — post-CLAUD cleanup (2026-11-09)

Project root: `/Users/adonispuente/Desktop/Developer/parking-sim`. Run every command with that as cwd.
CLAUD finished coding and RELEASES `src/` and `tests/` to you. Do not change simulation behaviour.

## Current verified state (your baseline)
- `npm test`: 254 tests, **245 pass / 9 fail**. The 9 failing names are in `research/runs/claud-permit-lotc-1109/failing-after.txt`.
- `npm run build`: exit 0.
- Traffic: `research/runs/claud-permit-lotc-1109/{nine,eleven,final}-waits-after.json`.
- Crowd sweep reference: `research/runs/claud-permit-lotc-1109/sweep-wide-1.{1,2,3,4,5}.log`.

## Rules
1. Remove only items with ZERO references in `src/`, `tests/`, `scripts/`, `index.html`. Your own scripts' string literals do not count as references.
2. Never touch these (new, live): `src/wideAisles.js`, `src/blackPermitControl.js`, `PERMIT_WARNING`, `heldDepartures`, `attachWideAisles`, `inWideAisle`, the gap list in `src/sourceRouting.js`, `onLotGround`.
3. Back up and fingerprint before any edit; all edits must be recoverable.
4. If any gate below fails, revert everything and report. Do not try to fix it.

## Task 1 — stop stray dev servers
Three dev servers from earlier runs are still listening:
| PID | Port |
|---|---|
| 77433 | 5191 |
| 87404 | 5192 |
| 77449 | 5214 |
Steps: `lsof -iTCP -sTCP:LISTEN -P | grep -E ":(5191|5192|5214)"` to confirm the PIDs still match; `kill <pid>` each; rerun the lsof line and confirm empty output.

## Task 2 — apply your staged unused-code removal
Your scripts `apply-removals.py` and `maintain-unused-code.py` (from 2026-11-08) were written against an older tree. Two files they edit changed today: `src/sharedTraffic.js` and `src/campusSimulation.js`.
1. Re-run your reference scan against the CURRENT tree for every Tier-0/1/2 item.
2. Confirm every exact-match removal string still matches exactly once. If any count is not 1, stop and report which.
3. Run the backup script, then the removal.

## Gates (all must pass)
1. `npm test` → 245 pass / 9 fail, and the failing names diff-identical to `failing-after.txt`.
2. `npm run build` → exit 0.
3. `node research/runs/claud-resume-1108/wait-probe.mjs <svc> 5400 <out>` for nine, eleven, final → `cmp` byte-identical to the files above. Argument order is `<service> <seconds> <out.json>`.
4. `node research/runs/claud-permit-lotc-1109/c-dump.mjs 1.3 5400` and `1.4 5400` → END line identical to `sweep-wide-1.3.log` / `sweep-wide-1.4.log`.

## Report format
Save to `research/runs/qwen-cleanup-1109/report.md`:
- Servers stopped (PID, port, verified gone yes/no)
- Items removed (file, symbol/path, reference count)
- Items kept and why
- Each gate: command, result, PASS/FAIL
- Undo command
- Anything you could not do, stated plainly
