import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { zoneArrivalRoute } from '../src/parkingRoutes.js';
import { VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { SHUTTLE_STOPS, avoidsShuttleObstacles } from '../src/shuttleRoutes.js';

function depart(north, south) {
  const state=createCampusTraffic({phase:'departure',initialZoneOccupancy:{aNorth:north,aSouth:south}});
  for(let i=0;i<1200;i++)state.step(.1,[0,0,0]);
  return state;
}
test('Lot A Main Position alternates actual five-car passages, then drains partial batches',()=>{
  const state=depart(12,12);
  assert.equal(state.departed.a,24);
  assert.deepEqual(state.routingIssues,[]);
  assert.deepEqual(state.aDepartureControl.history.map(e=>e.side),[
    ...Array(5).fill('aNorth'),...Array(5).fill('aSouth'),...Array(5).fill('aNorth'),...Array(5).fill('aSouth'),...Array(2).fill('aNorth'),...Array(2).fill('aSouth'),
  ]);
});
test('an empty North does not strand South',()=>{
  const state=depart(0,15);
  assert.equal(state.departed.a,15);
  assert.equal(state.aDepartureControl.totalPassed.aSouth,15);
});
test('badge cars turn east/right inside permit entrance, stay clear of A pickup and roofs',()=>{
  const road=VECTOR_ROUTES.arrival.badgeA;
  const route=zoneArrivalRoute('badgeA','aBadge');
  const index=route.findIndex(p=>Math.hypot(p[0]-road.at(-1)[0],p[1]-road.at(-1)[1])<.001);
  const internal=route.slice(index);
  assert.ok(internal.some(p=>p[0]===190&&p[1]===250));
  const home=SHUTTLE_STOPS.find(s=>s.id==='home').point;
  for(let i=1;i<internal.length;i++) {
    const a=internal[i-1],b=internal[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.5));
    for(let j=0;j<=steps;j++) {
      const p=[a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps];
      assert.ok(p[0]>=160,'badge traffic must not turn west toward shuttle pickup');
      assert.ok(Math.hypot(p[0]-home[0],p[1]-home[1])>45);
      assert.ok(avoidsShuttleObstacles(p));
    }
  }
});
