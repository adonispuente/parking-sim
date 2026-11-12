// Lot A Main two-way repair, 2026-11-10. Exercise the public production solver
// and the actual eleven-service fixed-step configuration, not a copied conflict rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCampusTraffic, keepRight } from '../src/traffic.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { indexLanePath } from '../src/lanePath.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { attachMainPositionToLane, LOT_A_MAIN_POSITION } from '../src/lotAControl.js';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';
import { SUNDAY_SERVICES, serviceOptions } from '../src/sundayServices.js';
import { PLAYBACK_STEP } from '../src/playback.js';

function build(raw, approach) {
  const points = keepRight(raw.map(vectorToTrace)).map(p => {
    const [x,z] = traceWorldPoint(p);
    return new THREE.Vector3(x,.6,z);
  });
  const path = new THREE.CurvePath();
  for(let i=1;i<points.length;i++) if(points[i].distanceTo(points[i-1])>.00001)
    path.add(new THREE.LineCurve3(points[i-1],points[i]));
  indexLanePath(path);
  const lane={path,length:path.getLength()};
  assert.ok(attachMainPositionToLane(lane,raw,approach));
  return lane;
}
const arrivals=['aNorth','aSouth'].map(zone=>({zone,lane:build(zoneArrivalRoute('a',zone),'aMain')}));
const departures=['aNorth','aSouth'].map(zone=>({zone,lane:build(zoneDepartureRoute('a',zone),zone)}));

test('Main exact anchor survives lane building instead of being street-centered again',()=>{
  const [x,z]=traceWorldPoint(LOT_A_MAIN_POSITION);
  for(const entry of [...arrivals,...departures]){
    const p=entry.lane.path.getPointAt(entry.lane.aControl.mergeDistance/entry.lane.length);
    assert.ok(Math.hypot(p.x-x,p.z-z)<.03,entry.zone);
  }
});

for(const direction of ['departure','arrival']) test(`North two-way production clearance: moving ${direction} clears held opposing bodies`,()=>{
  const movers=direction==='departure'?departures.filter(e=>e.zone==='aNorth'):arrivals.filter(e=>e.zone==='aNorth');
  const holders=direction==='departure'?arrivals:departures;
  let samples=0;
  for(const mover of movers)for(const holder of holders){
    const stop=holder.lane.aControl.stopDistance;
    const end=direction==='departure'?mover.lane.aControl.releaseDistance+2:mover.lane.length;
    for(let d=mover.lane.aControl.stopDistance;d<=Math.min(end,mover.lane.length);d+=.1){
      const car={id:'moving',lane:0,distance:d,speed:2.8,bodyLength:1.35,phase:direction==='departure'?'departing':'arriving'};
      const held={id:'held',lane:1,distance:stop,speed:2.8,bodyLength:1.35,holdForBatch:true,controlStopDistance:stop,phase:direction==='departure'?'arriving':'departing'};
      advanceSharedTraffic({cars:[car,held],lanes:[mover.lane,holder.lane]},.1);
      assert.equal(held.distance,stop);
      assert.notEqual(car.yieldingTo,'held',`${direction} ${mover.zone} vs ${holder.zone}, distance ${d}`);
      assert.ok(car.distance>=Math.min(mover.lane.length,d+.28)-1e-8);
      samples++;
    }
  }
  assert.ok(samples>100);
});

test('UI-faithful eleven service keeps Main progressing through10:50',()=>{
  const preset=SUNDAY_SERVICES.eleven;
  const shuttles={enabled:true,activeCount:preset.activeBuses,bFullPercent:100,randomDwell:true,dwellSeconds:45,cDirection:'auto',bStop:'circuit',dispatchMode:'demand',dispatchDuringDepartures:preset.transition};
  const preferences={a:'auto',b:'auto',c:'auto'};
  const state=createCampusTraffic({initialOccupancy:{...preset.initialOccupancy},badgePercent:5,phase:'arrival',service:{enabled:true,...serviceOptions('eleven')},zonePreferences:preferences,shuttles});
  const lots=['a','b','c'].map(id=>({id:`lot-${id}`,open:true}));
  const passed=()=>Object.values(state.aMainControl.totalPassed).reduce((a,b)=>a+b,0);
  let prior=null,frozenSince=null,at1045=null;
  for(let tick=1;tick<=Math.round(2700/PLAYBACK_STEP);tick++){
    state.setPhase('arrival');state.setShuttleConfig(shuttles);state.setZonePreferences(preferences);state.setDeparturePolicy({});
    state.step(PLAYBACK_STEP,[18,18,0],lots);
    if(tick===Math.round(2400/PLAYBACK_STEP))at1045=passed();
    if(tick%Math.round(30/PLAYBACK_STEP)!==0||state.clock<1800)continue;
    const gate=state.aMainControl;
    const sample={clock:state.clock,id:gate.admittedId,passed:passed(),pending:gate.admittedId!=null||Object.values(gate.waiting).some(n=>n>0)};
    const frozen=prior?.pending&&sample.pending&&prior.id===sample.id&&prior.passed===sample.passed;
    frozenSince=frozen?(frozenSince??prior.clock):null;
    assert.ok(frozenSince===null||sample.clock-frozenSince<300,'Main pending admission frozen >=5min');
    prior=sample;
  }
  assert.ok(passed()>at1045,'passages continue10:45–10:50');
  assert.ok(state.aMainControl.totalPassed.aMain>100,'inbound traffic continues beyond original957/114 and296/961 locks');
  assert.equal(state.routingIssues?.length??0,0);
});
