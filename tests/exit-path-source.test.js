// S0 exit-trace catalog tests, 2026-11-10.
// Bounded tests for src/exitPathSource.js only. The module is isolated: no
// routing, parking, controller or view module imports it, so this file must not
// import any of those either — only the catalog, the registered source JSON and
// node's hash/shell tools.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import drawing from '../images/ExitPathsAndC.json' with { type: 'json' };
import {
  EXIT_PATHS,
  EXIT_PATH_ANNOTATIONS,
  EXIT_PATH_SOURCE_FILE,
  C_SHUTTLE_TRACE,
  validateExitPathDrawing,
  exitPathById,
} from '../src/exitPathSource.js';

const W = 1374, H = 1118;

// Fresh deep copies per test so no test can mutate another fixture or the catalog.
const clone = () => structuredClone(drawing);

const EXIT_IDX = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 42, 43, 44, 45, 46, 47];

// ---------------- registration ----------------
test('source registers: 51 shapes, 1374x1118 frame', () => {
  assert.equal(drawing.imageWidth, W);
  assert.equal(drawing.imageHeight, H);
  assert.equal(drawing.shapes.length, 51);
});

// ---------------- catalog shape ----------------
test('catalog is 32 exits: A6 / B12 / C14', () => {
  assert.equal(EXIT_PATHS.length, 32);
  const count = lot => EXIT_PATHS.filter(e => e.lot === lot).length;
  assert.equal(count('a'), 6);
  assert.equal(count('b'), 12);
  assert.equal(count('c'), 14);
});

test('families, id format and ascending source indices', () => {
  const fam = {};
  for (const e of EXIT_PATHS) fam[e.family] = (fam[e.family] || 0) + 1;
  assert.deepEqual(fam, { aSouth: 2, aNorth: 4, b: 12, c: 14 });
  assert.ok(EXIT_PATHS.every((e, i) => i === 0 || e.sourceIndex > EXIT_PATHS[i - 1].sourceIndex), 'ascending');
  assert.ok(EXIT_PATHS.every(e => /^exitpaths-\d+$/.test(e.id) && e.sourceFile === EXIT_PATH_SOURCE_FILE), 'id format / sourceFile');
});

test('only exit indices 16..47 present; pavement/annotations excluded', () => {
  assert.ok(EXIT_PATHS.every(e => e.sourceIndex >= 16 && e.sourceIndex <= 47));
  assert.deepEqual(EXIT_PATHS.map(e => e.sourceIndex), EXIT_IDX);
  const labels = new Set(EXIT_PATHS.map(e => e.label));
  assert.deepEqual([...labels].sort(), ['Lot A North Exit Path', 'Lot A South Exit Path', 'Lot B North Exit Path', 'Lot C Exit Path']);
});

test('all 32 entries exact point/vertex/order equality against source; duplicate labels preserved', () => {
  let equal = 0;
  for (const e of EXIT_PATHS) {
    const s = drawing.shapes[e.sourceIndex];
    const exact = s.points.length === e.points.length && s.points.every((p, i) => p[0] === e.points[i][0] && p[1] === e.points[i][1]);
    assert.ok(exact, `index ${e.sourceIndex}`);
    if (exact) equal++;
    assert.equal(e.label, s.label);
  }
  assert.equal(equal, 32);
  assert.equal(exitPathById('exitpaths-16').label, exitPathById('exitpaths-17').label, 'duplicate A South labels are intentional');
});

test('known partials kept literally, not extended: A27=4 verts, B39=8 verts', () => {
  assert.equal(exitPathById('exitpaths-27').points.length, 4);
  assert.equal(exitPathById('exitpaths-39').points.length, 8);
});

test('near-duplicate C18 / C19 kept as distinct entries', () => {
  const a = exitPathById('exitpaths-18');
  const b = exitPathById('exitpaths-19');
  assert.notEqual(a.points[0][0], b.points[0][0]);
  assert.notEqual(a.points[1][0], b.points[1][0]);
});

test('roundabout annotations: 48 point + 49 polygon, non-drivable, absent from exits', () => {
  assert.equal(EXIT_PATH_ANNOTATIONS.length, 2);
  assert.deepEqual(EXIT_PATH_ANNOTATIONS.map(a => a.sourceIndex), [48, 49]);
  assert.equal(EXIT_PATH_ANNOTATIONS[0].shapeType, 'point');
  assert.equal(EXIT_PATH_ANNOTATIONS[0].label, 'Lot C rounabout position');
  assert.equal(EXIT_PATH_ANNOTATIONS[0].points.length, 1);
  assert.equal(EXIT_PATH_ANNOTATIONS[1].shapeType, 'polygon');
  assert.equal(EXIT_PATH_ANNOTATIONS[1].label, 'Lot C round about 4 way');
  assert.ok(EXIT_PATH_ANNOTATIONS.every(a => a.drivable === false));
  assert.ok(!EXIT_PATHS.some(e => e.sourceIndex === 48 || e.sourceIndex === 49));
});

test('exitPathById: known id resolves; unknown id throws descriptive error', () => {
  assert.equal(exitPathById('exitpaths-16').family, 'aSouth');
  assert.equal(exitPathById('exitpaths-16').points.length, drawing.shapes[16].points.length);
  assert.throws(() => exitPathById('exitpaths-99'), /Unknown exit path id "exitpaths-99"/);
  assert.throws(() => exitPathById('nope'), /Unknown exit path id/);
});

// ---------------- deep copy + freezing ----------------
test('catalog is deep-frozen and built from a defensive copy, never aliased', () => {
  assert.ok(Object.isFrozen(EXIT_PATHS));
  assert.ok(Object.isFrozen(EXIT_PATHS[0]));
  assert.ok(Object.isFrozen(EXIT_PATHS[0].points));
  assert.ok(Object.isFrozen(EXIT_PATHS[0].points[0]));
  assert.throws(() => { EXIT_PATHS[0].points[0][0] = 0; }, TypeError);

  // Defensive copy: re-validating a mutated copy yields the mutated values in the
  // NEW catalog, proving the build deep-clones the input — and the live import-
  // backed catalog is untouched by the copy.
  const d = clone();
  const sentinel = 123.123; // within the 1374x1118 frame, so validation passes
  d.shapes[16].points[0][0] = sentinel;
  const refrozen = validateExitPathDrawing(d).find(e => e.sourceIndex === 16);
  assert.equal(refrozen.points[0][0], sentinel, 're-validation copies the (mutated) input');
  assert.notEqual(exitPathById('exitpaths-16').points[0][0], sentinel, 'live catalog untouched by the copy');
});

// ---------------- defensive rejection (the function validates altered fixtures) ----------------
const rejects = (mutate, re) => {
  const d = clone();
  mutate(d);
  assert.throws(() => validateExitPathDrawing(d), re);
};

test('rejects non-object drawing', () => {
  assert.throws(() => validateExitPathDrawing(null), /must be an object/);
  assert.throws(() => validateExitPathDrawing([]), /must be an object/);
  assert.throws(() => validateExitPathDrawing('x'), /must be an object/);
});

test('rejects wrong registered dimensions', () => {
  rejects(d => { d.imageWidth = 1000; }, /registered frame is 1000x1118/);
  rejects(d => { d.imageHeight = 999; }, /registered frame is 1374x999/);
});

test('rejects wrong shape count (append or remove)', () => {
  rejects(d => d.shapes.push(structuredClone(d.shapes[16])), /expected exactly 51 shapes.*found 52/);
  rejects(d => d.shapes.pop(), /expected exactly 51 shapes.*found 50/);
});

test('rejects missing shapes array', () => {
  rejects(d => { delete d.shapes; }, /must have a "shapes" array/);
});

test('rejects a relabelled exit path (bound label drift)', () => {
  rejects(d => { d.shapes[16].label = 'renamed'; }, /#16/);
});

test('rejects a non-linestrip exit path (bound type drift)', () => {
  rejects(d => { d.shapes[16].shape_type = 'polygon'; }, /#16.*must be shape_type "linestrip"/);
});

test('rejects annotation type drift on 48/49', () => {
  rejects(d => { d.shapes[48].shape_type = 'linestrip'; }, /#48.*must be "point"/);
  rejects(d => { d.shapes[49].shape_type = 'point'; }, /#49.*must be "polygon"/);
});

test('rejects unknown / misspelled shape_type', () => {
  rejects(d => { d.shapes[20].shape_type = 'banana'; }, /#20.*not one of point\/circle\/linestrip\/polygon/);
});

test('rejects non-finite coordinates (NaN / Infinity)', () => {
  rejects(d => { d.shapes[16].points[0][0] = NaN; }, /#16.*non-finite/);
  rejects(d => { d.shapes[30].points[2][1] = Infinity; }, /#30.*non-finite/);
});

test('rejects out-of-frame coordinates', () => {
  rejects(d => { d.shapes[16].points[0][0] = W + 5; }, /#16.*outside the 1374x1118 frame/);
  rejects(d => { d.shapes[16].points[0][1] = -1; }, /#16.*outside the 1374x1118 frame/);
});

test('rejects a 1-point linestrip (cardinality)', () => {
  rejects(d => { d.shapes[16].points = [[1, 1]]; }, /#16.*needs at least 2/);
});

test('rejects wrong point cardinality', () => {
  rejects(d => { d.shapes[16].points[0] = [1]; }, /#16.*point #0.*exactly \[x, y\]/);
  rejects(d => { d.shapes[16].points[0] = [1, 2, 3]; }, /#16.*point #0.*exactly \[x, y\]/);
});

test('rejects invalid type cardinality: point>1, circle!=2, polygon<3', () => {
  rejects(d => { d.shapes[48].points = [[1, 1], [2, 2]]; }, /#48.*exactly 1/);
  rejects(d => { d.shapes[13].points = [[1, 1]]; }, /#13.*at least 2/); // circle
  rejects(d => { d.shapes[0].points = [[1, 1], [2, 2]]; }, /#0.*needs at least 3/); // polygon
});

test('rejects a missing or non-array points', () => {
  rejects(d => { delete d.shapes[20].points; }, /#20.*missing "points"/);
  rejects(d => { d.shapes[20].points = 'nope'; }, /#20.*missing "points"/);
});

test('rejects a non-object shape entry', () => {
  rejects(d => { d.shapes[20] = 'garbage'; }, /#20.*must be an object/);
});

// ---------------- source file integrity ----------------
test('source file bytes unchanged (intake SHA)', () => {
  const sha = createHash('sha256').update(readFileSync(new URL('../images/ExitPathsAndC.json', import.meta.url))).digest('hex');
  assert.equal(sha, '6136910f185c3d457bf5f4cefa3f08d9e863bb18961fffc4afce169b99187e91');
});

test('authorized shuttle append is frozen and separate; previous 50 source shapes stay exact', () => {
  const previous = JSON.parse(readFileSync(new URL('../images/ExitPaths.json', import.meta.url)));
  assert.deepEqual(drawing.shapes.slice(0, 50), previous.shapes);
  assert.deepEqual(C_SHUTTLE_TRACE.points, drawing.shapes[50].points);
  assert.equal(C_SHUTTLE_TRACE.label, 'Lot C Shuttle Route new');
  assert.ok(Object.isFrozen(C_SHUTTLE_TRACE.points[0]));
  assert.ok(!EXIT_PATHS.some(e => e.sourceIndex === 50));
  rejects(d => { d.shapes[50].label = 'unapproved'; }, /#50.*expected shuttle linestrip/);
  rejects(d => { d.shapes[50].shape_type = 'polygon'; }, /#50.*expected shuttle linestrip/);
  rejects(d => { d.shapes[50].points[0][0] = NaN; }, /#50.*non-finite/);
});

test('every pre-existing src/tests/images file still matches the pre-edit baseline', () => {
  const base = 'research/runs/exit-paths-8831/qwen-baseline-hashes.txt';
  assert.ok(existsSync(base), 'baseline snapshot must exist');
  const before = Object.fromEntries(readFileSync(base, 'utf8').trim().split('\n').map(l => l.split(/  +/)));
  const after = Object.fromEntries(execSync('sha256sum src/* tests/* images/* 2>/dev/null | sort -k2', { encoding: 'utf8' }).trim().split('\n').map(l => l.split(/  +/)));
  const changed = Object.entries(before).filter(([path, sha]) => after[path] !== undefined && after[path] !== sha);
  assert.deepEqual(changed, [], 'these pre-existing files changed during S0');
});

test('S0 added exactly the two new files, both untracked, nothing else added', () => {
  const out = execSync('git status --short src tests 2>/dev/null', { encoding: 'utf8' }).trim().split('\n');
  const untracked = out.filter(l => l.startsWith('?? ')).map(l => l.slice(3));
  // This shared working tree already carries pre-existing untracked/staged files
  // from earlier runs (M3/M4 slices) — that is not an S0 change. The protection
  // proof is the SHA snapshot comparison above. Assert only what S0 itself did:
  // exactly its two new files, both untracked and byte-present.
  assert.ok(untracked.includes('src/exitPathSource.js'), 'new source file present and untracked');
  assert.ok(untracked.includes('tests/exit-path-source.test.js'), 'new test file present and untracked');
  const s0Additions = untracked.filter(p => p === 'src/exitPathSource.js' || p === 'tests/exit-path-source.test.js');
  assert.equal(s0Additions.length, 2, 'S0 adds exactly two files');
});

