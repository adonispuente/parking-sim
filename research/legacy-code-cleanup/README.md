# Retired hand-drawn code — 2026-11-08

The current app loads the revised traced-map model. These pre-traced-map modules are unreachable from `src/main.jsx`; only the retired tests import them. Static source/tests/scripts import audit found no surviving dependency.

Archived and removed:
- `src/campus.js`, `src/eastCampus.js`, `src/lotA.js`, `src/lotAParking.js`
- `tests/campus.test.js`, `tests/lot-a.test.js`, `tests/lot-a-parking.test.js`, `tests/lot-a-envelope.test.js`

Exact inventory: `manifest.json`. Eight files, 24,062 input bytes. Archive:
`/Users/adonispuente/Desktop/Developer/parking-sim-archives/2026-11-08-legacy-code/legacy-code.tar.gz`

SHA-256: `2c20668cdd226e6cc8fd6920285dc6025b7db01784d9186bd2d55c3a2ad1dfff`.
The independent manifest is also saved beside the archive. Local-machine recovery only, not off-device backup.

## Commands from the project root

- Verify inventory, archive bytes, absent originals and no surviving imports:
  `python3 scripts/maintain-legacy-code.py verify`
- Recover one exact missing path (refuses overwriting):
  `python3 scripts/maintain-legacy-code.py restore src/campus.js`
- Recover into an isolated empty folder instead:
  `python3 scripts/maintain-legacy-code.py restore src/campus.js --destination <folder>`

Related files must be restored together to run old tests. Restored tests still describe the obsolete hand-drawn model and are not current application acceptance tests.

`protectedAtPlan` records 100 surviving source/test/map/script/package inputs. Immediately after cleanup all matched. Later legitimate code changes are reported by verify as changed-since-plan, separately from archive errors. Do not mistake that historical snapshot for a ban on future development.

## Verification and accounting

- Archive verified before removal and after; isolated restore of all eight files passed SHA-256; second restore refused overwrite.
- 100 surviving protected files unchanged through cleanup, full suite and build.
- `npm test`: 237 tests, **220 pass / 17 fail**, versus 250 tests, 223 pass / 27 fail before retirement. Exactly 13 retired tests (3 passing, 10 failing); all 17 remaining failures have the same names as before. **No traffic repair is claimed.**
- `npm run build`: pass; existing bundle-size warning.
- Independent audit: `research/runs/positions-cleanup-c13d/audit.py` and `audit.json`; raw suite/build/import and restore logs in that directory.

No staging, commit, reset or Git history change. Existing uncommitted work and prior archived removals remain. No source maps, current controllers or live tests were broadly deleted. Existing `scripts/maintain-research.py` belongs to the older research archive; do not reapply it. Its old protected snapshot predates legitimate later code changes and this explicit retirement.
