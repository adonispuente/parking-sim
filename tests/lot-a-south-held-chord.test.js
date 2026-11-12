// Lot A South held-car lock (CLAUDYBEAR 2026-11-07, eleven 299 -> 1150).
// The simulator decides conflicts on CHORD-sampled look-ahead windows
// (sharedTraffic routeWindow: 1.5-unit chords, LOOKAHEAD 6, CONFLICT_WIDTH .9,
// a held car wins only where the hit is within its body: <= half + .6).
// True-lane clearance is not enough: chords cut inside bends. These checks
// reproduce those rules on lanes built exactly as campusSimulation builds them
// (keepRight -> traceWorldPoint -> CurvePath -> indexLanePath ->
// attachMainPositionToLane with the production approach names).
// sharedTraffic does not export routeWindow/nearestSegments; the rules are copied
// below and must be kept in step with src/sharedTraffic.js lines 6-66.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { keepRight } from '../src/traffic.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { vectorToTrace, VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { indexLanePath } from '../src/lanePath.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { attachMainPositionToLane, MAIN_DEPARTURE_HOLD_BACK } from '../src/lotAControl.js';

const HALF = 1.35 / 2, LOOKAHEAD = 6, CONFLICT_WIDTH = .9, STEP = .1;
const point = ([x, y]) => { const [wx, wz] = traceWorldPoint([x, y]); return new THREE.Vector3(wx, .6, wz); };
const build = (raw, approach) => {
  const pts = keepRight(raw.map(vectorToTrace)).map(point), path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > .00001) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  indexLanePath(path);
  const lane = { path, length: path.getLength() };
  return attachMainPositionToLane(lane, raw, approach) ? lane : null;
};
const at = (l, d) => l.path.getPointAt(Math.max(0, Math.min(1, d / l.length)));
const windowOf = (lane, distance, stop) => {
  const start = Math.max(0, distance - HALF - .6);
  const capped = Number.isFinite(stop) ? Math.max(distance, stop) + HALF : Infinity;
  const end = Math.min(lane.length, distance + LOOKAHEAD, capped);
  const count = Math.max(1, Math.ceil((end - start) / 1.5));
  return Array.from({ length: count + 1 }, (_, i) => { const d = start + (end - start) * i / count; return { rel: d - distance, point: at(lane, d) }; });
};
const clamp = v => Math.max(0, Math.min(1, v));
function nearestSegments(a, b, c, d) {
  const ux = b.x - a.x, uz = b.z - a.z, vx = d.x - c.x, vz = d.z - c.z, cross = ux * vz - uz * vx;
  if (Math.abs(cross) > 1e-9) { const dx = c.x - a.x, dz = c.z - a.z, t = (dx * vz - dz * vx) / cross, u = (dx * uz - dz * ux) / cross;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { t, u, gap: 0 }; }
  const uu = ux * ux + uz * uz, vv = vx * vx + vz * vz;
  let t = 0, u = clamp(((a.x - c.x) * vx + (a.z - c.z) * vz) / (vv || 1)), dx = a.x - c.x - vx * u, dz = a.z - c.z - vz * u, best = dx * dx + dz * dz;
  let n = clamp(((b.x - c.x) * vx + (b.z - c.z) * vz) / (vv || 1)); dx = b.x - c.x - vx * n; dz = b.z - c.z - vz * n; let s = dx * dx + dz * dz; if (s < best) { best = s; t = 1; u = n; }
  n = clamp(((c.x - a.x) * ux + (c.z - a.z) * uz) / (uu || 1)); dx = a.x + ux * n - c.x; dz = a.z + uz * n - c.z; s = dx * dx + dz * dz; if (s < best) { best = s; t = n; u = 0; }
  n = clamp(((d.x - a.x) * ux + (d.z - a.z) * uz) / (uu || 1)); dx = a.x + ux * n - d.x; dz = a.z + uz * n - d.z; s = dx * dx + dz * dz; if (s < best) { best = s; t = n; u = 1; }
  return { t, u, gap: Math.sqrt(best) };
}
// Smallest chord gap among hits the HELD car wins (gap < .9 => admitted car yields to a held car).
const heldWins = (admitted, held) => { let w = Infinity;
  for (let i = 1; i < admitted.length; i++) for (let j = 1; j < held.length; j++) {
    const h = nearestSegments(admitted[i - 1].point, admitted[i].point, held[j - 1].point, held[j].point);
    const db = held[j - 1].rel + (held[j].rel - held[j - 1].rel) * h.u;
    if (db <= HALF + .6 && h.gap < w) w = h.gap; }
  return w; };

const arrivals = [];
for (const key of Object.keys(VECTOR_ROUTES.arrival)) for (const zone of ['aNorth', 'aSouth']) {
  let raw; try { raw = zoneArrivalRoute(key, zone); } catch { continue; }
  const lane = build(raw, 'aMain'); if (lane) arrivals.push({ name: `${key}:${zone}`, lane });
}
const departures = ['aNorth', 'aSouth'].map(zone => ({ name: `out:${zone}`, lane: build(zoneDepartureRoute('a', zone), zone) }));
const heldStop = lane => lane.aControl.stopDistance;
const atBack = (lane, back) => Math.max(0, lane.aControl.mergeDistance - back);

// Held arrival vs admitted departure over its admitted path [own stop, release + 2].
const forwardMin = arrivalStop => { let m = Infinity;
  for (const a of arrivals) { const s = arrivalStop(a.lane), held = windowOf(a.lane, s, s);
    for (const dep of departures) for (let d = heldStop(dep.lane); d <= Math.min(dep.lane.length, dep.lane.aControl.releaseDistance + 2); d += STEP)
      m = Math.min(m, heldWins(windowOf(dep.lane, d, Infinity), held)); }
  return m; };
// Held departure vs admitted arrival over its whole remaining lane, incl. the post-Main aisle.
const reverseMin = (departureStop, arrivalStop) => { let m = Infinity;
  for (const dep of departures) { const s = departureStop(dep), held = windowOf(dep.lane, s, s);
    for (const a of arrivals) for (let d = arrivalStop(a.lane); d <= a.lane.length; d += STEP)
      m = Math.min(m, heldWins(windowOf(a.lane, d, Infinity), held)); }
  return m; };

test('production approaches apply the measured holds (aMain 2.2, aSouth 3.2, aNorth 3.0)', () => {
  assert.equal(arrivals.length, 26, 'all Main-inbound arrival lanes built');
  assert.deepEqual({ ...MAIN_DEPARTURE_HOLD_BACK }, { aNorth: 3.0, aSouth: 3.2, aMain: 2.2 });
  for (const a of arrivals) assert.ok(Math.abs(a.lane.aControl.mergeDistance - heldStop(a.lane) - 2.2) < 1e-9, a.name);
  const south = departures.find(x => x.name === 'out:aSouth').lane.aControl;
  assert.ok(Math.abs(south.mergeDistance - south.stopDistance - 3.2) < 1e-9);
  assert.ok(south.stopDistance > 0, 'aSouth hold stays on its staging lane');
});

test('no admitted A departure yields to a batch-held Main-inbound arrival (chord rule)', () => {
  const m = forwardMin(heldStop);
  assert.ok(m >= CONFLICT_WIDTH, `min chord gap ${m.toFixed(3)} < ${CONFLICT_WIDTH}`);
});

test('no admitted arrival yields to a batch-held A departure, full lane incl. post-Main aisle (chord rule)', () => {
  const m = reverseMin(dep => heldStop(dep.lane), heldStop);
  assert.ok(m >= CONFLICT_WIDTH, `min chord gap ${m.toFixed(3)} < ${CONFLICT_WIDTH}`);
});

test('the pre-repair 1.7 stops reproduce the logged 299/1150 lock (guards the diagnosis)', () => {
  assert.ok(forwardMin(lane => atBack(lane, 1.7)) < CONFLICT_WIDTH, 'held 1.7 arrival should block an admitted departure');
  const south = departures.find(x => x.name === 'out:aSouth');
  assert.ok(reverseMin(dep => dep === south ? atBack(dep.lane, 1.7) : heldStop(dep.lane), heldStop) < CONFLICT_WIDTH,
    'held 1.7 aSouth departure should block an admitted aSouth arrival');
});

test('aSouth hold window is wide on the split lanes (3.0, 3.2, 3.5 all clear)', () => {
  const south = departures.find(x => x.name === 'out:aSouth');
  for (const back of [3.0, 3.2, 3.5]) {
    const gap = reverseMin(dep => dep === south ? atBack(dep.lane, back) : heldStop(dep.lane), heldStop);
    console.log(`aSouth hold ${back}: minimum chord gap ${gap}`);
    assert.ok(gap >= CONFLICT_WIDTH, `aSouth ${back}: gap ${gap} < ${CONFLICT_WIDTH}`);
  }
});
