import test from 'node:test';
import assert from 'node:assert/strict';
import { attachFeederOfficer } from '../src/feederOfficer.js';
import { FEEDER_OFFICER_POSITION } from '../src/positions/index.js';
import { WORLD_SCALE } from '../src/clearImageSource.js';

function fixture() {
  // Unified source frame: one uniform scale, no legacy 735px width.
  const [x,z]=FEEDER_OFFICER_POSITION.map(n=>n*WORLD_SCALE);
  const lane=axis=>({length:16,path:{getPointAt(t){return axis==='exit'?{x:x-8+16*t,z}:{x,z:z+8-16*t};}}});
  const state={cars:[],lanes:[lane('exit'),lane('feeder')]};
  attachFeederOfficer(state);
  return state;
}
const exit=(id='exit')=>({id,lane:0,phase:'departing',access:'a',distance:4.6});
const feeder=(id='feeder')=>({id,lane:1,phase:'departing',access:'bWest',distance:4.6});

test('officer admits only one ready car, counts clearance, does not overwrite Main Position',()=>{
  const s=fixture(),a=exit(),b=feeder();a.controlStopDistance=1;
  s.cars=[a,b];s.prepareFeederOfficer();
  assert.equal(s.feederOfficer.admittedId,'exit');
  assert.equal(a.controlStopDistance,1);
  assert.ok(b.feederStopDistance<8);
  s.observeFeederOfficer();assert.equal(s.feederOfficer.passed,0);
  a.distance=13;s.observeFeederOfficer();
  assert.equal(s.feederOfficer.passed,1);assert.equal(a.feederMergePassed,true);
  // With no A exit waiting, feeder flow is free (no admission, no hold), the
  // same rule as the 'feeder traffic stays free' test.
  s.prepareFeederOfficer();
  assert.equal(s.feederOfficer.admittedId,null);
  assert.equal(s.feederOfficer.reason,'feeder free');
  assert.equal(b.feederStopDistance,undefined);
});

test('occupied feeder merge clears before an A exit is admitted',()=>{
  const s=fixture(),a=exit(),b={...feeder(),distance:8};s.cars=[a,b];
  s.prepareFeederOfficer();
  assert.equal(s.feederOfficer.admittedId,null);
  assert.ok(a.feederStopDistance<8);
  assert.equal(b.feederStopDistance,undefined);
  b.distance=14;s.prepareFeederOfficer();
  assert.equal(s.feederOfficer.admittedId,'exit');
});

test('priority bus holds conflicting A exit but does not trap its physical feeder leader',()=>{
  const s=fixture(),a=exit(),leader=feeder(),bus={...feeder('bus'),fleetBus:true,phase:'shuttle',distance:0,bodyLength:3.5};
  s.cars=[a,leader,bus];s.prepareFeederOfficer();
  assert.equal(s.feederOfficer.admittedId,null);
  assert.ok(a.feederStopDistance<8);
  assert.equal(bus.feederStopDistance,undefined);
  assert.equal(leader.feederStopDistance,undefined);
});

test('feeder traffic stays free without waiting Lot A departures; passed traffic is not phantom demand',()=>{
  const s=fixture(),b=feeder();s.cars=[b];s.prepareFeederOfficer();
  assert.equal(b.feederStopDistance,undefined);
  b.distance=14;s.prepareFeederOfficer();
  assert.equal(s.feederOfficer.waitingFeeder,0);
});

test('officer can be disabled without removing physical roads',()=>{
  const s=fixture();attachFeederOfficer(s,{enabled:false});const a=exit();s.cars=[a];s.prepareFeederOfficer();
  assert.equal(a.feederStopDistance,undefined);assert.equal(s.feederOfficer.enabled,false);
});
