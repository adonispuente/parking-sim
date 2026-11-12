import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exitPathById } from '../src/exitPathSource.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { exitTraceOverlay, ACTIVATED_EXIT_IDS, EXIT_TRACE_COLOR } from '../src/exitPathOverlayView.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const rawDrawing = req(join(__dirname, '../images/ExitPathsAndC.json'));

test('1. Counts: total 32, A6/B12/C14, 32 lines', () => {
  const v = exitTraceOverlay();
  assert.equal(v.total, 32);
  assert.deepEqual(v.counts, { a: 6, b: 12, c: 14 });
  assert.equal(v.lines.length, 32);
});

test('2. Ids: exitpaths-16..47, unique, ascending by sourceIndex', () => {
  const v = exitTraceOverlay();
  const indexes = v.lines.map(l => l.sourceIndex);
  assert.deepEqual(indexes, Array.from({ length: 32 }, (_, k) => 16 + k));
  const ids = v.lines.map(l => l.id);
  assert.equal(new Set(ids).size, 32);
  for (const l of v.lines) assert.equal(l.id, `exitpaths-${l.sourceIndex}`);
});

test('3. Exact geometry: pixelPoints equal catalog and raw drawing, same order; #34 not reversed', () => {
  assert.equal(rawDrawing.imageWidth, 1374);
  assert.equal(rawDrawing.imageHeight, 1118);
  const v = exitTraceOverlay();
  for (const l of v.lines) {
    assert.deepEqual(l.pixelPoints, exitPathById(l.id).points, `catalog points differ for ${l.id}`);
    assert.deepEqual(l.pixelPoints, rawDrawing.shapes[l.sourceIndex].points, `raw drawing points differ for ${l.id}`);
  }
  const l34 = v.lines.find(l => l.sourceIndex === 34);
  assert.deepEqual(l34.pixelPoints[0], [775.8417805627497, 286.06158806214086]);
  assert.deepEqual(l34.pixelPoints[l34.pixelPoints.length - 1], [841.0525192126767, 73.14727108238584]);
});

test('4. Transform: worldPoints equals traceWorldPoint per vertex; hand check with tolerance', () => {
  const v = exitTraceOverlay();
  for (const l of v.lines) {
    assert.deepEqual(l.worldPoints, l.pixelPoints.map(traceWorldPoint), `world transform differs for ${l.id}`);
  }
  const SCALE = 113.6 / 1374;
  let checked = 0;
  for (const l of v.lines) {
    for (let k = 0; k < l.pixelPoints.length; k++) {
      const [x, y] = l.pixelPoints[k];
      const [wx, wz] = l.worldPoints[k];
      assert.ok(Math.abs(wx - x * SCALE) < 1e-9, `x hand check for ${l.id} k=${k}`);
      assert.ok(Math.abs(wz - y * SCALE) < 1e-9, `y hand check for ${l.id} k=${k}`);
      checked++;
    }
  }
  assert.ok(checked > 0);
});

test('5. Exclusions: no source 48/49, no non-linestrip shapes, nothing outside 16..47', () => {
  const v = exitTraceOverlay();
  const included = new Set(v.lines.map(l => l.sourceIndex));
  for (const l of v.lines) assert.ok(l.sourceIndex >= 16 && l.sourceIndex <= 47, `out of range: ${l.id}`);
  rawDrawing.shapes.forEach((s, i) => {
    if (s.shape_type !== 'linestrip') assert.ok(!included.has(i), `non-linestrip shape #${i} ("+s.label+") is included`);
  });
  assert.ok(!included.has(48) && !included.has(49));
});

test('6. No direction fields: each line has exactly the 10 specified keys', () => {
  const v = exitTraceOverlay();
  const keys = ['id', 'sourceIndex', 'lot', 'family', 'label', 'pixelPoints', 'worldPoints', 'status', 'tag', 'labelAt'];
  for (const l of v.lines) assert.deepEqual(Object.keys(l), keys, `key set wrong for ${l.id}`);
});

test('7. Duplicate labels safe: the 12 "Lot B North Exit Path" lines have distinct ids and points', () => {
  const v = exitTraceOverlay();
  const b = v.lines.filter(l => l.label === 'Lot B North Exit Path');
  assert.equal(b.length, 12);
  assert.equal(new Set(b.map(l => l.id)).size, 12);
  assert.equal(new Set(b.map(l => JSON.stringify(l.pixelPoints))).size, 12);
});

test('8. Frozen: result, lines, each line and each point array are deep-frozen', () => {
  const v = exitTraceOverlay();
  assert.ok(Object.isFrozen(v));
  assert.ok(Object.isFrozen(v.lines));
  assert.ok(Object.isFrozen(v.counts));
  assert.ok(Object.isFrozen(v.activated));
  for (const l of v.lines) {
    assert.ok(Object.isFrozen(l));
    assert.ok(Object.isFrozen(l.pixelPoints));
    assert.ok(Object.isFrozen(l.worldPoints));
    for (const p of l.pixelPoints) assert.ok(Object.isFrozen(p));
  }
  let threw = false;
  try { v.lines[0].id = 'hacked'; } catch { threw = true; }
  assert.ok(threw, 'mutation of frozen line did not throw');
  assert.equal(v.lines[0].id, 'exitpaths-16');
});

test('9. Import isolation (static): overlay has exactly two imports; only Scene.jsx imports it', () => {
  const srcDir = join(__dirname, '..', 'src');
  const ov = readFileSync(join(srcDir, 'exitPathOverlayView.js'), 'utf8');
  const importSpecs = [...ov.matchAll(/import\s+[^;]*?from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.deepEqual(importSpecs, ['./exitPathSource.js', './tracedMap.js']);
  const importers = [];
  for (const f of readdirSync(srcDir)) {
    if (!/\.(jsx?|js)$/.test(f)) continue;
    if (f === 'exitPathOverlayView.js') continue;
    const t = readFileSync(join(srcDir, f), 'utf8');
    if (t.includes('exitPathOverlayView')) importers.push(f);
  }
  assert.deepEqual(importers, ['Scene.jsx']);
  for (const f of ['parkingRoutes.js', 'traffic.js', 'campusSimulation.js', 'vehicleRouteCatalog.js', 'vectorRoutes.js', 'roadAnchoredRoutes.js', 'lotAControl.js']) {
    const t = readFileSync(join(srcDir, f), 'utf8');
    assert.ok(!t.includes('exitPathOverlayView'), `exitPathOverlayView referenced in ${f}`);
  }
});

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
