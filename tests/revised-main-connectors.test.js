import test from 'node:test';
import assert from 'node:assert/strict';
import { pointAt, routeAt } from '../src/clearImageSource.js';
import { mainStationCorridorJoin, MAIN_STATION_MERGE_PX, zoneArrivalRoute } from '../src/parkingRoutes.js';
import { CONNECTOR_PROVENANCE, segmentDistance, clearSegment, avoidsObstacles } from '../src/sourceRouting.js';
const main=pointAt(57);
test('revised traces connect to fixed Main without a grid detour and disclose residual',()=>{
  for(const index of [0,1,18]) {
    const r=routeAt(index),target=r[index===18?3:5];
    const residual=Math.min(...r.slice(1).map((p,i)=>segmentDistance(main,r[i],p)));
    assert.ok(residual>6&&residual<MAIN_STATION_MERGE_PX);
    assert.deepEqual(mainStationCorridorJoin(main,target,index,`revised test #${index}`),[main,target]);
    assert.ok(clearSegment(main,target,avoidsObstacles));
    assert.ok(CONNECTOR_PROVENANCE.some(p=>p.context===`revised test #${index}`&&p.mode==='station-source-corridor'&&p.corridorPx<=12));
  }
});
test('station adjustment cannot become an unbounded shortcut',()=>{
  assert.equal(mainStationCorridorJoin([400,400],[500,400],0,'reject remote'),null);
});
test('revised inbound approach continues forward to Main rather than looping south and back',()=>{
  // aNorth arrivals take AddNorthRoute and bypass Main (2026-11-12).
  for(const zone of ['aSouth']) {
    const route=zoneArrivalRoute('a',zone),k=route.findIndex(p=>Math.hypot(p[0]-main[0],p[1]-main[1])<.001);
    assert.ok(k>0);
    assert.ok(route.slice(0,k).every(p=>p[0]<=main[0]+1),'no east overshoot before staffed position');
    assert.ok(route.slice(Math.max(0,k-10),k).every(p=>p[1]<=main[1]+1),'no opposing south-aisle detour');
  }
});