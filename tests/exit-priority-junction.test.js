import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { attachExitPriorityJunction } from '../src/exitPriorityJunction.js';
import { attachCorporateDriveOperators } from '../src/corporateDriveOperators.js';
import { pointAt, WORLD_SCALE } from '../src/clearImageSource.js';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';

function fixture(offset = 0) {
  const [x, z] = pointAt(59).map(v => v * WORLD_SCALE);
  const lane = points => {
    const path = new THREE.CurvePath();
    for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
    return { path, length: path.getLength() };
  };
  const state = { cars: [], lanes: [lane([[x + 10, 0, z], [x - 10, 0, z]]),
    lane([[x + offset, 0, z + 10], [x + offset, 0, z - 10]])] };
  attachExitPriorityJunction(state);
  const car = (id, role) => ({ id, lane: role === 'departure' ? 0 : 1, phase: role, distance: 6.5, speed: 2.8 });
  return { state, car };
}
const prepare = s => s.prepareCorporateExitJunction();
const clear = (s, car) => { car.distance = 19; s.observeCorporateExitJunction(); s.cars = s.cars.filter(c => c !== car); };

test('clear Corporate exit is released immediately and an empty opposing quota never holds it', () => {
  const { state: s, car } = fixture();
  s.corporateExitJunction.turn = 'arrival';
  const dep = car('exit', 'departure'); s.cars = [dep]; prepare(s);
  assert.equal(dep.corporateJunctionStopDistance, undefined);
  assert.equal(s.corporateExitJunction.admittedId, dep.id);
  assert.equal(s.corporateExitJunction.turn, 'departure');
});

test('both queues get ten actually-cleared exits then five actually-cleared entries', () => {
  const { state: s, car } = fixture();
  for (let round = 0; round < 20; round++) {
    const dep = car(`d${round}`, 'departure'), arr = car(`a${round}`, 'arrival');
    s.cars = [dep, arr]; prepare(s);
    const expect = round < 10 || round >= 15 ? dep : arr;
    assert.equal(s.corporateExitJunction.admittedId, expect.id, `round ${round}`);
    assert.equal(expect.corporateJunctionStopDistance, undefined);
    const held = expect === dep ? arr : dep;
    assert.equal(held.holdForCorporateJunction, true);
    const count = s.corporateExitJunction.clearedInBatch;
    prepare(s); prepare(s); s.observeCorporateExitJunction();
    assert.equal(s.corporateExitJunction.clearedInBatch, count, 'frames/assignment are not clearance');
    clear(s, expect);
  }
  assert.equal(s.corporateExitJunction.passedExit, 15);
  assert.equal(s.corporateExitJunction.passedEntry, 5);
});

test('occupied junction clears before a new conflicting exit enters', () => {
  const { state: s, car } = fixture();
  const dep = car('exit', 'departure'), arr = { ...car('inside', 'arrival'), distance: 10 };
  // Start upstream of the sampled stop. Cars already beyond a stop may not be
  // moved backwards to it; sharedTraffic deliberately preserves continuity.
  dep.distance = 6;
  s.cars = [dep, arr]; prepare(s);
  assert.equal(s.corporateExitJunction.admittedId, null);
  const stop = dep.corporateJunctionStopDistance;
  assert.ok(Number.isFinite(stop));
  advanceSharedTraffic(s, .05);
  assert.ok(dep.distance <= stop + 1e-8, 'physical conflict remains protected at stop line');
  clear(s, arr);
  // Reach the ready queue after the occupied road clears.
  dep.distance = stop; prepare(s);
  assert.equal(s.corporateExitJunction.admittedId, dep.id);
});

test('shuttle has priority over batch, but its queued physical leader may clear', () => {
  const { state: s, car } = fixture();
  const dep = car('exit', 'departure'), leader = car('leader', 'arrival');
  const bus = { ...car('bus', 'arrival'), phase: 'shuttle', fleetBus: true, bodyLength: 3.5, distance: 2 };
  s.cars = [dep, leader, bus]; prepare(s);
  assert.equal(s.corporateExitJunction.admittedId, null);
  assert.equal(dep.holdForCorporateJunction, true);
  assert.equal(leader.corporateJunctionStopDistance, undefined);
  assert.equal(bus.corporateJunctionStopDistance, undefined);
});

test('nonconflicting parallel approaches are not batched against each other', () => {
  const [x, z] = pointAt(59).map(v => v * WORLD_SCALE);
  const lane = dz => { const path = new THREE.LineCurve3(new THREE.Vector3(x - 10, 0, z + dz), new THREE.Vector3(x + 10, 0, z + dz)); return { path, length: 20 }; };
  const s = { lanes: [lane(-1), lane(1)], cars: [
    { id: 'd', phase: 'departing', lane: 0, distance: 6.5 },
    { id: 'a', phase: 'arrival', lane: 1, distance: 6.5 },
  ] };
  attachExitPriorityJunction(s); prepare(s);
  assert.ok(s.cars.every(c => c.corporateJunctionStopDistance === undefined));
});

test('wide two-way Corporate default never imposes the legacy whole-stretch valve', () => {
  const a = pointAt(60).map(v => v * WORLD_SCALE), b = pointAt(61).map(v => v * WORLD_SCALE);
  const path = new THREE.LineCurve3(new THREE.Vector3(...[a[0],0,a[1]]), new THREE.Vector3(...[b[0],0,b[1]]));
  const s = { cars: [{id:1,lane:0,phase:'departing',distance:0}], lanes:[{path,length:path.getLength()}] };
  attachCorporateDriveOperators(s); s.prepareCorporateDriveOperators();
  assert.equal(s.cars[0].corridorStopDistance, undefined);
  assert.equal(s.cars[0].holdForCorridor, false);
});

test('reassigned lane does not inherit an old passage exemption or admission', () => {
  const { state: s, car } = fixture();
  const dep = car('exit', 'departure'); s.cars = [dep]; prepare(s); clear(s, dep);
  dep.lane = 1; dep.phase = 'arrival'; dep.distance = 6.5;
  const next = car('new exit', 'departure'); s.cars = [dep,next]; prepare(s);
  assert.equal(dep.holdForCorporateJunction,true);
  assert.equal(s.corporateExitJunction.admittedId,next.id);
});

test('actual movement honors 10:5 under replenished competing queues',()=>{
  const {state:s,car}=fixture();let serial=0;const order=[];
  // Keep a READY follower queued while the previous car clears. Replenishing
  // only after it left campus tested a lone-queue alternation, not contention.
  const replenish=()=>{for(const role of ['departure','arrival'])if(!s.cars.some(c=>c.phase===role&&c.distance<9.5))s.cars.push(car(`${role}-${++serial}`,role));};
  for(let i=0;i<20000&&order.length<15;i++){
    replenish();prepare(s);advanceSharedTraffic(s,.05);s.observeCorporateExitJunction();
    s.cars=s.cars.filter(c=>{if(c.distance<18)return true;order.push(c.phase);return false;});
  }
  assert.deepEqual(order.slice(0,15),[...Array(10).fill('departure'),...Array(5).fill('arrival')]);
});

test('a same-lane car follows its priority bus without a junction quota stop',()=>{
  const {state:s,car}=fixture();
  const bus={...car('bus','arrival'),fleetBus:true,distance:11,bodyLength:2.9};
  const follower=car('following','arrival');s.cars=[bus,follower];prepare(s);
  assert.equal(follower.corporateJunctionStopDistance,undefined);
  advanceSharedTraffic(s,.05);assert.ok(follower.distance<bus.distance);
});
