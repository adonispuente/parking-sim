import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';
import { C_ENTRANCE_AREA } from '../src/cEntranceControl.js';
import { inPolygon } from '../src/sourceRouting.js';
import { fromWorld } from '../src/clearImageSource.js';

test('Easter full-lot traffic keeps moving past the 11:05 C entrance deadlock',context=>{
  const service=serviceOptions('easter');
  const s=createCampusTraffic({initialOccupancy:service.initialOccupancy,badgePercent:5,phase:'arrival',
    service:{enabled:true,...service},zonePreferences:{a:'auto',b:'auto',c:'auto'},
    shuttles:{enabled:true,activeCount:5,bFullPercent:100,randomDwell:true,dwellSeconds:45,
      cDirection:'auto',bStop:'circuit',dispatchMode:'demand',dispatchDuringDepartures:true}});
  const lots=['a','b','c'].map(id=>({id:`lot-${id}`,open:true}));
  let nextSample=650,prior=null,departedBefore=null,samples=0;
  while(s.serviceStatus.minute<670) {
    s.step(.05,[18,18,0],lots);
    if(s.serviceStatus.minute<nextSample)continue;
    const cars=s.cars.filter(c=>!c.fleetBus);
    const current=new Map(cars.map(c=>[c.id,{lane:c.lane,distance:c.distance}]));
    if(prior?.size) {
      const progressed=[...prior].some(([id,p])=>!current.has(id)||current.get(id).lane!==p.lane||current.get(id).distance>p.distance+1e-6);
      assert.ok(progressed,`all on-road cars frozen at ${s.serviceStatus.clock}`);
      samples++;
    }
    if(departedBefore===null)departedBefore=s.departed.c;
    prior=current;nextSample+=5;
  }
  assert.ok(samples>=3,'observe traffic across the reported freeze window');
  assert.ok(s.departed.c>departedBefore,'C departures continue after 10:50');
  assert.deepEqual(s.routingIssues,[]);
  context.diagnostic(JSON.stringify({minute:s.serviceStatus.minute,departed:s.departed,occupancy:s.occupancy}));
});

test('11:00 UI scenario keeps shuttle turns moving through the reported 11:02 C entrance block',context=>{
  const service=serviceOptions('eleven');
  const s=createCampusTraffic({initialOccupancy:service.initialOccupancy,badgePercent:5,phase:'arrival',
    service:{enabled:true,...service},zonePreferences:{a:'auto',b:'auto',c:'auto'},
    shuttles:{enabled:true,activeCount:5,bFullPercent:100,randomDwell:true,dwellSeconds:45,
      cDirection:'auto',bStop:'circuit',dispatchMode:'demand',dispatchDuringDepartures:true}});
  const lots=['a','b','c'].map(id=>({id:`lot-${id}`,open:true}));
  const progress=new Map(),seen=new Set();let longest=0,heldForBus=0,shuttleGrants=0;
  for(let i=0;i<78000;i++) {
    s.step(.05,[18,18,0],lots);
    if(s.clock<3300)continue; // 11:00 through 11:10, including the reported 11:02.
    for(const bus of s.cars.filter(c=>c.fleetBus)) {
      const lane=s.lanes[bus.lane],p=lane.path.getPointAt(bus.distance/lane.length);
      if(!inPolygon(fromWorld([p.x,p.z]),C_ENTRANCE_AREA)){progress.delete(bus.id);continue;}
      seen.add(bus.id);
      const prior=progress.get(bus.id);
      const stalled=prior&&prior.lane===bus.lane&&bus.distance<=prior.distance+1e-8?prior.stalled+.05:0;
      progress.set(bus.id,{lane:bus.lane,distance:bus.distance,stalled});longest=Math.max(longest,stalled);
      assert.ok(stalled<30,`shuttle ${bus.id} stalled ${stalled.toFixed(1)}s at C entrance around ${s.serviceStatus.clock}: ${bus.yieldReason}, waiting on ${bus.yieldingTo}`);
      if(s.cEntrance.admitted.includes(bus.id)){shuttleGrants++;heldForBus+=s.cEntrance.held.length;}
    }
  }
  assert.deepEqual(s.routingIssues,[]);
  assert.ok(seen.size>0,'shuttles actually traverse the entrance in the reported time window');
  assert.ok(shuttleGrants>0,'entrance marshal reserves shuttle turns');
  assert.ok(heldForBus>0,'conflicting car traffic is held before shuttle turns');
  context.diagnostic(JSON.stringify({shuttles:[...seen],longestStoppedSeconds:longest,shuttleGrants,heldForBus,departed:s.departed,arrived:s.exited}));
});
