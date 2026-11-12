import test from 'node:test';
import assert from 'node:assert/strict';
import drawing from '../images/ABHubs.json' with { type:'json' };
import { AB_HUBS, abHubsForZone } from '../src/abHubSource.js';
import { zoneArrivalRoute, zoneDepartureRoute, B_SOUTH_CHECKPOINT } from '../src/parkingRoutes.js';
import { clearSegment, distance } from '../src/sourceRouting.js';
import { createCampusTraffic } from '../src/traffic.js';
import { WORLD_SCALE } from '../src/clearImageSource.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';
import { serviceOptions } from '../src/sundayServices.js';
import { serviceCarryOptions } from '../src/serviceCarry.js';

test('six A and ten B hubs use exact drawn anchors and roof-clear arrival/exit routes',()=>{
  assert.equal(AB_HUBS.filter(h=>h.lot==='a').length,6);
  assert.equal(AB_HUBS.filter(h=>h.lot==='b').length,10);
  for(const h of AB_HUBS) {
    assert.deepEqual(h.point,drawing.shapes[h.sourceIndex].points[0]);
    for(const key of h.lot==='a'?['a','eA']:['bWest','bNorth','eBMain','e2BMain']) {
      const route=zoneArrivalRoute(key,h.zone,h.id);
      assert.deepEqual(route.at(-1),h.point);
      if(h.zone==='bSouth')assert.ok(!route.some(p=>distance(p,B_SOUTH_CHECKPOINT)<.001),'South parks on the first pass');
      if(h.id==='b-hub-69')assert.ok(route.at(-2)[1]>=h.point[1]-2,'east-spine arrival does not overshoot and reverse');
      for(let i=1;i<route.length;i++)assert.ok(clearSegment(route[i-1],route[i]),`${h.id} arrival ${key}`);
    }
    for(const key of h.lot==='a'?['a']:['bWest','bNorth']) {
      const route=zoneDepartureRoute(key,h.zone,h.id);
      assert.deepEqual(route[0],h.point);
      for(let i=1;i<route.length;i++)assert.ok(clearSegment(route[i-1],route[i]),`${h.id} departure ${key}`);
    }
  }
});
const initialZoneOccupancy={aNorth:6,aSouth:6,bSouth:2,bBanana:4,bPocket:2,bNorth:12};
test('initial A/B parking uses all hubs and launches from the same anchor',()=>{
  const s=createCampusTraffic({phase:'departure',initialZoneOccupancy,shuttles:{activeCount:0}});
  assert.ok(Object.values(s.abHubOccupancy).every(n=>n===2));
  const parked=new Map(s.parkedVehicles.map(c=>[c.id,c.abHubId]));
  s.step(.1);
  assert.deepEqual(s.routingIssues,[]);
  assert.ok(s.cars.length>0);
  for(const zone of ['aNorth','aSouth'])assert.equal(s.cars.filter(c=>c.zone===zone).length,2,'A approach queue stays bounded');
  for(const zone of ['bSouth','bBanana','bPocket','bNorth'])assert.equal(s.cars.filter(c=>c.zone===zone).length,Math.min(2,abHubsForZone(zone).length),'B approach queue stays bounded');
  for(const car of s.cars){assert.equal(car.abHubId,parked.get(car.id));const p=s.lanes[car.lane].path.getPointAt(0),h=AB_HUBS.find(h=>h.id===car.abHubId);assert.ok(distance([p.x/WORLD_SCALE,p.z/WORLD_SCALE],h.point)<.001);}
  const frame=captureTrafficFrame(s);assert.deepEqual(frame.abHubOccupancy,s.abHubOccupancy);
  frame.abHubOccupancy['a-hub-73']=999;assert.notEqual(s.abHubOccupancy['a-hub-73'],999);
  const seen=new Set(s.cars.map(c=>c.abHubId));
  for(let i=0;i<6000&&s.departed.a+s.departed.b<32;i++) {
    s.step(.1);
    for(const c of s.cars) {
      seen.add(c.abHubId);assert.equal(c.abHubId,parked.get(c.id));
      const p=s.lanes[c.lane].path.getPointAt(0),h=AB_HUBS.find(h=>h.id===c.abHubId);
      assert.ok(distance([p.x/WORLD_SCALE,p.z/WORLD_SCALE],h.point)<.001);
    }
  }
  assert.equal(seen.size,16);assert.equal(s.departed.a+s.departed.b,32);
});
test('A/B arrivals balance their section hubs and retain their anchor on departure',()=>{
  for(const zone of ['aNorth','aSouth','bSouth','bBanana','bPocket','bNorth']) {
    const lot=zone[0],s=createCampusTraffic({zonePreferences:{[lot]:zone},lotSettings:['a','b','c'].map(id=>({id,open:id===lot})),shuttles:{activeCount:0}});
    const n=abHubsForZone(zone).length*2;s.waiting[0]=n;
    for(let i=0;i<10000&&s.parkedVehicles.length<n;i++)s.step(.1);
    assert.deepEqual(s.routingIssues,[]);
    assert.equal(s.parkedVehicles.length,n,`${zone}: arrivals stalled`);
    assert.ok(abHubsForZone(zone).every(h=>s.abHubOccupancy[h.id]===2));
    for(const c of s.parkedVehicles){const p=s.lanes[c.lane].path.getPointAt(1),h=AB_HUBS.find(h=>h.id===c.abHubId);assert.ok(distance([p.x/WORLD_SCALE,p.z/WORLD_SCALE],h.point)<.001);}
    const expected=new Map(s.parkedVehicles.map(c=>[c.id,c.abHubId]));s.setPhase('departure');
    for(let i=0;i<10000&&s.departed[lot]<n;i++){s.step(.1);for(const c of s.cars)assert.equal(c.abHubId,expected.get(c.id));}
    assert.equal(s.departed[lot],n,`${zone}: exits stalled`);
  }
});
test('A/B service carry retains hubs and upgrades old checkpoints',()=>{
  const options={initialZoneOccupancy,service:{enabled:true,...serviceOptions('nine',{demand:0,beginMinute:540})}};
  const first=createCampusTraffic(options),patch=serviceCarryOptions(options,{...first,active:0},'eleven');
  const next=createCampusTraffic({...options,...patch,service:{...patch.service,demand:0}});
  assert.deepEqual(next.parkedVehicles.map(c=>c.abHubId),first.parkedVehicles.map(c=>c.abHubId));
  const old=structuredClone(patch.initialServiceCarry);for(const c of old.parkedVehicles)delete c.abHubId;
  const restored=createCampusTraffic({...options,...patch,initialServiceCarry:old});
  assert.ok(restored.parkedVehicles.every(c=>abHubsForZone(c.zone).some(h=>h.id===c.abHubId)));
});
test('mixed A/B hub traffic clears while shuttles keep circulating',()=>{
  const s=createCampusTraffic({phase:'mixed',initialZoneOccupancy,shuttles:{activeCount:3,dwellSeconds:1}});
  s.waiting[0]=12;
  for(let i=0;i<18000&&(s.departed.a+s.departed.b<44||s.shuttles.slice(0,3).some(bus=>bus.trips===0));i++)s.step(.1);
  assert.deepEqual(s.routingIssues,[]);
  assert.equal(s.departed.a+s.departed.b,44);
  assert.equal(s.cars.filter(c=>!c.fleetBus).length,0);
  assert.ok(s.shuttles.slice(0,3).every(bus=>bus.trips>0));
});

test('B North arrival queues reach all six hubs without reversing on the east spine',()=>{
  const s=createCampusTraffic({zonePreferences:{b:'bNorth'},lotSettings:[{id:'a',open:false},{id:'c',open:false}],shuttles:{activeCount:3,dwellSeconds:1}});
  s.waiting[0]=48;
  for(let i=0;i<12000&&s.parkedVehicles.length<48;i++)s.step(.1);
  assert.deepEqual(s.routingIssues,[]);
  assert.equal(s.parkedVehicles.length,48);
  assert.ok(abHubsForZone('bNorth').every(h=>s.abHubOccupancy[h.id]===8));
});
