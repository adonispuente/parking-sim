import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';
import { attachShuttles } from '../src/shuttles.js';

const lane = (a, b) => {
  const path = new THREE.LineCurve3(new THREE.Vector3(a[0], 0, a[1]), new THREE.Vector3(b[0], 0, b[1]));
  return { path, length: path.getLength() };
};
const bus = (id, patch = {}) => ({ id, lane: 0, distance: 16, speed: 2.5,
  fleetBus: true, phase: 'shuttle', bodyLength: 2.9, ...patch });
const car = (id, patch = {}) => ({ id, lane: 0, distance: 10, speed: 0,
  phase: 'arrival', bodyLength: 1.35, ...patch });

for (const reversed of [false, true]) {
  test(`opposing fleet buses pass through the same connector (reversed=${reversed})`, () => {
    const a = bus('a', { distance: 17 }), b = bus('b', { lane: 1, distance: 17 });
    const state = { lanes: [lane([-20, 0], [20, 0]), lane([20, 0], [-20, 0])],
      cars: reversed ? [b, a] : [a, b] };
    for (let i = 0; i < 20; i++) advanceSharedTraffic(state, .1);
    assert.ok(a.distance > 21 && b.distance > 21);
    assert.equal(a.yieldingTo, null);
    assert.equal(b.yieldingTo, null);
  });
}

test('same-lane fleet buses pass through a stopped bus', () => {
  const lead = bus('lead', { distance: 10, speed: 0 });
  const follower = bus('follower', { distance: 6.7 });
  const state = { lanes: [lane([0, 0], [0, 100])], cars: [follower, lead] };
  for (let i = 0; i < 20; i++) advanceSharedTraffic(state, .1);
  assert.ok(follower.distance > lead.distance);
  assert.equal(follower.yieldingTo, null);
});

test('fleet bus still stops behind an ordinary stopped car', () => {
  const lead = car('lead');
  const follower = bus('follower', { distance: 6.7 });
  const state = { lanes: [lane([0, 0], [0, 100])], cars: [follower, lead] };
  advanceSharedTraffic(state, .1);
  assert.equal(follower.distance, 6.7);
  assert.equal(follower.yieldingTo, 'lead');
  assert.equal(follower.yieldReason, 'safe-following');
});

test('ordinary car still stops behind a fleet bus', () => {
  const lead = bus('lead', { distance: 10, speed: 0 });
  const follower = car('follower', { distance: 6.7, speed: 2.5 });
  const state = { lanes: [lane([0, 0], [0, 100])], cars: [follower, lead] };
  advanceSharedTraffic(state, .1);
  assert.equal(follower.distance, 6.7);
  assert.equal(follower.yieldingTo, 'lead');
  assert.equal(follower.yieldReason, 'safe-following');
});

const makeLane = points => {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(
    new THREE.Vector3(points[i - 1][0], 0, points[i - 1][1]),
    new THREE.Vector3(points[i][0], 0, points[i][1])));
  return { path, length: path.getLength() };
};
const live = [{ id: 'b', open: true, capacity: 487 }];
const setup = () => {
  const state = { cars: [], lanes: [], clock: 0, occupancy: { b: 0 },
    zoneOccupancy: {}, phase: 'arrival' };
  attachShuttles(state, makeLane, { activeCount: 2 });
  return state;
};

test('second shuttle launch ignores bus at its start while retaining 15s HOME spacing', () => {
  const state = setup();
  state.prepareShuttles(live);
  assert.ok(state.cars.some(item => item.id === 'shuttle-1'));
  state.clock = 14;
  state.prepareShuttles(live);
  assert.equal(state.cars.some(item => item.id === 'shuttle-2'), false);
  state.clock = Math.max(15, state.shuttles[1].readyAt);
  state.prepareShuttles(live);
  assert.ok(state.cars.some(item => item.id === 'shuttle-2'), 'bus at HOME does not block bus launch');
});

test('shuttle launch stays blocked by ordinary car at its start', () => {
  const state = setup();
  state.cars.push({ id: 'car-at-home', lane: state.shuttleLaneIds.b[0], distance: 0 });
  state.prepareShuttles(live);
  assert.equal(state.cars.some(item => item.id === 'shuttle-1'), false);
  state.cars = [];
  state.clock = 1;
  state.prepareShuttles(live);
  assert.ok(state.cars.some(item => item.id === 'shuttle-1'), 'launch retries after car clears');
});
