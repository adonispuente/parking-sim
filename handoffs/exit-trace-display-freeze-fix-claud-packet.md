# QWEN coding packet — exit-trace display: deep-freeze world points (bounded correction)

Status: DRAFT for SPARTAN review. NOT released. QWEN does not start until SPARTAN releases it.
Author: CLAUD (planner, no code). Reviewer: SPARTAN. Sole implementer: QWEN.
Project root: /Users/adonispuente/Desktop/Developer/parking-sim
Origin: SPARTAN A1 review finding, artifact d5c814df-2f63-4d95-9f98-c1b609f05545 ("display deep-freeze gap").
Parent instructions: display packet v3 (31114363), release e1aa7e96 (PARKED-S1).

## 1. The defect (verified by CLAUD, read-only, 2026-11-10)

`src/exitPathOverlayView.js` line 45:

    const worldPoints = Object.freeze(pixelPoints.map(traceWorldPoint));

Only the OUTER array is frozen. Each `[x, z]` returned by `traceWorldPoint` (= `toWorld` in
`src/clearImageSource.js` line 8, which returns a NEW array per call) stays mutable.
`labelAt` (line 56) is one of those same arrays, so it is mutable too.

Measured: 201 mutable world-point arrays across 32 lines; `labelAt` frozen = false on every line.
Existing test 8 checks `Object.isFrozen(l.worldPoints)` (outer) and each pixel point, but never each
world point or `labelAt`. That is why 10/10 passes.

Why the fix is safe: `toWorld` returns a fresh array per call, so freezing it touches nothing
outside this module. `src/Scene.jsx` only READS these values (line 393 destructures
`l.worldPoints`; line 396 reads `l.labelAt[0]`, `l.labelAt[1]`). Nothing writes to them.

## 2. Scope — exactly two files

| File | Allowed change |
|---|---|
| `src/exitPathOverlayView.js` | Replace line 45 only (one line). |
| `tests/exit-path-overlay-view.test.js` | APPEND one new test (test 11) at end of file. Do not edit tests 1–10 or the imports. |

Everything else is forbidden: `Scene.jsx`, `tracedMap.js`, `clearImageSource.js`, `exitPathSource.js`,
`ACTIVATED_EXIT_IDS`, colors, tags, labels, imports, key order, any routing/traffic file, any drawing,
any S1 pilot file, any cleanup action.

## 3. Preflight — STOP if any line differs

Run from the project root:

    shasum -a 256 src/exitPathOverlayView.js tests/exit-path-overlay-view.test.js src/Scene.jsx src/tracedMap.js src/clearImageSource.js src/exitPathSource.js

Expected (captured by CLAUD 2026-11-10):

    b99ed654e4e4af19b0a9d0c4e66eaac2dbc2af1621a38767b3bba7e86c1acabb  src/exitPathOverlayView.js
    a581078d20c0fcb12f08d461b9623e4cc06f6030618233992253554c515ef3a5  tests/exit-path-overlay-view.test.js
    3f03d289b87befd8a41d71b4516667ac0064596bf261ae80f17691a29c5e4852  src/Scene.jsx
    3a6c9c57945edba7cf2a1aed292dad83bba448c35976d5f1aa7ed1a14775fbef  src/tracedMap.js
    2bb939c9c06f827a835c743d36568006e73a2d707e7f18b110a6f8591d19e3e8  src/clearImageSource.js
    ae2cd4899fd713781efcd781f39407be6bd919092aab954fb22b0f69bf91de3b  src/exitPathSource.js

Also confirm `src/tracedExitPilot.js` and `tests/traced-exit-pilot.test.js` do NOT exist.
If any hash differs or a pilot file exists: stop, change nothing, report to SPARTAN.

Copy the two files you will edit, for later diffing:

    mkdir -p research/runs/exit-trace-freeze-fix
    cp src/exitPathOverlayView.js research/runs/exit-trace-freeze-fix/exitPathOverlayView.before.js
    cp tests/exit-path-overlay-view.test.js research/runs/exit-trace-freeze-fix/exit-path-overlay-view.before.test.js

Then save the geometry snapshot BEFORE editing (this is the "geometry unchanged" proof):

    node -e "import('./src/exitPathOverlayView.js').then(m=>{const v=m.exitTraceOverlay();process.stdout.write(JSON.stringify(v.lines.map(l=>({id:l.id,w:l.worldPoints,a:l.labelAt,p:l.pixelPoints,t:l.tag,s:l.status}))))})" > research/runs/exit-trace-freeze-fix/geometry-before.json
    shasum -a 256 research/runs/exit-trace-freeze-fix/geometry-before.json

## 4. Step A — write the test FIRST and prove it fails (red)

Append exactly this to the END of `tests/exit-path-overlay-view.test.js` (after test 10):

```js

test('11. Deep-frozen world geometry: every world point and labelAt is frozen; mutation throws; values unchanged', () => {
  const v = exitTraceOverlay();
  let worldCount = 0;
  for (const l of v.lines) {
    for (const p of l.worldPoints) {
      assert.ok(Object.isFrozen(p), `world point not frozen in ${l.id}`);
      worldCount++;
    }
    assert.ok(Object.isFrozen(l.labelAt), `labelAt not frozen in ${l.id}`);
    assert.ok(l.worldPoints.includes(l.labelAt), `labelAt is not one of the world points in ${l.id}`);
  }
  assert.equal(worldCount, v.lines.reduce((n, l) => n + l.pixelPoints.length, 0));
  const line = v.lines[0];
  const p0 = line.worldPoints[0];
  const before = [p0[0], p0[1]];
  assert.throws(() => { p0[0] = 0; }, TypeError, 'world point x mutation did not throw');
  assert.throws(() => { p0.push(1); }, TypeError, 'world point push did not throw');
  const la = line.labelAt;
  const laBefore = [la[0], la[1]];
  assert.throws(() => { la[1] = 0; }, TypeError, 'labelAt mutation did not throw');
  assert.deepEqual([p0[0], p0[1]], before);
  assert.equal(p0.length, 2);
  assert.deepEqual([la[0], la[1]], laBefore);
  assert.deepEqual(line.worldPoints, line.pixelPoints.map(traceWorldPoint));
});
```

Run:

    node --test tests/exit-path-overlay-view.test.js > research/runs/exit-trace-freeze-fix/red.txt 2>&1

Required result BEFORE the source fix: tests 1–10 pass, test 11 FAILS with
"world point not frozen in exitpaths-16". If test 11 passes at this point, STOP and report:
the test is not detecting the gap.

## 5. Step B — the source fix (one line)

In `src/exitPathOverlayView.js`, replace line 45:

    const worldPoints = Object.freeze(pixelPoints.map(traceWorldPoint));

with:

    const worldPoints = Object.freeze(pixelPoints.map((p) => Object.freeze(traceWorldPoint(p))));

Do not change line 56 (`labelAt: worldPoints[...]`). It becomes frozen automatically because it
points to one of these now-frozen arrays. The arrow wrapper is intentional: it calls
`traceWorldPoint` with one argument, as before.
Do not add imports, helpers or comments, and do not reformat any other line.
Use `fs_edit` (exact find/replace). If the project write times out, use the shell fallback, then
re-read the file and confirm the line changed before continuing.

## 6. Verification (all required; save outputs under research/runs/exit-trace-freeze-fix/)

1. `node --test tests/exit-path-overlay-view.test.js` → 11/11 pass, exit 0 (save as `green.txt`).
2. `node --test tests/exit-path-overlay-view.test.js tests/exit-path-source.test.js` → 39/39 pass, exit 0.
3. Geometry unchanged: rerun the §3 snapshot command into `geometry-after.json`.
   The `shasum -a 256` of before and after MUST be identical.
4. Diff proof:
   - `diff research/runs/exit-trace-freeze-fix/exitPathOverlayView.before.js src/exitPathOverlayView.js`
     shows exactly one changed line (line 45).
   - `head -n 138 tests/exit-path-overlay-view.test.js | shasum -a 256` equals the same command
     on the `.before.test.js` copy (lines 1–138 untouched; only appended after them).
5. Hashes of `Scene.jsx`, `tracedMap.js`, `clearImageSource.js`, `exitPathSource.js` equal §3.
   Pilot files still absent. `ACTIVATED_EXIT_IDS` still `[]`.
6. `npm run build` → exit 0 (existing bundle-size warning allowed).
7. Direct recheck:
   `node -e "import('./src/exitPathOverlayView.js').then(m=>{const v=m.exitTraceOverlay();let n=0;for(const l of v.lines)for(const p of l.worldPoints)if(!Object.isFrozen(p))n++;console.log(n, v.lines.every(l=>Object.isFrozen(l.labelAt)))})"`
   → must print `0 true` (it printed `201 false` before the fix).

No browser check is required for this correction: the geometry snapshot hash proves the drawn
values are unchanged. SPARTAN's separate Top/3D visibility acceptance of the display is still owed
and is NOT replaced by this packet.

## 7. Stop conditions

Stop and report without further edits if: a preflight hash differs; test 11 passes before the fix;
any of tests 1–10 fails after the fix; the geometry hashes differ; the build fails; or any file outside
§2 changes. Do not revert by guessing: report the exact state.

## 8. Handback format (to SPARTAN)

- Preflight hashes (6) and pilot-absent check.
- red.txt summary (test 11 failing message) and green.txt summary (11/11).
- Combined 39/39 result.
- geometry-before / after SHA-256 (must match).
- New SHA-256 of `src/exitPathOverlayView.js` and `tests/exit-path-overlay-view.test.js`.
- Build exit code.
- Recheck output (`0 true`).
- Explicit statement: no other files changed; S1 still parked; no cleanup action taken.

Note for SPARTAN's display acceptance: the two overlay-file SHAs from this handback, not the current
ones, are the values for the post-display 121-path manifest that A1 requires.

## 9. CLAUD dry-run of these instructions (throwaway copy, NOT the project)

Ran 2026-11-10 in /tmp/claud-freeze-dry.* (copy of src/, tests/, images/, package.json only). Project untouched.
- Red: test 11 failed with "world point not frozen in exitpaths-16"; tests 1–10 passed.
- The §5 edit produced exactly one diff line (45).
- Green: overlay test 11/11.
- Geometry snapshot SHA identical before/after: d2b1d921…f76e7.
- Lines 1–138 of the test file unchanged (a581078d…).
- The combined run in the copy showed 37/39 only because `exit-path-source.test.js` needs project files
  that were not copied (it passes 28/28 in the real project, checked the same day). In the project, §6.2
  must be 39/39.
Not run in the dry-run: `npm run build`. QWEN must run it in the project.
