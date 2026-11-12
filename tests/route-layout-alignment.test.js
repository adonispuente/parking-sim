import test from 'node:test';
import assert from 'node:assert/strict';
import { VECTOR_ROUTES, ACCESS_THROATS } from '../src/vectorRoutes.js';
import { MAIN_POSITION_RESOLUTION, RESOLVED_A_MAIN_POSITION } from '../src/positions/index.js';
import { LOT_A_MAIN_POSITION, attachMainPositionToLane } from '../src/lotAControl.js';
import { zoneArrivalRoute, zoneDepartureRoute, A_MEDIAN } from '../src/parkingRoutes.js';
import { roadAnchoredRoute } from '../src/roadAnchoredRoutes.js';
import { createCampusTraffic } from '../src/traffic.js';
import { onLotGround, avoidsShuttleObstacles } from '../src/shuttleRoutes.js';
import { shapeAt, pointAt } from '../src/clearImageSource.js';
import { inPolygon, segmentDistance, onDrivable, isDisclosedUntraced, untracedGapPoints } from '../src/sourceRouting.js';

const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.001;
const edgeDistance=(p,ring)=>Math.min(...ring.map((a,i)=>segmentDistance(p,a,ring[(i+1)%ring.length])));
const polylineDistance=(p,line)=>Math.min(...line.slice(1).map((b,i)=>segmentDistance(p,line[i],b)));
test('A departure begins at the labeled exit throat, not the old arrival-end turnaround',()=>{
  assert.deepEqual(VECTOR_ROUTES.departure.a[0],ACCESS_THROATS.a.departure[0]);
  assert.ok(!near(VECTOR_ROUTES.departure.a[0],VECTOR_ROUTES.arrival.a.at(-1)));
});
test('resolved Main Position has one shared coordinate and all general approaches attach',()=>{
  assert.deepEqual(LOT_A_MAIN_POSITION,RESOLVED_A_MAIN_POSITION);
  // Main is the exact canonical source point #57, in the mouth of the Lot A
  // entrance road: beside the Lot A lot polygons, inside the S5 entrance-road patch.
  assert.equal(shapeAt(57).label,'Lot A Main Entrance position');
  assert.ok(near(LOT_A_MAIN_POSITION,pointAt(57)),'Main is source #57');
  for(const lot of [38,39])assert.ok(edgeDistance(LOT_A_MAIN_POSITION,shapeAt(lot).points)<=12,`Main within 12 px of Lot A polygon #${lot}`);
  assert.ok(!onLotGround('a',LOT_A_MAIN_POSITION),'Main is road ground, not Lot A parking ground');
  assert.ok(onDrivable(LOT_A_MAIN_POSITION),'Main lies on the S5 Lot A entrance-road pavement');
  assert.ok(!isDisclosedUntraced(LOT_A_MAIN_POSITION),'Lot A entrance road is no longer a disclosed gap');
  assert.ok(untracedGapPoints('lot-a-entrance-road').some(p=>near(p,LOT_A_MAIN_POSITION)),'historical reference point retained');
  assert.equal(MAIN_POSITION_RESOLUTION.provisional,false);
  assert.match(MAIN_POSITION_RESOLUTION.source,/#57/);
  for(const zone of ['aNorth','aSouth'])for(const out of [false,true]) {
    const points=out?zoneDepartureRoute('a',zone):zoneArrivalRoute('a',zone);
    const lane={length:100};assert.ok(attachMainPositionToLane(lane,points,out?zone:'aMain'));
    assert.ok(points.some(p=>near(p,LOT_A_MAIN_POSITION)));
  }
});
test('road anchoring preserves physical road/entrance; proposals and missing shuttle returns are not invented',()=>{
  const route=roadAnchoredRoute('a-in-north');
  assert.equal(route.applied,true,route.reason);
  // The anchored route IS the live keep-right zone lane, not the raw centerline.
  assert.deepEqual(route.points,zoneArrivalRoute('a','aNorth'));
  assert.ok(inPolygon(route.points[0],shapeAt(54).points),'starts on Feeder Road #54');
  const mainIndex=route.points.findIndex(p=>near(p,LOT_A_MAIN_POSITION));
  assert.ok(mainIndex>0,'passes exactly through Main');
  // Lane offsets never exceed the recorded A median separation (inPx+outPx) from
  // the traced centerline on the way to Main.
  const centerline=VECTOR_ROUTES.arrival.a,limit=A_MEDIAN.inPx+A_MEDIAN.outPx;
  for(const [i,p] of route.points.slice(0,mainIndex+1).entries())assert.ok(polylineDistance(p,centerline)<=limit,`point ${i} within ${limit} px of the centerline`);
  // With the S5 patch drawn, every Lot A arrival centerline vertex is on drivable pavement.
  for(const [i,p] of centerline.entries())assert.ok(onDrivable(p),`centerline vertex ${i} is on drivable pavement`);
  assert.equal(route.runtime,true);assert.equal(route.provisional,true);
  for(const id of ['c-out-potential-1','shuttle-c-all','shuttle-overflow-6'])assert.equal(roadAnchoredRoute(id).applied,false);
});
test('controlled A paths avoid roof/blocked centerlines',()=>{
  for(const zone of ['aNorth','aSouth'])for(const out of [false,true]) {
    const points=out?zoneDepartureRoute('a',zone):zoneArrivalRoute('a',zone);
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.5));
      for(let j=0;j<=n;j++)assert.ok(avoidsShuttleObstacles([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]));
    }
  }
});
test('Lot A mixed North/South departures drain through both staffed controls',()=>{
  const s=createCampusTraffic({phase:'departure',initialZoneOccupancy:{aNorth:12,aSouth:12}});
  for(let i=0;i<6000;i++)s.step(.1,[0,0,0]);
  assert.deepEqual(s.routingIssues,[]);assert.equal(s.departed.a,24);
  assert.equal(s.aMainControl.totalPassed.aNorth,12);assert.equal(s.aMainControl.totalPassed.aSouth,12);
  assert.equal(s.feederOfficer.passed,24);
});
