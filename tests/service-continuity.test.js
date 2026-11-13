import test from 'node:test';
import assert from 'node:assert/strict';
import { blankZones, GENERAL_CAPACITY } from '../src/parkingZones.js';
import { createCampusTraffic } from '../src/traffic.js';
import { SUNDAY_SERVICES, NEXT_SERVICE, PREVIOUS_SERVICE, serviceOptions, serviceTimeline } from '../src/sundayServices.js';
import { serviceCarryOptions } from '../src/serviceCarry.js';

// Commander 2026-11-13: 11:00 Equity defaults to 15%; 9:00 and 1:15 keep 10%.
test('11:00 and Easter default to 15% Equity; other services keep 10%; overrides still win',()=>{
  assert.equal(serviceOptions('eleven').equityPercent,15);
  assert.equal(serviceOptions('easter').equityPercent,15);
  assert.equal(serviceOptions('nine').equityPercent,10);
  assert.equal(serviceOptions('final').equityPercent,10);
  assert.equal(serviceOptions('eleven',{equityPercent:22}).equityPercent,22);
  assert.equal(serviceOptions('eleven',{equityPercent:3}).equityPercent,10,'10% minimum still enforced');
});

test('Easter is the 11:00 transition with every lot full before service and demand to refill them',()=>{
  const easter=SUNDAY_SERVICES.easter,eleven=SUNDAY_SERVICES.eleven;
  for(const key of ['startMinute','beginMinute','arrivalBeginMinute','activeBuses','transition'])assert.equal(easter[key],eleven[key],key);
  assert.deepEqual(easter.initialOccupancy,{a:GENERAL_CAPACITY.a,b:GENERAL_CAPACITY.b,c:GENERAL_CAPACITY.c});
  assert.equal(easter.demand,GENERAL_CAPACITY.a+GENERAL_CAPACITY.b+GENERAL_CAPACITY.c);
  assert.equal(serviceTimeline({id:'easter'}).previousDismissalMinute,615,'previous service is the 9:00');
  const s=createCampusTraffic({initialOccupancy:{...easter.initialOccupancy},service:{enabled:true,...serviceOptions('easter',{demand:0})}});
  assert.deepEqual(s.occupancy,{a:GENERAL_CAPACITY.a,b:GENERAL_CAPACITY.b,c:GENERAL_CAPACITY.c});
  assert.ok(s.parkedVehicles.every(c=>c.serviceId==='nine'),'starting cars belong to the 9:00 and leave at its dismissal');
  assert.equal(s.gateStatus.a,true,'full A starts latched until 9:00 dismissal');
});

test('Sunday order: 9:00 → 11:00 → 1:15, Easter → 1:15',()=>{
  assert.deepEqual({...NEXT_SERVICE},{nine:'eleven',eleven:'final',easter:'final'});
  assert.deepEqual({...PREVIOUS_SERVICE},{eleven:'nine',easter:'nine',final:'eleven'});
});

test('continuous carry starts the next service at the carry minute (no clock jump); manual carry is unchanged',()=>{
  const options={initialOccupancy:{a:40,b:0,c:0},service:{enabled:true,...serviceOptions('nine',{demand:0,beginMinute:601.5})}};
  const old=createCampusTraffic(options);
  old.step(.05);
  assert.ok(old.serviceCarry);
  const stats={...old,active:0};
  const minute=old.serviceCarry.minute;
  assert.ok(minute<SUNDAY_SERVICES.eleven.beginMinute);
  const auto=serviceCarryOptions(options,stats,'eleven',{continuous:true});
  assert.equal(auto.service.beginMinute,minute);
  assert.equal(auto.service.equityPercent,15);
  assert.equal(serviceCarryOptions(options,stats,'eleven').service.beginMinute,605,'manual button keeps its old behavior');
  const next=createCampusTraffic({...options,...auto});
  assert.ok(Math.abs(next.serviceStatus.minute-minute)<1e-6,'new service resumes at the same clock');
  assert.equal(next.serviceStatus.id,'eleven');
  assert.deepEqual(next.parkedVehicles.map(c=>[c.id,c.zone,c.readinessMinute]),old.parkedVehicles.map(c=>[c.id,c.zone,c.readinessMinute]));
  const easterStats={...stats,serviceStatus:{...stats.serviceStatus,id:'easter'}};
  assert.equal(serviceCarryOptions(options,easterStats,'final',{continuous:true}).service.id,'final');
  assert.throws(()=>createCampusTraffic({...options,...auto,initialZoneOccupancy:blankZones()}),/match section occupancy/);
});
