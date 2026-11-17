import test from 'node:test';
import assert from 'node:assert/strict';
import { routeAt, shapeAt } from '../src/clearImageSource.js';
import { zoneDepartureRoute, B_NORTH_DIRECT, B7_ROW_SWEEP, B_EXIT_PROVENANCE } from '../src/parkingRoutes.js';
import { VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { avoidsObstacles, inPolygon, segmentDistance, distance } from '../src/sourceRouting.js';

// Internal leg = route points up to the exit source's first vertex (#11/#17 start).
const internalLeg=(access,zone)=>{
  const route=zoneDepartureRoute(access,zone),start=VECTOR_ROUTES.departure[access][0];
  const k=route.findIndex(p=>distance(p,start)<.001);
  assert.ok(k>0,`${access}:${zone} reaches its exit source`);
  return route.slice(0,k+1);
};
const length=pts=>pts.slice(1).reduce((s,p,i)=>s+distance(pts[i],p),0);
const samples=pts=>pts.slice(1).flatMap((b,i)=>{const a=pts[i],n=Math.ceil(distance(a,b));
  return Array.from({length:n+1},(_,k)=>[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);});
const minTo=(pts,line)=>Math.min(...samples(pts).map(p=>Math.min(...line.slice(1).map((b,i)=>segmentDistance(p,line[i],b)))));

test('B North north departures take a direct north-rows path, not the B South loop', () => {
  const leg=internalLeg('bNorth','bNorth');
  // Baseline: 927.0 px through B South (maxY 575.8).
  assert.ok(length(leg)<200,`internal leg ${length(leg).toFixed(1)} px`);
  assert.ok(Math.max(...leg.map(p=>p[1]))<=380,'no excursion south toward B South');
  assert.deepEqual(leg[0],B_NORTH_DIRECT.start);
  assert.equal(B_NORTH_DIRECT.provisional,true);
  assert.ok(B_EXIT_PROVENANCE.some(e=>e.zone==='bNorth'&&e.access==='bNorth'&&e.mode==='north-rows-direct'&&e.provisional));
});

test('direct leg stays on B North ground, clear of roofs, rows and the shuttle loop', () => {
  const leg=internalLeg('bNorth','bNorth'),zone=shapeAt(44).points;
  for(const p of samples(leg)){assert.ok(avoidsObstacles(p),`roof at ${p}`);assert.ok(inPolygon(p,zone),`outside #44 at ${p}`);}
  assert.ok(minTo(leg,B7_ROW_SWEEP)>=20,'does not cut the #7 row sweep');
  assert.ok(minTo(leg,routeAt(25))>=12.5,'bus body clearance from the #25 shuttle loop');
});

test('direct leg travels with the #7 arrival flow and diverges east at vertex 19', () => {
  const s7=routeAt(7),leg=internalLeg('bNorth','bNorth');
  assert.deepEqual(leg.slice(0,2),[s7[18],s7[19]]);
  const dep=[leg[2][0]-leg[1][0],leg[2][1]-leg[1][1]],arr=[s7[20][0]-s7[19][0],s7[20][1]-s7[19][1]];
  assert.ok(dep[0]>0&&arr[0]<0,'departure heads east to #11; arrival heads west into the rows');
});

test('other Lot B departure legs are unchanged from the 2026-11-07 baseline', () => {
  const baseline={'bWest:bNorth':86.6,'bNorth:bPocket':205.6,'bWest:bPocket':627.9,'bNorth:bSouth':741.7,
    'bWest:bSouth':1164.0,'bNorth:bBanana':604.0,'bWest:bBanana':1026.3};
  for(const [id,px] of Object.entries(baseline)){const [access,zone]=id.split(':');
    assert.ok(Math.abs(length(internalLeg(access,zone))-px)<.1,`${id} ${length(internalLeg(access,zone)).toFixed(1)} vs ${px}`);}
});

// Production cars depart from the drawn hubs, rather than zone staging.
test('every B North hub reaches the north exit without touring B South', async () => {
  const { abHubsForZone }=await import('../src/abHubSource.js');
  const { clearSegment, drivableAllowed }=await import('../src/sourceRouting.js');
  for(const hub of abHubsForZone('bNorth')) {
    const route=zoneDepartureRoute('bNorth','bNorth',hub.id);
    const k=route.findIndex(p=>distance(p,VECTOR_ROUTES.departure.bNorth[0])<.001);
    assert.ok(k>0,`${hub.id} reaches the existing north exit`);
    const leg=route.slice(0,k+1);
    assert.deepEqual(leg[0],hub.point,'departure keeps its real parking anchor');
    assert.ok(length(leg)<400,`${hub.id}: ${length(leg).toFixed(1)} px`);
    assert.ok(Math.max(...leg.map(p=>p[1]))<=hub.point[1]+1,'no southbound loop');
    for(let i=1;i<leg.length;i++)assert.ok(clearSegment(leg[i-1],leg[i],drivableAllowed),`${hub.id}: stays on clear drivable ground`);
    assert.deepEqual(route.slice(k),VECTOR_ROUTES.departure.bNorth,'public exit geometry is preserved');
  }
});

test('B North hub cars actually clear the north exit during normal arrivals and shuttle traffic', async () => {
  const { createCampusTraffic }=await import('../src/traffic.js');
  const state=createCampusTraffic({phase:'mixed',initialZoneOccupancy:{bNorth:12},departurePolicy:{b:'north'},
    lotSettings:[{id:'a',open:false},{id:'c',open:false}],zonePreferences:{b:'bNorth'},shuttles:{activeCount:3,dwellSeconds:1}});
  state.waiting[0]=12;
  for(let i=0;i<18000&&state.departed.b<24;i++)state.step(.1);
  assert.deepEqual(state.routingIssues,[]);
  assert.equal(state.departed.b,24,'initial and newly parked cars complete their north departures');
  assert.equal(state.parkedVehicles.length,0);
  assert.equal(state.cars.filter(c=>!c.fleetBus).length,0);
});
