# CLAUD Stage 1R-e — Amendment A1: exit 16 activation metadata + tripwire 10
CLAUD, 2026-11-11. Answers SPARTAN's request from run bb64 (`research/runs/asouth-keepclear-bb64/results.md`).
Amends packet `handoffs/asouth-1r-e-officer-keepclear-claud.md` (sha256 `ac686470a33ae52b9cc303d5941b7c6601208610c686d3d95d984c151404d98a`, artifact e559bb9c). Everything not named here is unchanged.

## Decision
SPARTAN's proposal is approved, with one tightening: activation of exit 16 is tied to the `./aSouthCentreline.js` import in `src/parkingRoutes.js`, the same way #34 is tied to `./tracedExitPilot.js`. The tripwire then proves the display matches the actual route mechanism, not a free-standing flag.

Engine bytes are not touched. The six files that passed bb64 (`feederOfficer.js` SHA 24866ac4…, `parkingRoutes.js`, `traffic.js`, new `aSouthCentreline.js`, `lot-a-south-held-chord.test.js`, new `feeder-officer-exit-room.test.js`) are promoted exactly as tested.

## Allowlist addition (step 4 integrity check)
Two more permitted files, eight total:
- `src/exitPathOverlayView.js` — metadata only, as below.
- `tests/exit-path-overlay-view.test.js` — tripwire 10 only, as below.

Pre-change baseline for both (live and trial are byte-identical today):
- `src/exitPathOverlayView.js` a62d466b95b1ba4eb5ba4bbf5c1c2acc91abd59160f024659224872908b501bf
- `tests/exit-path-overlay-view.test.js` 3edbcac2e9db935fbce4e0272316970e4ed3813001f68820dbdd6404bf2398eb
If either hash differs when you start, stop and report.

## Change 1 — `src/exitPathOverlayView.js` (lines 13–15 only)
Replace:
```js
// Explicit activation list. [] for PARKED-S1 and S1-REJECTED.
// ['exitpaths-34'] only for S1-PROMOTED, set by the reviewed slice that promotes it.
export const ACTIVATED_EXIT_IDS = Object.freeze([]);
```
with:
```js
// Explicit activation list, in sourceIndex order. Each entry is set only by the
// reviewed slice that promotes that trace into traffic:
//   'exitpaths-16' — A South 1R-e promotion (parkingRoutes.js imports ./aSouthCentreline.js).
//   'exitpaths-34' — S1-PROMOTED only (parkingRoutes.js imports ./tracedExitPilot.js). Still parked.
export const ACTIVATED_EXIT_IDS = Object.freeze(['exitpaths-16']);
```
No other line changes. Imports stay exactly two (test 9 must still pass). No geometry, colour, key set, or freezing change.

## Change 2 — `tests/exit-path-overlay-view.test.js` (test 10 only)
Replace the comment on line 124 and test 10 (lines 125–138) with:
```js
// Integration alarm only: proves the list matches the route imports, not that a trace is behaviorally accepted.
// #16 comes from A South 1R-e promotion; #34 from S1's handback (still parked).
test('10. Activation tripwire: ACTIVATED_EXIT_IDS matches the actual parkingRoutes imports', () => {
  const parking = readFileSync(join(__dirname, '..', 'src', 'parkingRoutes.js'), 'utf8');
  const importsFrom = (spec) =>
    new RegExp(`^\\s*import\\s[^;]*?from\\s+['"]\\./${spec}['"]`, 'm').test(parking);
  const expected = [];
  if (importsFrom('aSouthCentreline\\.js')) expected.push('exitpaths-16');
  if (importsFrom('tracedExitPilot\\.js')) expected.push('exitpaths-34');
  assert.deepEqual([...ACTIVATED_EXIT_IDS], expected, 'activation list does not match parkingRoutes imports');
  const v = exitTraceOverlay();
  for (const l of v.lines) {
    assert.equal(l.status, ACTIVATED_EXIT_IDS.includes(l.id) ? 'active' : 'drawn-reference', `status wrong for ${l.id}`);
  }
  assert.equal(EXIT_TRACE_COLOR, '#f5f4ee');
});
```
Tests 1–9 and 11 are untouched. #34 semantics are kept: importing the pilot still requires `'exitpaths-34'`, and nothing in this amendment touches the S1 pilot.

## Required checks (in the trial, before promotion)
1. `node --test tests/exit-path-overlay-view.test.js tests/exit-path-source.test.js` — overlay 11/11 pass. The only allowed failures are the two historical S0 environment assertions in `exit-path-source.test.js` ("every pre-existing src/tests/images file still matches the pre-edit baseline", "S0 added exactly the two new files…"), which SPARTAN already recorded as failing in isolation. CLAUD dry run in /tmp: 37/39, exactly those two.
2. Negative proof, in a throwaway copy of the trial only: (a) remove the `aSouthCentreline.js` import line from `parkingRoutes.js` → test 10 must fail; (b) restore it and set the list back to `[]` → test 10 must fail. Record both failures, then discard the copy.
3. Exit 16 display: `pixelPoints` for `exitpaths-16` equal the catalog and raw drawing (test 3); tag reads `#16 · A · drawn, in traffic use`; all other 31 lines `drawn-reference`.
4. `npm run build`, `npm run layout:check` — exit 0.
5. Rerun the officer and focused suites. Results must equal bb64 (15/15; 38 pass with the same four named baseline failures). The engine is unchanged, so any difference is a stop.
6. Browser: Routes on, legend reports **1 in traffic use**, exit 16 shown as in traffic use, no new application exception.

## Promotion (replaces packet step 5 wording only)
Promote the eight reviewed files together, from exact trial bytes, after a final sole-writer and live-hash check. Then verify live: chord gone, three A South routes changed, 61 other raw and built routes byte-identical, Lot C [1036,162] intact, legend 1 in traffic use, live smoke run of the default service past 10:45 with no Main freeze. Any failure: restore the pre-promotion bytes and hand back.

## Not authorized
- Any change to `tracedExitPilot.js`, the S1 pilot, or #34 status.
- Any other test edit, waiver or deletion.
- Cleanup, individual parking, or further geometry work.

## Riskiest assumption and kill-test
That "in traffic use" is truthful for exit 16: the built departure lane is offset 6.2 px from a shared centreline, so it follows the Commander's drawn path (south, U-turn, through Main) but not its exact pixels. The tag says "drawn, in traffic use", which I judge accurate for that relationship. Kill-test: if the Commander reads that label as "cars drive exactly on my line", change only the tag text; no route change.
