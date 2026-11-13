import test from 'node:test';
import assert from 'node:assert/strict';
import { attachLotAControl, attachMainPositionToLane, LOT_A_MAIN_POSITION } from '../src/lotAControl.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { createCampusTraffic } from '../src/traffic.js';
import { MAIN_POSITION_RESOLUTION } from '../src/positions/index.js';

const makeState = () => {
  const state = { clock: 0, cars: [], lanes: ['aNorth','aSouth','aMain'].map(approach => ({
    aControl: { approach, stopDistance: 5, releaseDistance: 9 },
  })) };
  attachLotAControl(state);
  return state;
};
const car = (id, lane, phase='departing') => ({id,lane,phase,distance:5,zone:lane===0?'aNorth':'aSouth'});
const clear = state => {
  state.prepareLotAControl();
  const admitted = state.cars.find(c => c.id === state.aMainControl.admittedId);
  assert.ok(admitted, 'one ready vehicle admitted');
  admitted.distance = 9;
  state.observeLotAControl();
  return admitted;
};

test('one position controls all three ready approaches and counts only clearance', () => {
  const s=makeState();
  s.cars=[car('north',0),car('south',1),car('inbound',2,'arrival')];
  s.prepareLotAControl();
  assert.equal(s.aMainControl.batchSize,5);
  assert.deepEqual(s.aMainControl.waiting,{aNorth:1,aSouth:1,aMain:1});
  assert.equal(s.aMainControl.totalPassed.aNorth,0);
  assert.equal(s.cars.filter(c=>c.controlStopDistance===undefined).length,1);
  s.observeLotAControl();assert.equal(s.aMainControl.totalPassed.aNorth,0);
  s.cars[0].distance=9;s.observeLotAControl();
  clear(s);clear(s);
  assert.deepEqual(s.aMainControl.history.map(h=>h.side),['aNorth','aSouth','aMain']);
});

test('five cleared cars switch equally ranked ready roads', () => {
  const s=makeState();
  s.cars=[...Array.from({length:6},(_,i)=>car(`n${i}`,0)),...Array.from({length:6},(_,i)=>car(`s${i}`,1))];
  for(let i=0;i<12;i++)clear(s);
  assert.deepEqual(s.aMainControl.history.map(h=>h.side),[
    ...Array(5).fill('aNorth'),...Array(5).fill('aSouth'),'aNorth','aSouth',
  ]);
});

test('priority waits for occupied vehicle, then serves shuttle before departure before arrival', () => {
  const s=makeState(),incoming=car('arrival',2,'arrival');s.cars=[incoming];
  s.prepareLotAControl();
  const bus={...car('bus',1,'shuttle'),fleetBus:true};
  s.cars.push(car('departure',0),bus);
  s.prepareLotAControl();assert.equal(s.aMainControl.admittedId,'arrival');
  incoming.distance=9;s.observeLotAControl();
  assert.equal(clear(s).id,'bus');assert.equal(clear(s).id,'departure');
});

test('a distant North queue does not starve a ready inbound approach', () => {
  const s=makeState();s.cars=[{...car('far',0),distance:0},car('ready',2,'arrival')];
  assert.equal(clear(s).id,'ready');
});

test('unadmitted vehicle already in Main Position clears before a new approach', () => {
  const s=makeState(),clearing={...car('clearing',0),distance:7},waiting=car('waiting',1);
  s.cars=[clearing,waiting];s.prepareLotAControl();
  assert.equal(s.aMainControl.admittedId,null);
  assert.equal(clearing.controlStopDistance,undefined);
  assert.equal(waiting.controlStopDistance,5);
  clearing.distance=9;s.observeLotAControl();
  assert.equal(s.aMainControl.totalPassed.aNorth,1);
  assert.equal(clear(s).id,'waiting');
});

test('all general A arrival/departure routes traverse the same position; badge stays separate', () => {
  for(const zone of ['aNorth','aSouth'])for(const out of [false,true]) {
    const points=out?zoneDepartureRoute('a',zone):zoneArrivalRoute('a',zone),lane={length:100};
    // 2026-11-12: North arrivals use AddNorthRoute and bypass Main; exits still pass it.
    if(!out&&zone==='aNorth'){assert.equal(attachMainPositionToLane(lane,points,'aMain'),false);continue;}
    assert.ok(attachMainPositionToLane(lane,points,out?zone:'aMain'));
    assert.ok(lane.aControl.stopDistance<lane.aControl.releaseDistance);
  }
  assert.equal(attachMainPositionToLane({length:100},zoneArrivalRoute('badgeA','aBadge'),'aMain'),false);
  assert.deepEqual(LOT_A_MAIN_POSITION,MAIN_POSITION_RESOLUTION.point);
  // Current source: #57 is the exact canonical Main point, no longer a provisional candidate.
  assert.equal(MAIN_POSITION_RESOLUTION.provisional,false);
});

test('real general arrivals clear the staffed main approach and stay parked', () => {
  const s=createCampusTraffic({});s.waiting[0]=6;
  for(let i=0;i<2400;i++)s.step(.1,[0,0,0]);
  assert.deepEqual(s.routingIssues,[]);
  assert.equal(s.zoneOccupancy.aNorth,6);
  // North arrivals no longer take turns at Main (AddNorthRoute, 2026-11-12).
  assert.equal(s.aMainControl.totalPassed.aMain,0);
  assert.equal(s.departed.a,0);
});
