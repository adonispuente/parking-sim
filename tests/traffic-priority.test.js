import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';
import { compareTrafficPriority, SHUTTLE_CAR_EQUIVALENT } from '../src/trafficPriority.js';

const lane = (a, b) => {
  const path = new THREE.LineCurve3(new THREE.Vector3(a[0], 0, a[1]), new THREE.Vector3(b[0], 0, b[1]));
  return { path, length: path.getLength() };
};
const crossing = cars => ({ lanes: [lane([-20, 0], [20, 0]), lane([0, -20], [0, 20])], cars });
const car = (id, patch = {}) => ({ id, lane: 0, distance: 17, speed: 2.5, phase: 'arrival', ...patch });
const bus = (patch = {}) => car('bus', { fleetBus: true, phase: 'shuttle', bodyLength: 2.9, lane: 1, distance: 16, ...patch });

test('strict class priority: a bus has at least20 car value, then departures, then arrivals', () => {
  assert.ok(SHUTTLE_CAR_EQUIVALENT >= 20);
  assert.ok(compareTrafficPriority(bus(), car('departure', { phase: 'departing' })) < 0);
  assert.ok(compareTrafficPriority(car('departure', { phase: 'departing' }), car('arrival')) < 0);
});

for (const reversed of [false, true]) {
  test(`shuttle wins an unoccupied crossing regardless of insertion order (reversed=${reversed})`, () => {
    const a = car('arrival'), b = bus();
    const state = crossing(reversed ? [b, a] : [a, b]);
    advanceSharedTraffic(state, .1);
    assert.ok(b.distance > 16);
    assert.equal(a.distance, 17);
    assert.equal(a.yieldingTo, 'bus');
    assert.equal(a.yieldReason, 'shuttle-priority');
  });
  test(`departure has priority over arriving cars (reversed=${reversed})`, () => {
    const a = car('arrival', { distance: 17.5 }), b = car('departure', { lane: 1, phase: 'departing', distance: 16 });
    const state = crossing(reversed ? [b, a] : [a, b]);
    advanceSharedTraffic(state, .1);
    assert.ok(b.distance > 16);
    assert.equal(a.distance, 17.5);
    assert.equal(a.yieldReason, 'departure-priority');
  });
}

test('a queue of twenty arrivals cannot outvote one approaching shuttle', () => {
  const arrivals = Array.from({ length: 20 }, (_, i) => car(`arrival-${i}`, { distance: 17 - i * 2.8 }));
  // Use a longer approach so every queued car is actually on the road.
  const state = { lanes: [lane([-100, 0], [20, 0]), lane([0, -20], [0, 20])],
    cars: [...arrivals.map(a => ({ ...a, distance: a.distance + 80 })), bus()] };
  advanceSharedTraffic(state, .1);
  assert.ok(state.cars.at(-1).distance > 16);
  assert.equal(state.cars[0].distance, 97);
  assert.equal(state.cars[0].yieldingTo, 'bus');
});

test('a vehicle already crossing clears before the priority bus enters', () => {
  const a = car('already-crossing', { distance: 19.9 }), b = bus({ distance: 17 });
  const state = crossing([b, a]);
  advanceSharedTraffic(state, .1);
  assert.ok(a.distance > 19.9);
  assert.equal(b.distance, 17);
  assert.equal(b.yieldReason, 'clear-occupied-conflict');
});

test('priority bus follows the slower lead car without overlap or reverse-yield deadlock', () => {
  const a = car('lead', { distance: 10, speed: .5 }), b = bus({ lane: 0, distance: 6.7 });
  const state = { lanes: [lane([0, 0], [0, 100])], cars: [b, a] };
  const gap = (1.35 + 2.9) / 2 + 1.25;
  for (let i = 0; i < 100; i++) {
    advanceSharedTraffic(state, .1);
    assert.ok(a.distance - b.distance >= 3.3 - 1e-6);
  }
  assert.ok(a.distance > 14.9); assert.ok(b.distance > 10);
  assert.equal(b.yieldReason, 'safe-following');
  assert.ok(a.distance - b.distance >= gap - .051);
});

test('opposing separated lanes keep moving without a false shuttle conflict', () => {
  const a = car('opposing', { distance: 18 });
  const b = bus({ distance: 18 });
  const state = { lanes: [lane([-.6, -20], [-.6, 20]), lane([.6, 20], [.6, -20])], cars: [a, b] };
  advanceSharedTraffic(state, .1);
  assert.equal(a.trafficWaiting, false); assert.equal(b.trafficWaiting, false);
});

test('equally ranked cars resolve crossing ties identically after array reorder', () => {
  const run = reverse => {
    const a = car('1', { distance: 17.5 }), b = car('2', { lane: 1, distance: 17.5 });
    const state = crossing(reverse ? [b, a] : [a, b]);
    advanceSharedTraffic(state, .1);
    return [a.distance, b.distance];
  };
  assert.deepEqual(run(false), run(true));
  assert.ok(run(false)[0] > 17.5); assert.equal(run(false)[1], 17.5);
});

test('a held shuttle does not reserve an empty crossing it cannot approach', () => {
  const a = car('arrival'), b = bus({ holdForGate: true });
  advanceSharedTraffic(crossing([a, b]), .1);
  assert.ok(a.distance > 17); assert.equal(b.distance, 16);
});

test('lower-priority traffic resumes once the shuttle clears the crossing', () => {
  const a = car('arrival'), b = bus(), state = crossing([a, b]);
  for (let i = 0; i < 100; i++) advanceSharedTraffic(state, .1);
  assert.ok(b.distance > 35); assert.ok(a.distance > 25);
});

test('merging arrival yields before taking the shuttle lane', () => {
  const b = bus({ lane: 0, distance: 16 });
  const a = car('merging', { lane: 1, distance: 16 });
  const state = { lanes: [lane([0, -20], [0, 20]), lane([12, -16], [-12, 16])], cars: [a, b] };
  advanceSharedTraffic(state, .1);
  assert.ok(b.distance > 16);
  // May approach the stop point, but must yield as the shuttle reaches the merge.
  for (let i = 0; i < 10; i++) advanceSharedTraffic(state, .1);
  assert.ok(a.trafficWaiting); assert.equal(a.yieldingTo, 'bus');
});
