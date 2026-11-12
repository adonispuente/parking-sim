// Three-lane Feeder (Commander, 2026-11-06): exiting cars use the middle lane to
// pass the church-bound queue. Lot B west departures turn north onto Feeder in
// the same direction as Alpha arrivals; in the jam the Corporate repair exposed
// (research/claudy-corporate-occupant-report-2026-11-06.md), B departure 416
// yielded to arrival 1172 queued at (26.7,499.9) just north of the B exit.
// Grounding: research/claudy-feeder-middle-plan-2026-11-07.md and
// research/claudy-feeder-middle-sweep.mjs.
// Scope: this slice frees B departures from arrivals queued PAST the exit. An
// arrival stopped ACROSS the exit mouth is a physical crossing conflict that
// this lane cannot remove (separate keep-clear slice).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { keepRight, KEEP_RIGHT_PX, FEEDER_MIDDLE_OUTBOUND_PX, onFeederStreet, usesFeederMiddleLane } from '../src/traffic.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { indexLanePath } from '../src/lanePath.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { onStreet } from '../src/pavementRouting.js';
import { avoidsObstacles } from '../src/sourceRouting.js';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';
import { fromWorld, WORLD_SCALE } from '../src/clearImageSource.js';

const CONFLICT_WIDTH = 0.9; // sharedTraffic.js conflict width, world units
const B_ZONES = ['bSouth', 'bBanana', 'bNorth', 'bPocket'];
const build = (raw, feederOffset) => {
  const trace = keepRight(raw.map(vectorToTrace), KEEP_RIGHT_PX, feederOffset);
  const pts = trace.map(p => { const [x, z] = traceWorldPoint(p); return new THREE.Vector3(x, .6, z); });
  const path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > .00001) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  indexLanePath(path);
  return { trace, lane: { path, length: path.getLength() } };
};
const at = (lane, d) => { const p = lane.path.getPointAt(Math.min(1, Math.max(0, d / lane.length))); return fromWorld([p.x, p.z]); };
const dense = (t, step = .5) => {
  const o = [t[0]];
  for (let i = 1; i < t.length; i++) {
    const a = t[i - 1], b = t[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return o;
};
const arrivals = ['aNorth', 'aSouth'].map(z => build(zoneArrivalRoute('a', z), null));
const arrivalTrace = arrivals.flatMap(a => dense(a.trace));

test('only Lot B west departures take the Feeder middle lane', () => {
  for (const z of B_ZONES) assert.equal(usesFeederMiddleLane(`Departure · bWest · ${z}`), true, z);
  for (const name of ['Arrival · a · aSouth', 'Arrival · bWest · bSouth', 'Departure · a · aNorth',
    'Departure · badgeA · aBadge', 'Departure · bNorth · bNorth', 'Departure · cWest · cSouth',
    'Redirected arrival · bWest · bSouth', 'Feeder → B west'])
    assert.equal(usesFeederMiddleLane(name), false, name);
  assert.ok(FEEDER_MIDDLE_OUTBOUND_PX < 0, 'middle lane is left of centre');
});

test('arrival lanes are unchanged by the optional Feeder offset', () => {
  for (const z of ['aNorth', 'aSouth']) {
    const raw = zoneArrivalRoute('a', z).map(vectorToTrace);
    assert.deepEqual(keepRight(raw, KEEP_RIGHT_PX, null), keepRight(raw));
  }
});

test('B west middle lane stays paved, clear of obstacles and separated past the exit', () => {
  for (const z of B_ZONES) {
    const { trace } = build(zoneDepartureRoute('bWest', z), FEEDER_MIDDLE_OUTBOUND_PX);
    const feederPts = dense(trace).filter(onFeederStreet);
    assert.ok(feederPts.length > 20, `${z} reaches Feeder`);
    for (const p of feederPts) {
      assert.ok(onStreet(p), `${z} paved at ${p}`);
      assert.ok(avoidsObstacles(p), `${z} clear of obstacles at ${p}`);
    }
    // Past the exit mouth (trace y <= 515) the lanes run side by side.
    let minSep = Infinity;
    for (const p of feederPts.filter(p => p[1] <= 515))
      for (const q of arrivalTrace) minSep = Math.min(minSep, Math.hypot(p[0] - q[0], p[1] - q[1]) * WORLD_SCALE);
    assert.ok(minSep > CONFLICT_WIDTH, `${z} min separation ${minSep.toFixed(3)} > ${CONFLICT_WIDTH}`);
    // Route still ends on Feeder, west of (left of) the northbound arrival lane.
    const end = trace.at(-1);
    assert.ok(onFeederStreet(end));
    assert.ok(end[0] < 20, `${z} ends in the middle lane, x=${end[0].toFixed(1)}`);
  }
});

// Production path: PUBLIC advanceSharedTraffic, no copied conflict rule.
const queuedPastExit = arrivals.map(a => {
  const stops = [];
  for (let d = 0; d <= a.lane.length; d += .25) { const [x, y] = at(a.lane, d); if (onFeederStreet([x, y]) && y >= 470 && y <= 500) stops.push(d); }
  return { lane: a.lane, stops };
});
const sweep = (depLane) => {
  let samples = 0, blocked = 0;
  for (const a of queuedPastExit) for (const stop of a.stops)
    for (let d = Math.max(0, depLane.length - 10); d <= depLane.length; d += .2) {
      const car = { id: 'dep', lane: 0, distance: d, speed: 2.8, bodyLength: 1.35, phase: 'departing' };
      const held = { id: 'arr', lane: 1, distance: stop, speed: 0, bodyLength: 1.35, phase: 'arrival', holdForBatch: true, controlStopDistance: stop };
      advanceSharedTraffic({ cars: [car, held], lanes: [depLane, a.lane] }, .1);
      assert.equal(held.distance, stop, 'queued arrival must not move');
      samples++;
      if (car.yieldingTo === 'arr') blocked++;
    }
  return { samples, blocked };
};

test('B west departures pass Alpha arrivals queued north of the exit (416/1172 case)', () => {
  assert.ok(queuedPastExit.every(a => a.stops.length > 0));
  for (const z of B_ZONES) {
    const raw = zoneDepartureRoute('bWest', z);
    const middle = sweep(build(raw, FEEDER_MIDDLE_OUTBOUND_PX).lane);
    const old = sweep(build(raw, null).lane);
    assert.ok(middle.samples > 500, `${z} sampled`);
    assert.equal(middle.blocked, 0, `${z} middle lane never yields to the queue past the exit`);
    // Negative control: the previous single lane shares the queue and yields.
    assert.ok(old.blocked > 0, `${z} old lane reproduces the block`);
  }
});
