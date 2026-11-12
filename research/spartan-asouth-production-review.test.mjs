// Independent public-production evaluator review. No copied conflict algorithm.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { keepRight } from '../src/traffic.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { vectorToTrace, VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { indexLanePath } from '../src/lanePath.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { attachMainPositionToLane } from '../src/lotAControl.js';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';
function build(raw, approach) {
  const pts = keepRight(raw.map(vectorToTrace)).map(p => {
    const [x, z] = traceWorldPoint(p);
    return new THREE.Vector3(x, .6, z);
  });
  const path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].distanceTo(pts[i - 1]) > .00001)
      path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  }
  indexLanePath(path);
  const lane = { path, length: path.getLength() };
  return attachMainPositionToLane(lane, raw, approach) ? lane : null;
}
const arrivals = [];
for (const key of Object.keys(VECTOR_ROUTES.arrival)) {
  for (const zone of ['aNorth', 'aSouth']) {
    let raw;
    try { raw = zoneArrivalRoute(key, zone); } catch { continue; }
    const lane = build(raw, 'aMain');
    if (lane) arrivals.push({ name: `${key}:${zone}`, lane, phase: 'arriving' });
  }
}
const departures = ['aNorth', 'aSouth'].map(zone => ({
  name: `out:${zone}`, phase: 'departing',
  lane: build(zoneDepartureRoute('a', zone), zone),
}));
const applied = entry => entry.lane.aControl.stopDistance;
const old = entry => Math.max(0, entry.lane.aControl.mergeDistance - 1.7);
function sweep(direction, heldStop) {
  const movers = direction === 'forward' ? departures : arrivals;
  const holders = direction === 'forward' ? arrivals : departures;
  const result = { direction, samples: 0, blocked: 0, slowed: 0, examples: [] };
  for (const mover of movers) for (const holder of holders) {
    const end = direction === 'forward'
      ? Math.min(mover.lane.length, mover.lane.aControl.releaseDistance + 2)
      : mover.lane.length;
    for (let d = applied(mover); d <= end; d += .1) {
      const stop = heldStop(holder);
      const car = { id: 'admitted', lane: 0, distance: d, speed: 2.8,
        bodyLength: 1.35, phase: mover.phase };
      const held = { id: 'held', lane: 1, distance: stop, speed: 2.8,
        bodyLength: 1.35, phase: holder.phase, holdForBatch: true,
        controlStopDistance: stop };
      advanceSharedTraffic({ cars: [car, held], lanes: [mover.lane, holder.lane] }, .1);
      assert.equal(held.distance, stop, 'held vehicle must not move');
      result.samples++;
      if (car.yieldingTo === held.id) {
        result.blocked++;
        if (result.examples.length < 3)
          result.examples.push({ mover: mover.name, held: holder.name, d, stop, reason: car.yieldReason });
      }
      if (car.distance < Math.min(mover.lane.length, d + .28) - 1e-8) result.slowed++;
    }
  }
  return result;
}
test('all 26 Main arrivals and two exits are built', () => {
  assert.equal(arrivals.length, 26);
  assert.equal(departures.length, 2);
});
for (const direction of ['forward', 'reverse']) {
  test(`production evaluator: applied stops clear held vehicles ${direction}`, () => {
    const result = sweep(direction, applied);
    console.log(JSON.stringify({ case: 'applied', ...result }));
    assert.equal(result.blocked, 0, JSON.stringify(result));
    assert.equal(result.slowed, 0, JSON.stringify(result));
  });
}
test('old arrival stop reproduces production yielding', () => {
  const result = sweep('forward', old);
  console.log(JSON.stringify({ case: 'old1.7', ...result }));
  assert.ok(result.blocked > 0);
});
test('old South departure stop reproduces production yielding', () => {
  const result = sweep('reverse', entry => entry.name === 'out:aSouth' ? old(entry) : applied(entry));
  console.log(JSON.stringify({ case: 'oldSouth1.7', ...result }));
  assert.ok(result.blocked > 0);
});
