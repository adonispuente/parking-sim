import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import drawing from '../images/LotCHubs.json' with { type: 'json' };
import { C_HUBS, C_FOUR_WAY, C_ROUNDABOUT_POSITION } from '../src/cHubSource.js';
import { cHubArrival, cHubDeparture, C_HUB_ROUTE_PROVENANCE } from '../src/cHubRoutes.js';
import { clearSegment, distance } from '../src/sourceRouting.js';
import { createCampusTraffic } from '../src/traffic.js';
import { WORLD_SCALE, pointAt } from '../src/clearImageSource.js';
import { SHUTTLE_STOPS } from '../src/shuttleRoutes.js';
import { attachCRoundaboutControl } from '../src/cRoundaboutControl.js';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';
import { serviceOptions } from '../src/sundayServices.js';
import { serviceCarryOptions } from '../src/serviceCarry.js';

test('new C drawing binds all seven exact hubs and the separate four-way position', () => {
  assert.equal(C_HUBS.length, 7);
  for (const hub of C_HUBS) assert.deepEqual(hub.point, drawing.shapes[hub.sourceIndex].points[0]);
  assert.deepEqual(C_FOUR_WAY, drawing.shapes[49].points);
  assert.deepEqual(C_ROUNDABOUT_POSITION, drawing.shapes[48].points[0]);
  for (const [id, index] of [['cRoundabout', 47], ['cSouth', 48], ['cNorth', 49]])
    assert.deepEqual(SHUTTLE_STOPS.find(s => s.id === id).point, pointAt(index));
});

test('every hub has a roof-clear arrival and two different exit paths at its exact parking anchor', () => {
  const westRoutes = new Set(), eastRoutes = new Set();
  for (const hub of C_HUBS) {
    const arrival = cHubArrival(hub.id);
    assert.deepEqual(arrival.at(-1), hub.point);
    for (const access of ['cWest', 'cEast']) {
      const departure = cHubDeparture(hub.id, access);
      assert.deepEqual(departure[0], hub.point);
      for (const route of [arrival, departure]) for (let i = 1; i < route.length; i++)
        assert.ok(clearSegment(route[i - 1], route[i]), `${hub.id} ${access} touches a roof`);
      (access === 'cWest' ? westRoutes : eastRoutes).add(JSON.stringify(departure.slice(0, 20)));
    }
  }
  assert.equal(westRoutes.size, 7); assert.equal(eastRoutes.size, 7);
  assert.ok(C_HUB_ROUTE_PROVENANCE.some(p => p.sources.includes(40)));
  assert.ok(C_HUB_ROUTE_PROVENANCE.some(p => p.sources.includes(42)));
});

const makeLane = pixels => {
  const path = new THREE.CurvePath();
  for (let i = 1; i < pixels.length; i++) path.add(new THREE.LineCurve3(
    new THREE.Vector3(pixels[i - 1][0] * WORLD_SCALE, .6, pixels[i - 1][1] * WORLD_SCALE),
    new THREE.Vector3(pixels[i][0] * WORLD_SCALE, .6, pixels[i][1] * WORLD_SCALE)));
  return { path, length: path.getLength() };
};
const junctionState = cars => {
  const lanes = [makeLane([[925, 179], [1030, 179]]), makeLane([[982, 240], [982, 135]]), makeLane([[968, 135], [968, 240]])];
  const s = { lanes, cars, clock: 0 }; attachCRoundaboutControl(s);
  return s;
};
const vehicle = (id, lane, phase, extra = {}) => ({ id, lane, phase, distance: 0, speed: 2.5, ...extra });

test('four-way gives a conflicting shuttle priority over exits, then gives exits priority over entries', () => {
  const check = (higher, lower) => {
    const s = junctionState([higher, lower]);
    // Bring both cars to their waiting lines without placing them in the area.
    for (let i = 0; i < 6; i++) { s.prepareCRoundaboutControl(); advanceSharedTraffic(s, .1); }
    s.prepareCRoundaboutControl();
    assert.ok(s.cRoundabout.admitted.includes(higher.id), JSON.stringify(s.cRoundabout));
    assert.ok(s.cRoundabout.held.includes(lower.id), JSON.stringify(s.cRoundabout));
    assert.ok(Number.isFinite(lower.cRoundaboutStopDistance));
  };
  check(vehicle('bus', 0, 'shuttle', { fleetBus: true, bodyLength: 2.9 }), vehicle('exit', 1, 'departing'));
  check(vehicle('exit', 0, 'departing'), vehicle('entry', 1, 'arrival'));
});

test('opposite separated movements can enter the four-way together', () => {
  const a = vehicle('exit', 1, 'departing'), b = vehicle('entry', 2, 'arrival');
  const s = junctionState([a, b]);
  for (let i = 0; i < 35; i++) { s.prepareCRoundaboutControl(); advanceSharedTraffic(s, .1); }
  assert.ok(a.distance > 5 && b.distance > 5, `entry/exit stalled: ${a.distance}, ${b.distance}`);
  assert.equal(s.cRoundabout.held.length, 0);
});

test('an occupied crossing clears before an approaching priority bus', () => {
  const car = vehicle('clearing', 1, 'arrival', { distance: 4.4 });
  const bus = vehicle('bus', 0, 'shuttle', { fleetBus: true, bodyLength: 2.9 });
  const s = junctionState([bus, car]); s.prepareCRoundaboutControl();
  assert.ok(s.cRoundabout.admitted.includes(car.id));
  assert.ok(s.cRoundabout.held.includes(bus.id));
  assert.equal(car.cRoundaboutStopDistance, undefined);
});

test('the marshal releases a priority bus blocking chain without releasing unrelated conflicts', () => {
  const bus = vehicle('bus', 0, 'shuttle', { fleetBus: true, bodyLength: 2.9, yieldingTo: 'leader' });
  const leader = vehicle('leader', 1, 'arrival'), other = vehicle('other', 1, 'arrival');
  const s = junctionState([bus, leader, other]); s.prepareCRoundaboutControl();
  assert.equal(leader.cRoundaboutStopDistance, undefined);
  assert.ok(s.cRoundabout.clearing.includes('leader'));
  assert.ok(s.cRoundabout.held.includes('other'));
});

test('initial C parking uses all hubs and departures launch from their own built anchor', () => {
  const s = createCampusTraffic({ phase: 'departure', initialOccupancy: { c: 400 }, shuttles: { activeCount: 0 } });
  assert.equal(Object.values(s.cHubOccupancy).reduce((a, b) => a + b), 400);
  assert.ok(Object.values(s.cHubOccupancy).every(n => n > 0));
  const parked = new Map(s.parkedVehicles.map(car => [car.id, car.cHubId]));
  s.step(.1);
  const moving = s.cars.filter(car => car.target === 'c');
  assert.equal(new Set(moving.map(c => c.cHubId)).size, 7);
  for (const car of moving) {
    assert.equal(car.cHubId, parked.get(car.id));
    const p = s.lanes[car.lane].path.getPointAt(0), hub = C_HUBS.find(h => h.id === car.cHubId);
    assert.ok(distance([p.x / WORLD_SCALE, p.z / WORLD_SCALE], hub.point) < .001);
  }
  assert.deepEqual(s.routingIssues, []);
  const frame = captureTrafficFrame(s);
  assert.deepEqual(frame.cHubOccupancy, s.cHubOccupancy);
  assert.deepEqual(frame.cRoundabout, s.cRoundabout);
  frame.cRoundabout.held.push('clone'); assert.ok(!s.cRoundabout.held.includes('clone'));
});

test('C arrivals distribute across hubs, park there, and retain the same hub on departure', () => {
  const s = createCampusTraffic({ lotSettings: [{ id: 'a', open: false }, { id: 'b', open: false }], shuttles: { activeCount: 0 } });
  s.waiting[1] = 14;
  for (let i = 0; i < 4500 && s.parkedVehicles.length < 14; i++) s.step(.1);
  assert.deepEqual(s.routingIssues, []);
  assert.equal(s.parkedVehicles.length, 14);
  assert.equal(new Set(s.parkedVehicles.map(car => car.cHubId)).size, 5);
  assert.equal(s.cHubOccupancy['c-hub-54'], 0); assert.equal(s.cHubOccupancy['c-hub-55'], 0);
  for (const car of s.parkedVehicles) {
    const p = s.lanes[car.lane].path.getPointAt(1), hub = C_HUBS.find(h => h.id === car.cHubId);
    assert.ok(distance([p.x / WORLD_SCALE, p.z / WORLD_SCALE], hub.point) < .001);
    car.readyAt = 0;
  }
  const expected = new Map(s.parkedVehicles.map(car => [car.id, car.cHubId]));
  s.setPhase('departure'); s.step(.1);
  for (const car of s.cars) assert.equal(car.cHubId, expected.get(car.id));
});

test('mixed C arrivals, departures and three shuttles all finish without a marshal dependency lock', () => {
  const s = createCampusTraffic({ phase: 'mixed', initialOccupancy: { c: 70 },
    lotSettings: [{ id: 'a', open: false }, { id: 'b', open: false }], shuttles: { activeCount: 3, dwellSeconds: 1 } });
  s.waiting[1] = 28;
  for (let i = 0; i < 9000; i++) s.step(.1);
  assert.deepEqual(s.routingIssues, []);
  assert.equal(s.exited[1], 28);
  assert.equal(s.departed.c, 98);
  assert.equal(s.cars.filter(car => !car.fleetBus).length, 0);
  assert.ok(s.shuttles.slice(0, 3).every(bus => bus.trips > 0));
});

test('all seven C hubs clear 400 parked cars and 42 arrivals while five shuttles keep circulating', () => {
  const s = createCampusTraffic({ phase: 'mixed', initialOccupancy: { c: 400 },
    lotSettings: [{ id: 'a', open: false }, { id: 'b', open: false }], shuttles: { activeCount: 5 } });
  assert.equal(new Set(s.parkedVehicles.map(car => car.cHubId)).size, 7);
  s.waiting[1] = 42;
  for (let i = 0; i < 24000 && (s.departed.c < 442 || s.shuttles.some(bus => bus.trips < 5)); i++) s.step(.1);
  assert.deepEqual(s.routingIssues, []);
  assert.equal(s.exited[1], 42);
  assert.equal(s.departed.c, 442);
  assert.equal(s.parkedVehicles.length, 0);
  assert.equal(s.cars.filter(car => !car.fleetBus).length, 0);
  assert.ok(s.shuttles.every(bus => bus.trips >= 5));
});

test('carrying a service preserves each parked C hub and upgrades older checkpoints', () => {
  const options = { initialOccupancy: { c: 14 }, service: { enabled: true, ...serviceOptions('nine', { demand: 0, beginMinute: 540 }) } };
  const first = createCampusTraffic(options);
  assert.ok(first.serviceCarry);
  const patch = serviceCarryOptions(options, { ...first, active: 0 }, 'eleven');
  const next = createCampusTraffic({ ...options, ...patch, service: { ...patch.service, demand: 0 } });
  assert.deepEqual(next.parkedVehicles.map(c => [c.id, c.cHubId]), first.parkedVehicles.map(c => [c.id, c.cHubId]));
  const old = structuredClone(patch.initialServiceCarry);
  for (const car of old.parkedVehicles) delete car.cHubId;
  const restored = createCampusTraffic({ ...options, ...patch, initialServiceCarry: old });
  assert.ok(restored.parkedVehicles.every(c => C_HUBS.some(h => h.id === c.cHubId)));
  assert.equal(Object.values(restored.cHubOccupancy).reduce((a, b) => a + b), 14);
});
