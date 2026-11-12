import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { zoneArrivalRoute } from '../src/parkingRoutes.js';
import { VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { SHUTTLE_STOPS, avoidsShuttleObstacles } from '../src/shuttleRoutes.js';
import { shapeAt } from '../src/clearImageSource.js';
import { inPolygon } from '../src/sourceRouting.js';

function depart(north, south) {
  const state=createCampusTraffic({phase:'departure',initialZoneOccupancy:{aNorth:north,aSouth:south}});
  for(let i=0;i<1200;i++)state.step(.1,[0,0,0]);
  return state;
}
test('Lot A Main Position alternates actual five-car passages, then drains partial batches',()=>{
  const state=depart(12,12);
  assert.equal(state.departed.a,24);
  assert.deepEqual(state.routingIssues,[]);
  // Batches of five alternate, then partial batches drain. Which side opens is
  // decided by whichever car first reaches its stop line (only ready approaches
  // compete), which depends on the current source aisle lengths, so either may lead.
  const sides=state.aDepartureControl.history.map(e=>e.side);
  const [first,second]=sides[0]==='aNorth'?['aNorth','aSouth']:['aSouth','aNorth'];
  assert.deepEqual(sides,[
    ...Array(5).fill(first),...Array(5).fill(second),...Array(5).fill(first),...Array(5).fill(second),...Array(2).fill(first),...Array(2).fill(second),
  ]);
});
test('an empty North does not strand South',()=>{
  const state=depart(0,15);
  assert.equal(state.departed.a,15);
  assert.equal(state.aDepartureControl.totalPassed.aSouth,15);
});
test('badge cars turn east/right inside permit entrance, stay clear of A pickup and roofs',()=>{
  const route=zoneArrivalRoute('badgeA','aBadge');
  const permit=shapeAt(37);
  assert.equal(permit.label,'Lot A black permit');
  assert.ok(route.length>=VECTOR_ROUTES.arrival.badgeA.length,'live route covers the traced badge road');
  assert.ok(inPolygon(route.at(-1),permit.points),'badge route ends inside the permit lot #37');
  const home=SHUTTLE_STOPS.find(s=>s.id==='home').point;
  // Sweep the WHOLE live badge route, so any later internal leg is checked too.
  let samples=0,inPermit=0;
  for(let i=1;i<route.length;i++) {
    const a=route[i-1],b=route[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.5));
    for(let j=0;j<=steps;j++) {
      const p=[a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps];
      samples++;
      if(inPolygon(p,permit.points)){inPermit++;assert.ok(p[0]>=160,'badge traffic must not turn west toward shuttle pickup');}
      assert.ok(Math.hypot(p[0]-home[0],p[1]-home[1])>45,`segment ${i} stays clear of the A pickup`);
      assert.ok(avoidsShuttleObstacles(p),`segment ${i} avoids roofs`);
    }
  }
  assert.ok(samples>1000,'sweep is not vacuous');
  assert.ok(inPermit>0,'sweep reaches inside the permit lot');
});
