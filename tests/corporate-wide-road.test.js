import test from 'node:test';
import assert from 'node:assert/strict';
import { CORPORATE_CENTERLINE, CORPORATE_LANE_OFFSET_PX } from '../src/corporateLanes.js';
import { keepRight, createCampusTraffic } from '../src/traffic.js';
import { shapeAt, WORLD_SCALE } from '../src/clearImageSource.js';
import { inPolygon, avoidsObstacles } from '../src/sourceRouting.js';

function segmentGap(a,b,c,d) {
  const pointGap=(p,a,b)=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
  };
  const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;
  return Math.min(pointGap(a,c,d),pointGap(b,c,d),pointGap(c,a,b),pointGap(d,a,b));
}

test('Corporate through lanes share a centerline, stay on pavement and clear opposing bus/car bodies',()=>{
  const road=CORPORATE_CENTERLINE.filter(p=>p[0]>290&&p[0]<440&&p[1]>400);
  const inbound=keepRight(road),outbound=keepRight([...road].reverse());
  assert.equal(CORPORATE_LANE_OFFSET_PX,12);
  let gap=Infinity;
  for(const line of [inbound,outbound])for(const p of line){
    assert.ok(inPolygon(p,shapeAt(56).points));assert.ok(avoidsObstacles(p));
  }
  for(let i=1;i<inbound.length;i++)for(let j=1;j<outbound.length;j++)
    gap=Math.min(gap,segmentGap(inbound[i-1],inbound[i],outbound[j-1],outbound[j]));
  assert.ok(gap*WORLD_SCALE>1.03,`opposing body gap ${gap*WORLD_SCALE}`);
});

test('isolated west B departure completes in production without artificial corridor hold',()=>{
  const state=createCampusTraffic({initialZoneOccupancy:{bSouth:1},phase:'departure',shuttles:{activeCount:0},departurePolicy:{bNorthPercent:0}});
  state.setPhase('departure');
  let held=0,moving=0;
  for(let i=0;i<12000&&state.departed.b<1;i++){
    state.step(.05,[0,0,0]);
    for(const car of state.cars)if(car.phase==='departing'){
      if(car.holdForCorridor||car.holdForCorporateJunction)held++;
      if(car.distance>0)moving++;
    }
  }
  assert.ok(moving>0);
  assert.equal(held,0,'no competing traffic means no officer wait');
  assert.equal(state.departed.b,1);
});
