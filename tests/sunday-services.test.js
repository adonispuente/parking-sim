import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PARKING_ZONES, GENERAL_CAPACITY, distributeInitialOccupancy, blankZones, chooseZone } from '../src/parkingZones.js';
import { createServiceController, serviceOptions, SUNDAY_SERVICES } from '../src/sundayServices.js';
import { createCampusTraffic } from '../src/traffic.js';
import { zoneArrivalRoute, zoneDepartureRoute, B_SOUTH_CHECKPOINT } from '../src/parkingRoutes.js';
import { avoidsShuttleObstacles } from '../src/shuttleRoutes.js';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';
import { makeOccupancyFill } from '../src/occupancyFill.js';
const advance=(s,seconds)=>{for(let i=0;i<seconds*10;i++)s.step(.1);};

test('confirmed section capacities total1584; badge51 stays inside A411',()=>{
  assert.equal(PARKING_ZONES.reduce((n,z)=>n+z.capacity,0),1584);
  assert.deepEqual(GENERAL_CAPACITY,{a:360,b:487,c:686});
  const n=distributeInitialOccupancy({a:411,b:487,c:686});
  assert.deepEqual(n,{aNorth:210,aSouth:150,aBadge:51,bSouth:75,bBanana:100,bPocket:8,bNorth:304,cNorth:343,cSouth:343});
  assert.equal(chooseZone('a',blankZones(),blankZones()),'aNorth');
  assert.equal(chooseZone('a',{...blankZones(),aNorth:210},blankZones()),'aSouth');
  assert.equal(chooseZone('b',{...blankZones(),bSouth:75},blankZones()),'bBanana');
  assert.equal(SUNDAY_SERVICES.final.startMinute,795);
});

test('A transition gate excludes badges, reopens at50%, and B has no half-full hold',()=>{
  const initial=distributeInitialOccupancy({a:411,b:487});
  const controller=createServiceController(serviceOptions('eleven'),initial);
  const state={clock:0,zoneOccupancy:{...initial},reserved:{a:0,b:0,c:0},waiting:[0,0,0]};
  controller.tick(state);assert.equal(controller.gated.a,true);assert.equal(controller.gated.b,false);assert.equal(controller.gated.c,false);
  state.zoneOccupancy.aNorth=30; // 30N+150S=180 general; badge51 irrelevant
  state.zoneOccupancy.bNorth=60; // 75+100+8+60=243
  state.clock=(615-SUNDAY_SERVICES.eleven.beginMinute)*60; // outgoing dismissal, after pre-roll
  controller.tick(state);assert.equal(controller.gated.a,false);assert.equal(controller.gated.b,false);
  state.zoneOccupancy.aNorth=209;controller.tick(state);assert.equal(controller.gated.a,false,'stays open below full');
  state.zoneOccupancy.aNorth=210;controller.tick(state);assert.equal(controller.gated.a,true,'refilling closes A for the current service');
  assert.equal(state.serviceStatus.gates.a.releaseMinute,735);
  const partial=createServiceController(serviceOptions('eleven'),distributeInitialOccupancy({a:360,b:387}));
  assert.equal(partial.gated.b,false);
});

test('scheduled old-cohort departures vary, keep lingerers and do not release new-service arrivals',()=>{
  const config=serviceOptions('eleven',{demand:0});
  const s=createCampusTraffic({initialOccupancy:{a:360,b:487,c:103},service:{enabled:true,...config}});
  const due=s.parkedVehicles.map(c=>c.readyAt);
  assert.ok(new Set(due).size>900);assert.ok(due.some(t=>t>2100));
  advance(s,1200);assert.equal(s.serviceStatus.issued,0);assert.ok(s.departed.a>0&&s.departed.b>0&&s.departed.c>0);
  assert.ok(s.parkedVehicles.some(c=>c.cohort==='previous'));
});

test('transition arrivals use C at B capacity; a B vacancy is immediately usable',()=>{
  for(const [b,target] of [[487,'c'],[387,'b']]) {
    const s=createCampusTraffic({initialOccupancy:{a:360,b,c:0},service:{enabled:true,...serviceOptions('eleven',{demand:0})}});
    // Isolate capacity from departure releases on the same simulation step.
    for(const car of s.parkedVehicles)car.readyAt=Infinity;
    s.waiting[0]=1;s.step(.1);assert.equal(s.routeHistory[0].target,target);
  }
});

test('all general-zone routes avoid roof/blocked polygons and B routes visit south before north',()=>{
  for(const [zone,key] of Object.entries({aNorth:'a',aSouth:'a',aBadge:'badgeA',bSouth:'bWest',bBanana:'bWest',bPocket:'bWest',bNorth:'bWest',cNorth:'cWest',cSouth:'cWest'})) {
    for(const points of [zoneArrivalRoute(key,zone),zoneDepartureRoute(key,zone)])for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));
      for(let j=0;j<=n;j++)assert.ok(avoidsShuttleObstacles([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]),`${zone} obstacle`);
    }
    if(zone.startsWith('b'))assert.ok(zoneArrivalRoute(key,zone).some(p=>Math.hypot(p[0]-B_SOUTH_CHECKPOINT[0],p[1]-B_SOUTH_CHECKPOINT[1])<.01),`${zone} via B South`);
  }
});

test('badge arrivals cannot exceed their51 slots or claim general spaces',()=>{
  const s=createCampusTraffic({badgePercent:100,initialOccupancy:{a:360,b:487,c:686}});
  s.waiting[0]=52;advance(s,500);
  assert.equal(s.zoneOccupancy.aBadge,51);assert.equal(s.waiting[0],1);assert.equal(s.occupancy.a,411);
  assert.ok(s.routeHistory.every(c=>c.access==='badgeA'));
});

test('parallel curves cannot mutually deadlock with each vehicle believing the other ahead',()=>{
  const pathA=new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,100));
  const pathB=new THREE.LineCurve3(new THREE.Vector3(.8,0,0),new THREE.Vector3(-13.2,0,100));
  const s={lanes:[{path:pathA,length:100},{path:pathB,length:pathB.getLength()}],cars:[{id:'a',lane:0,distance:20},{id:'b',lane:1,distance:20.2}]};
  const start=s.cars.map(c=>c.distance);advanceSharedTraffic(s,.1);
  assert.ok(s.cars.some((c,i)=>c.distance>start[i]+.1));
});

test('occupancy fill cutoff is west-first and respects filled polygon area',()=>{
  const cutoff=makeOccupancyFill([[0,0],[10,0],[10,5],[0,5]]);
  assert.ok(Math.abs(cutoff(.5)-5)<.001);assert.ok(cutoff(.1)<cutoff(.9));
});

test('three Sunday scenarios park incoming demand before its early dismissal and clear outgoing cohorts',()=>{
  for(const id of ['nine','eleven','final']) {
    const config=serviceOptions(id);
    const s=createCampusTraffic({initialOccupancy:config.initialOccupancy,service:{enabled:true,...config},shuttles:{activeCount:config.activeBuses,dwellSeconds:3}});
    // Stop immediately before THIS cohort's early window. Current-service cars
    // now depart at their own dismissal, rather than remaining parked forever.
    advance(s,((config.startMinute+75-10-.1)-config.beginMinute)*60);
    assert.equal(s.entered.reduce((a,b)=>a+b,0),config.demand,id);
    assert.equal(Object.values(s.occupancy).reduce((a,b)=>a+b,0),config.demand,id);
    assert.equal(s.waiting.reduce((a,b)=>a+b,0),0,id);assert.deepEqual(s.routingIssues,[],id);
    assert.equal(s.parkedVehicles.filter(c=>c.cohort==='previous').length,0,id==='nine'?'no previous cohort':id);
    if(id==='nine') {assert.deepEqual(s.occupancy,{a:360,b:487,c:103});assert.deepEqual(s.departed,{a:0,b:0,c:0});assert.ok(s.shuttles.slice(3).every(b=>b.trips===0));}
    else assert.ok(s.shuttles.every(b=>b.trips>0));
    // Even while A has room, 10% now originate at Equity and another10% bypass A
    // along Corporate toward B. These are confirmed service-routing streams.
    if(id==='final')assert.deepEqual(s.occupancy,{a:240,b:60,c:0}); // Equity now uses B, C fallback only.
    for(const z of PARKING_ZONES)assert.ok(s.zoneOccupancy[z.id]>=0&&s.zoneOccupancy[z.id]+s.zoneReserved[z.id]<=z.capacity);
  }
});
