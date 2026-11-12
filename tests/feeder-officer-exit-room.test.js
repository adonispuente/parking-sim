import test from 'node:test';
import assert from 'node:assert/strict';
import { attachFeederOfficer, FEEDER_OFFICER_DEFAULTS } from '../src/feederOfficer.js';
import { FEEDER_OFFICER_POSITION } from '../src/positions/index.js';
import { WORLD_SCALE } from '../src/clearImageSource.js';

function fixture(options={}) {
  const [x,z]=FEEDER_OFFICER_POSITION.map(n=>n*WORLD_SCALE);
  const lane=axis=>({length:16,path:{getPointAt(t){
    return axis==='exit'?{x:x-8+16*t,z}:{x,z:z+8-16*t};
  }}});
  const state={cars:[],lanes:[lane('exit'),lane('feeder')]};
  attachFeederOfficer(state,options);
  return state;
}
const exit=()=>({id:'exit',lane:0,phase:'departing',access:'a',distance:4.6});
const feeder=()=>({id:'feeder',lane:1,phase:'departing',access:'bWest',distance:4.6});
const blocker=(distance=13.4)=>({id:'downstream',lane:0,phase:'departing',access:'a',distance});

test('occupied release space prevents admission even though the merge itself is clear',()=>{
  const state=fixture(),candidate=exit();
  state.cars=[candidate,blocker()];
  state.prepareFeederOfficer();
  assert.equal(state.feederOfficer.admittedId,null);
  assert.ok(candidate.feederStopDistance<8);
  assert.equal(state.cars[1].feederMergePassed,true);
  state.cars[1].distance=15;
  state.prepareFeederOfficer();
  assert.equal(state.feederOfficer.admittedId,'exit');
});

test('a blocked candidate does not prevent a clear competing candidate from admission',()=>{
  const state=fixture();
  state.cars=[exit(),feeder(),blocker()];
  state.prepareFeederOfficer();
  assert.equal(state.feederOfficer.admittedId,'feeder');
  assert.ok(state.cars[0].feederStopDistance<8);
});

test('the configurable exit-room gap is included in the admission check',()=>{
  assert.equal(FEEDER_OFFICER_DEFAULTS.exitRoomGap,.5);
  const guarded=fixture(),noGap=fixture({exitRoomGap:0});
  for(const state of [guarded,noGap]){
    state.cars=[exit(),blocker(14.1)];
    state.prepareFeederOfficer();
  }
  assert.equal(guarded.feederOfficer.admittedId,null);
  assert.equal(noGap.feederOfficer.admittedId,'exit');
});

test('sampling includes the exact terminal point, not only the last 0.2-world step',()=>{
  const state=fixture();
  // merge=8, release=11.4, end=13.25. The last regular sample is13.2:
  // blocker14.14 is0.94 from that sample but0.89 from the endpoint.
  state.cars=[exit(),blocker(14.14)];
  state.prepareFeederOfficer();
  assert.equal(state.feederOfficer.admittedId,null);
});

test('a bus beyond the release does not become a new exit-room obstacle',()=>{
  const state=fixture();
  state.cars=[exit(),{...blocker(),fleetBus:true,phase:'shuttle'}];
  state.prepareFeederOfficer();
  assert.equal(state.feederOfficer.admittedId,'exit');
});

test('free-flow feeder traffic waits for release room and resumes when it clears',()=>{
  const state=fixture(),candidate=feeder();
  const downstream={id:'downstream',lane:1,phase:'arriving',access:'bWest',distance:13.4};
  state.cars=[candidate,downstream];
  state.prepareFeederOfficer();
  assert.equal(state.feederOfficer.waitingExit,0);
  assert.equal(state.feederOfficer.admittedId,null);
  assert.ok(candidate.feederStopDistance<8);
  candidate.distance=candidate.feederStopDistance;
  state.prepareFeederOfficer();
  assert.equal(candidate.holdForOfficer,true);
  downstream.distance=15;
  state.prepareFeederOfficer();
  assert.equal(candidate.holdForOfficer,false);
  assert.equal(candidate.feederStopDistance,undefined);
});
