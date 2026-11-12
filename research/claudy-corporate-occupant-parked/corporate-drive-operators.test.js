import test from 'node:test';
import assert from 'node:assert/strict';
import { attachCorporateDriveOperators, CORPORATE_OPERATORS, needsValve } from '../src/corporateDriveOperators.js';
import { pointAt, WORLD_SCALE } from '../src/clearImageSource.js';

// Synthetic geometry on the real staff points: two opposing lanes share a narrow
// stretch between #60 and #61 and diverge on their approaches; a third lane
// passes #59 only.
const world = i => pointAt(i).map(n => n * WORLD_SCALE);
function polyline(points) {
  const segs = []; let length = 0;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, from: length, l }); length += l;
  }
  return { length, path: { getPointAt(t) {
    const d = Math.max(0, Math.min(1, t)) * length, s = segs.find(g => d <= g.from + g.l) ?? segs.at(-1), k = s.l ? (d - s.from) / s.l : 0;
    return { x: s.a[0] + (s.b[0] - s.a[0]) * k, z: s.a[1] + (s.b[1] - s.a[1]) * k };
  } } };
}
function fixture(options) {
  const p60 = world(60), p61 = world(61), p59 = world(59);
  const D = Math.hypot(p61[0] - p60[0], p61[1] - p60[1]), u = [(p61[0] - p60[0]) / D, (p61[1] - p60[1]) / D], n = [-u[1], u[0]];
  const at = (p, du, dn) => [p[0] + u[0] * du + n[0] * dn, p[1] + u[1] * du + n[1] * dn];
  const sw = polyline([at(p61, 8, 6), at(p61, 0, .3), at(p60, 0, .3), at(p60, -8, 6)]);
  const ne = polyline([at(p60, -8, -6), at(p60, 0, -.3), at(p61, 0, -.3), at(p61, 8, -6)]);
  const west = polyline([[p59[0] - 8, p59[1]], [p59[0] + 8, p59[1]]]);
  const state = { cars: [], lanes: [sw, ne, west] };
  attachCorporateDriveOperators(state, options);
  // Learn each lane's stop line from the operators themselves.
  state.cars = [{ id: 'probe-sw', lane: 0, phase: 'departing', distance: 0 }, { id: 'probe-ne', lane: 1, phase: 'arrival', distance: 0 }];
  state.prepareCorporateDriveOperators();
  const stop = { sw: state.cars[0].corridorStopDistance, ne: state.cars[1].corridorStopDistance };
  state.cars = [];
  return { state, stop, D };
}
const op = (s, index) => s.corporateOperators.operators.find(o => o.index === index);
const departure = (id, distance) => ({ id, lane: 0, phase: 'departing', distance });
const arrival = (id, distance) => ({ id, lane: 1, phase: 'arrival', distance });
const shuttle = (id, lane, distance) => ({ id, lane, phase: 'shuttle', fleetBus: true, bodyLength: 3.5, distance });

test('three separate operators, #60 and #61 own opposite ends, #59 records passage only', () => {
  const { state, stop } = fixture();
  assert.deepEqual(CORPORATE_OPERATORS.map(o => o.id), ['corporateOfficer', 'permitOfficer', 'bEntrance']);
  assert.equal(new Set(state.corporateOperators.operators).size, 3);
  assert.equal(op(state, 59).end, null);
  assert.equal(op(state, 60).end, 'ne');
  assert.equal(op(state, 61).end, 'sw');
  assert.ok(Number.isFinite(stop.sw) && Number.isFinite(stop.ne), 'both directions have a stop line');
});

test('departure inside the stretch holds an opposing arrival at its stop line', () => {
  const { state, stop, D } = fixture();
  const dep = departure('dep', stop.sw + 3.4 + D / 2), arr = arrival('arr', stop.ne);
  state.cars = [dep, arr]; state.prepareCorporateDriveOperators();
  assert.equal(arr.holdForCorridor, true);
  assert.equal(arr.corridorStopDistance, stop.ne);
  assert.equal(op(state, 60).reason, 'opposing traffic in stretch');
});

test('shuttle waiting at #60 outranks a departure waiting at #61', () => {
  const { state, stop } = fixture();
  const dep = departure('dep', stop.sw), bus = shuttle('bus', 1, stop.ne);
  state.cars = [dep, bus]; state.prepareCorporateDriveOperators();
  assert.equal(bus.holdForCorridor, false);
  assert.equal(bus.corridorStopDistance, undefined);
  assert.equal(dep.holdForCorridor, true);
  assert.equal(op(state, 61).reason, 'higher class waiting at other end');
});

test('departure waiting at #61 outranks an arrival waiting at #60', () => {
  const { state, stop } = fixture();
  const dep = departure('dep', stop.sw), arr = arrival('arr', stop.ne);
  state.cars = [dep, arr]; state.prepareCorporateDriveOperators();
  assert.equal(dep.holdForCorridor, false);
  assert.equal(arr.holdForCorridor, true);
  assert.equal(op(state, 60).reason, 'higher class waiting at other end');
});

test('arrival vs shuttle stays on existing local bus priority (no valve)', () => {
  const { state, stop } = fixture();
  const arr = arrival('arr', stop.ne), bus = shuttle('bus', 0, stop.sw);
  assert.equal(needsValve(arr, bus), false);
  state.cars = [arr, bus]; state.prepareCorporateDriveOperators();
  assert.equal(arr.holdForCorridor, false);
  assert.equal(bus.holdForCorridor, false);
});

test('same-direction follower is admitted behind a departure already in the stretch', () => {
  const { state, stop } = fixture();
  const lead = departure('lead', stop.sw + 6), next = departure('next', stop.sw);
  state.cars = [lead, next]; state.prepareCorporateDriveOperators();
  assert.equal(next.holdForCorridor, false);
  assert.equal(op(state, 61).reason, 'admitted');
});

test('#59 never holds traffic; disabled operators hold nothing', () => {
  const { state } = fixture();
  const car = { id: 'w', lane: 2, phase: 'arrival', distance: 4 };
  state.cars = [car]; state.prepareCorporateDriveOperators();
  assert.equal(car.corridorStopDistance, undefined);
  assert.equal(car.holdForCorridor, false);
  const off = fixture({ enabled: false });
  const dep = departure('dep', 0), arr = arrival('arr', 0);
  off.state.cars = [dep, arr]; off.state.prepareCorporateDriveOperators();
  assert.equal(dep.corridorStopDistance, undefined);
  assert.equal(arr.corridorStopDistance, undefined);
});

test('two-way: opposing lanes wider than conflictGap get no valve, passage still counted', () => {
  const p60 = world(60), p61 = world(61);
  const D = Math.hypot(p61[0] - p60[0], p61[1] - p60[1]), u = [(p61[0] - p60[0]) / D, (p61[1] - p60[1]) / D], n = [-u[1], u[0]];
  const at = (p, du, dn) => [p[0] + u[0] * du + n[0] * dn, p[1] + u[1] * du + n[1] * dn];
  // Opposing lanes 1.5 world apart for the whole span (separate two-way lanes).
  const sw = polyline([at(p61, 8, .75), at(p60, -8, .75)]);
  const ne = polyline([at(p60, -8, -.75), at(p61, 8, -.75)]);
  const state = { cars: [], lanes: [sw, ne] };
  attachCorporateDriveOperators(state);
  const dep = { id: 'dep', lane: 0, phase: 'departing', distance: 8 + D / 2 };
  const arr = { id: 'arr', lane: 1, phase: 'arrival', distance: 8 };
  state.cars = [dep, arr]; state.prepareCorporateDriveOperators();
  assert.equal(arr.holdForCorridor, false);
  assert.equal(arr.corridorStopDistance, undefined);
  assert.equal(dep.holdForCorridor, false);
  dep.distance = sw.length; arr.distance = ne.length;
  state.observeCorporateDriveOperators();
  assert.equal(op(state, 60).passed, 2);
  assert.equal(op(state, 61).passed, 2);
});

test('every operator counts vehicles passing its point exactly once', () => {
  const { state } = fixture();
  const dep = departure('dep', 0), w = { id: 'w', lane: 2, phase: 'arrival', distance: 0 };
  state.cars = [dep, w];
  dep.distance = state.lanes[0].length; w.distance = state.lanes[2].length;
  state.observeCorporateDriveOperators(); state.observeCorporateDriveOperators();
  assert.equal(op(state, 59).passed, 1);
  assert.equal(op(state, 60).passed, 1);
  assert.equal(op(state, 61).passed, 1);
});

// Measured eleven-service deadlock (research/claudy-corporate-occupant-report-2026-11-06.md):
// #60 admitted shuttle-5 northeast; it then waits on held arrival 1038, while #60
// holds 1038 for departure 405 at #61, and #61 waits for shuttle-5 to clear.
test('end operator releases its head car when an admitted own-direction occupant waits on it', () => {
  const { state, stop } = fixture();
  const dep = departure('dep', stop.sw), arr = arrival('arr', stop.ne);
  const bus = { ...shuttle('bus', 1, stop.ne + 2), yieldingTo: 'arr' };
  state.cars = [dep, arr, bus]; state.prepareCorporateDriveOperators();
  assert.equal(arr.holdForCorridor, false, 'head car released so the occupant can clear');
  assert.equal(op(state, 60).reason, 'admitted');
  assert.equal(dep.holdForCorridor, true, 'rival still waits for the stretch to clear');
  assert.equal(op(state, 61).reason, 'opposing traffic in stretch');
});

test('exit priority unchanged when the own-direction occupant is not waiting on the head car', () => {
  const { state, stop } = fixture();
  const dep = departure('dep', stop.sw), arr = arrival('arr', stop.ne);
  const bus = shuttle('bus', 1, stop.ne + 2);
  state.cars = [dep, arr, bus]; state.prepareCorporateDriveOperators();
  assert.equal(arr.holdForCorridor, true);
  assert.equal(op(state, 60).reason, 'higher class waiting at other end');
});

test('release never admits into opposing traffic', () => {
  const { state, stop, D } = fixture();
  const inStretch = departure('in', stop.sw + 3.4 + D / 2), arr = arrival('arr', stop.ne);
  const bus = { ...shuttle('bus', 1, stop.ne + 2), yieldingTo: 'arr' };
  state.cars = [inStretch, arr, bus]; state.prepareCorporateDriveOperators();
  assert.equal(arr.holdForCorridor, true);
  assert.equal(op(state, 60).reason, 'opposing traffic in stretch');
});
