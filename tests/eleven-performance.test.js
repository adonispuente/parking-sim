import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';
import { VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { zoneDepartureRoute } from '../src/parkingRoutes.js';
import { avoidsShuttleObstacles } from '../src/shuttleRoutes.js';
import * as THREE from 'three';
import { indexLanePath } from '../src/lanePath.js';

test('indexed lane sampling preserves Three points and tangents including segment boundaries',()=>{
  const path=new THREE.CurvePath();
  for(let i=0;i<300;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(i,0,Math.sin(i)),new THREE.Vector3(i+1,0,Math.sin(i+1))));
  const fractions=[0,1,...Array.from({length:400},(_,i)=>i/400),...path.getCurveLengths().map(n=>n/path.getLength())];
  const expected=fractions.map(t=>[path.getPointAt(t),path.getTangentAt(t)]);
  indexLanePath(path);
  fractions.forEach((t,i)=>{assert.ok(path.getPointAt(t).distanceTo(expected[i][0])<1e-10);assert.ok(path.getTangentAt(t).distanceTo(expected[i][1])<1e-8);});
});

// Structural regression, not machine-dependent wall-clock assertions.
test('failed route construction is attempted once per scenario, not once per ready car per tick', () => {
  const settings=serviceOptions('eleven',{demand:0});
  const state=createCampusTraffic({initialOccupancy:{b:487},service:{enabled:true,...settings}});
  // Isolate the route cache from service readiness (production now has pre-roll).
  for(const car of state.parkedVehicles)car.readyAt=0;
  let attempts=0;
  state.lanes.push = () => { attempts++; throw new Error('test unresolved route'); };
  for(let i=0;i<20;i++)state.step(.05);
  assert.ok(attempts>0);
  const first=attempts;
  for(let i=0;i<200;i++)state.step(.05);
  assert.ok(attempts<=4,'at most the four B section routes are attempted');
  assert.equal(state.routingIssues.length,1);
  assert.ok(attempts>=first);
  assert.equal(state.parkedVehicles.length,487,'do not delete cars to hide failures');
});

test('B north/pocket departures connect to the labeled north exit', () => {
  for(const zone of ['bPocket','bNorth']) {
    const path=zoneDepartureRoute('bNorth',zone);
    assert.ok(path.length>3);
    for(let i=1;i<path.length;i++) {
      const a=path[i-1],b=path[i],count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));
      for(let j=0;j<=count;j++)assert.ok(avoidsShuttleObstacles([a[0]+(b[0]-a[0])*j/count,a[1]+(b[1]-a[1])*j/count]));
    }
  }
});

test('C departure routes start at exits, never retrace the shuttle entrance turnaround', () => {
  const entrance=VECTOR_ROUTES.arrival.cWest.at(-1);
  for(const key of ['cWest','cEast']) {
    const departure=VECTOR_ROUTES.departure[key];
    assert.ok(Math.hypot(departure[0][0]-entrance[0],departure[0][1]-entrance[1])>5);
  }
  const state=createCampusTraffic({phase:'departure',initialZoneOccupancy:{cNorth:1,cSouth:1}});
  state.step(.05);
  // Commander rule (2026-11-07): C cars use both C exits ~50/50 (default 'split').
  assert.deepEqual(state.cars.filter(car=>car.phase==='departing').map(car=>car.access).sort(),['cEast','cWest']);
  assert.deepEqual(state.routingIssues,[]);
});

test('11am departures clear C entrance and all five shuttles complete repeated trips', () => {
  const config=serviceOptions('eleven',{demand:0});
  const state=createCampusTraffic({initialOccupancy:config.initialOccupancy,service:{enabled:true,...config},shuttles:{activeCount:5,dwellSeconds:12}});
  // Staggered launches + 30-60 s random boarding delays: allow 10 minutes for two full circuits.
  const seconds=(615-config.beginMinute)*60+600;
  for(let i=0;i<seconds*20;i++)state.step(.05);
  assert.deepEqual(state.routingIssues,[]);
  assert.ok(state.departed.a>0&&state.departed.b>0&&state.departed.c>10);
  assert.ok(state.shuttles.every(bus=>bus.trips>=2),'C bus must not remain stuck at entrance');
});
