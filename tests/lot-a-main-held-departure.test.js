// Lot A Main held-departure setback (CLAUDYBEAR 2026-11-06).
// Lock: admitted arrival 965 yielded to departure 179, which the five-car batch
// held 1.7 before Main with its nose 0.505 world from the arrival's post-Main
// path (research/claudy-main-lock-probe-eleven.json). Checks run on lanes built
// exactly as campusSimulation builds them, against sharedTraffic CONFLICT_WIDTH.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { keepRight } from '../src/traffic.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { indexLanePath } from '../src/lanePath.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { attachMainPositionToLane, mainStopBack, mainHoldBack, MAIN_STOP_BACK,
  MAIN_DEPARTURE_HOLD_BACK } from '../src/lotAControl.js';

const CONFLICT_WIDTH = .9, HALF = 1.35 / 2, PAD = .6;
const point = ([x, y]) => { const [wx, wz] = traceWorldPoint([x, y]); return new THREE.Vector3(wx, .6, wz); };
const build = (raw, approach) => {
  const pts = keepRight(raw.map(vectorToTrace)).map(point), path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > .00001) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  indexLanePath(path);
  const lane = { path, length: path.getLength() };
  assert.ok(attachMainPositionToLane(lane, raw, approach), 'lane passes Main');
  return lane;
};
const at = (l, d) => l.path.getPointAt(Math.max(0, Math.min(1, d / l.length)));
const sample = (l, a, b) => { const n = Math.max(1, Math.ceil((b - a) / .05)); return Array.from({ length: n + 1 }, (_, i) => at(l, a + (b - a) * i / n)); };
const gap = (A, B) => { let g = Infinity; for (const p of A) for (const q of B) g = Math.min(g, Math.hypot(p.x - q.x, p.z - q.z)); return g; };
const arrivals = [];
for (const key of ['a', 'eA']) for (const zone of ['aNorth', 'aSouth']) {
  // a/aNorth enters on AddNorthRoute and never passes Main (2026-11-12).
  if (key === 'a' && zone === 'aNorth') continue;
  let raw; try { raw = zoneArrivalRoute(key, zone); } catch { continue; }
  arrivals.push({ key, zone, raw, lane: build(raw, 'aMain') });
}
const north = zoneDepartureRoute('a', 'aNorth'), northLane = build(north, 'aNorth');

test('aNorth departure is held at the measured setback; mainStopBack itself unchanged', () => {
  assert.equal(mainStopBack(north), MAIN_STOP_BACK);
  assert.equal(MAIN_DEPARTURE_HOLD_BACK.aNorth, 3.0);
  assert.equal(mainHoldBack(north, 'aNorth'), 3.0);
  const c = northLane.aControl;
  assert.ok(Math.abs(c.mergeDistance - c.stopDistance - 3.0) < 1e-9, 'applied stop is 3.0 before Main');
  assert.ok(c.stopDistance > 0, 'stop stays on the lane');
  assert.ok(c.releaseDistance > c.mergeDistance, 'release unchanged after Main');
});

test('Main-inbound arrivals are held at the measured aMain setback (2.2, aSouth repair)', () => {
  assert.ok(arrivals.length >= 2);
  assert.equal(MAIN_DEPARTURE_HOLD_BACK.aMain, 2.2);
  for (const a of arrivals) {
    assert.equal(mainStopBack(a.raw), MAIN_STOP_BACK, `${a.key}:${a.zone} base stop-back unchanged`);
    assert.equal(mainHoldBack(a.raw, 'aMain'), 2.2, `${a.key}:${a.zone}`);
    const c = a.lane.aControl;
    assert.ok(Math.abs(c.mergeDistance - c.stopDistance - 2.2) < 1e-9, `${a.key}:${a.zone} stop`);
  }
});

test('held aNorth departure body clears every admitted arrival path past Main', () => {
  const c = northLane.aControl;
  const body = sample(northLane, Math.max(0, c.stopDistance - HALF - PAD), c.stopDistance + HALF);
  for (const a of arrivals) {
    const o = a.lane.aControl;
    const g = gap(body, sample(a.lane, o.stopDistance, Math.min(a.lane.length, o.mergeDistance + 4)));
    assert.ok(g >= CONFLICT_WIDTH + .2, `${a.key}:${a.zone} gap ${g.toFixed(3)} world`);
  }
});

test('the old 1.7 hold reproduces the measured lock geometry (guards the diagnosis)', () => {
  const c = northLane.aControl, stop = c.mergeDistance - MAIN_STOP_BACK;
  const body = sample(northLane, stop - HALF - PAD, stop + HALF);
  const a = arrivals.find(x => x.key === 'a' && x.zone === 'aNorth'), o = a.lane.aControl;
  const g = gap(body, sample(a.lane, o.stopDistance, o.mergeDistance + 4));
  assert.ok(g < CONFLICT_WIDTH, `old hold gap ${g.toFixed(3)} should be inside the conflict width`);
});
