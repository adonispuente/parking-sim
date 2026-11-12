import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createShuttleDemand } from '../src/shuttleDemand.js';
import { attachShuttles } from '../src/shuttles.js';
import { createCampusTraffic } from '../src/traffic.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';
import { createSeekablePlayback } from '../src/playback.js';
import { SUNDAY_SERVICES } from '../src/sundayServices.js';

const trip = { b: 200, cNorth: 200, cSouth: 200 };
const lane = points => {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(
    new THREE.Vector3(points[i-1][0], 0, points[i-1][1]), new THREE.Vector3(points[i][0], 0, points[i][1])));
  return { path, length: path.getLength() };
};
const live = [{ id: 'b', open: true, capacity: 487 }];
const setup = (override = {}, options = {}) => {
  const state = { cars: [], lanes: [], clock: 0, occupancy: { b: 0 }, zoneOccupancy: {}, parkedVehicles: [], phase: 'arrival' };
  attachShuttles(state, lane, { dispatchMode: 'demand', demandOverride: override, dwellSeconds: 0, ...options });
  return state;
};
const finish = (state, bus) => {
  const car = state.cars.find(car => car.id === bus.id);
  assert.ok(car);
  state.cars.splice(state.cars.indexOf(car), 1); state.completeShuttle(car);
};

test('vehicle-event estimate generates arrival and own-service return once, not parked occupancy', () => {
  const state = { clock: 0, shuttleConfig: {}, shuttles: [], occupancy: { b: 487 },
    parkedVehicles: [{ id: 1, target: 'b', zone: 'bNorth', readyAt: 100 }] };
  const demand = createShuttleDemand(state, trip);
  demand.update(); demand.publish();
  assert.equal(state.shuttleDemand.areas.b.waiting.toHome, 0);
  demand.register({ id: 2, target: 'c', zone: 'cFirstSouth', readyAt: 200 }, true);
  demand.publish(); assert.equal(state.shuttleDemand.areas.cSouth.waiting.toHome, 1.25);
  state.clock = 100; demand.update(); demand.publish();
  assert.equal(state.shuttleDemand.areas.b.waiting.toLot, 1.25);
  demand.update(); demand.publish(); assert.equal(state.shuttleDemand.areas.b.waiting.toLot, 1.25);
});

test('commitments cover demand without sending the whole fleet; stable ties and zero hold', () => {
  const state = { clock: 0, shuttleConfig: { demandOverride: { b: { toHome: 20 }, cNorth: { toHome: 20 } } }, shuttles: [] };
  const demand = createShuttleDemand(state, trip); demand.update();
  assert.equal(demand.choose().area, 'b');
  const first = { number: 1 }; state.shuttles.push(first); demand.reserve(first, demand.choose());
  assert.equal(demand.choose().area, 'cNorth');
  const next = { number: 2 }; state.shuttles.push(next); demand.reserve(next, demand.choose());
  assert.equal(demand.choose().area, null);
  demand.publish(); assert.equal(state.shuttleDemand.areas.b.committed.toHome, 20);
});

test('quiet nonzero demand wins after age guard even beside a large peak', () => {
  const state = { clock: 0, shuttleConfig: { demandOverride: { b: { toHome: 1000 }, cSouth: { toHome: 1 } } }, shuttles: [] };
  const demand = createShuttleDemand(state, trip); demand.update();
  const bus = { number: 1 }; state.shuttles.push(bus); demand.reserve(bus, demand.choose());
  state.clock = 239; assert.equal(demand.choose().area, 'b');
  state.clock = 240; const decision = demand.choose();
  // B was assigned at time0 too: service/assignment to B resets its priority age.
  state.clock = 250; demand.reserve(bus, { area: 'b', reason: 'test fresh B assignment' });
  assert.equal(demand.choose().area, 'cSouth');
  assert.match(demand.choose().reason, /safeguard/);
  assert.ok(decision.area);
});

test('controlled demand drains once; B two pickups do not double-service reservations', () => {
  const state = setup({ b: { toHome: 25, toLot: 8 } }, { activeCount: 1 });
  state.prepareShuttles(live); const bus = state.shuttles[0];
  assert.equal(bus.circuit, 'b'); finish(state, bus);
  assert.equal(state.shuttleDemand.areas.b.waiting.toHome, 5);
  assert.equal(state.shuttleDemand.areas.b.waiting.toLot, 0);
  state.prepareShuttles(live); finish(state, bus);
  assert.equal(state.shuttleDemand.areas.b.served.toHome, 20);
  state.prepareShuttles(live); finish(state, bus);
  state.clock = 20; state.prepareShuttles(live);
  assert.equal(state.shuttleDemand.areas.b.waiting.toHome, 5, 'override not replenished every tick');
});

test('C demand shift preserves moving lane then changes only at shared roundabout', () => {
  const state = setup({ cNorth: { toHome: 20 } }, { activeCount: 1 });
  state.prepareShuttles(live); const bus = state.shuttles[0], car = state.cars[0], index = car.lane;
  state.setShuttleConfig({ demandOverride: { cSouth: { toHome: 60 } } });
  state.prepareShuttles(live);
  assert.equal(car.lane, index); assert.equal(bus.circuit, 'cNorth');
  finish(state, bus); assert.equal(bus.circuit, 'cSouth');
  assert.equal(bus.leg, 1); state.prepareShuttles(live);
  assert.equal(state.cars[0].lane, state.shuttleLaneIds.cSouth[1]);
});

test('zero demand holds home; disabled remote bus finishes and clears reservation', () => {
  const empty = setup(); empty.prepareShuttles(live);
  assert.equal(empty.cars.length, 0); assert.equal(empty.shuttles[0].phase, 'demand-hold');
  const state = setup({ b: { toHome: 20 } }, { activeCount: 1 });
  state.prepareShuttles(live); const bus = state.shuttles[0]; finish(state, bus);
  state.setShuttleConfig({ enabled: false });
  state.prepareShuttles(live); finish(state, bus);
  state.prepareShuttles(live); finish(state, bus); state.prepareShuttles(live);
  assert.equal(state.cars.length, 0); assert.equal(bus.demandAssignment, null);
});

test('blocked home assignment counts as committed and is canceled on retirement', () => {
  const state = setup({ b: { toHome: 20 } }, { activeCount: 1 });
  state.cars.push({ id: 'block', lane: state.shuttleLaneIds.b[0], distance: 0 });
  state.prepareShuttles(live);
  assert.equal(state.shuttleDemand.areas.b.committed.buses, 1);
  state.setShuttleConfig({ activeCount: 0 }); state.prepareShuttles(live);
  assert.equal(state.shuttleDemand.areas.b.committed.buses, 0);
});

test('demand break cancels blocked home reservation and resumes safely', () => {
  const state = setup({ b: { toHome: 80 } }, { activeCount: 1 });
  state.serviceController = { preset: SUNDAY_SERVICES.eleven };
  state.cars.push({ id: 'block', lane: state.shuttleLaneIds.b[0], distance: 0 });
  state.prepareShuttles(live);
  assert.equal(state.shuttleDemand.areas.b.committed.buses, 1);
  const start = (660 - 605 + 45) * 60;
  state.clock = start; state.prepareShuttles(live);
  assert.equal(state.shuttleDemand.areas.b.committed.buses, 0);
  state.cars = []; state.clock = start + 600; state.prepareShuttles(live);
  assert.equal(state.shuttles[0].circuit, 'b');
});

test('one bus follows B-to-C shift at home, not on a moving B leg', () => {
  const state = setup({ b: { toHome: 20 } }, { activeCount: 1 });
  state.prepareShuttles(live); const bus = state.shuttles[0];
  state.setShuttleConfig({ demandOverride: { cNorth: { toLot: 20 } } });
  state.prepareShuttles(live); assert.equal(bus.circuit, 'b');
  finish(state, bus); state.prepareShuttles(live); finish(state, bus);
  state.prepareShuttles(live); finish(state, bus);
  state.clock = 20; state.prepareShuttles(live); assert.equal(bus.circuit, 'cNorth');
});

test('demand frames and seek reconstruction reproduce ledger, assignment and vehicle locations', async () => {
  const factory = () => createCampusTraffic({ initialOccupancy: { a: 0, b: 0, c: 0 },
    shuttles: { dispatchMode: 'demand', activeCount: 1, dwellSeconds: 0,
      demandOverride: { cSouth: { toHome: 60 }, b: { toLot: 20 } } } });
  const playback = createSeekablePlayback(factory, {}, { captureFrame: captureTrafficFrame, yieldWork: async () => {} });
  await playback.seek(120); const first = captureTrafficFrame(playback.simulation);
  await playback.seek(40); await playback.seek(120);
  assert.deepEqual(captureTrafficFrame(playback.simulation), first);
  assert.equal(first.shuttleDemand.source, 'controlled demand override');
});