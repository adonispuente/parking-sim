import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions, departureSchedule, createServiceController, formatServiceClock } from '../src/sundayServices.js';
import { serviceCarryOptions } from '../src/serviceCarry.js';
import { blankZones } from '../src/parkingZones.js';
import { createSeekablePlayback } from '../src/playback.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';

const step=(state,seconds)=>{for(let i=0;i<Math.round(seconds*20);i++)state.step(.05);};
const empty={a:0,b:0,c:0};

test('fixed-tick rounding displays exact 3pm and old timing inputs are bounded consistently',()=>{
  assert.equal(formatServiceClock(900-2e-10),'3:00');
  assert.equal(formatServiceClock(899.99),'2:59');
  const c=createServiceController(serviceOptions('final',{departureWindowMinutes:40,lingerMinutes:35}),blankZones());
  assert.equal(c.settings.departureWindowMinutes,25);assert.equal(c.settings.lingerMinutes,5);
});

for(const id of ['nine','eleven','final'])test(`${id}: disjoint per-lot readiness quotas and wall-clock windows`,()=>{
  for(const lot of ['a','b','c'])for(const n of [0,1,19,20,49,50,100,411,487,686]) {
    const cars=Array.from({length:n},(_,i)=>departureSchedule(id,lot,i));
    assert.equal(cars.filter(c=>c.departureGroup==='early').length,Math.floor(n/20));
    assert.ok(Math.abs(cars.filter(c=>c.departureGroup==='late').length-(lot==='a'?n*.02:0))<1);
    for(const c of cars) {
      const offset=c.readinessMinute-c.dismissalMinute;
      assert.ok(c.departureGroup==='early'?offset>=-10&&offset<=-5:c.departureGroup==='late'?offset>=25&&offset<=30:offset>=0&&offset<=25);
      if(id==='final')assert.ok(c.readinessMinute<=900);
    }
  }
});

test('pre-roll and later carry origins leave incoming arrival wall-clock distribution unchanged',()=>{
  for(const id of ['nine','eleven','final']) {
    const base=serviceOptions(id,{demand:101,earlyPercent:10});
    const original=createServiceController(base,blankZones()).arrivals.map(a=>base.beginMinute+a.due/60);
    const shifted={...base,beginMinute:base.beginMinute+17};
    const actual=createServiceController(shifted,blankZones()).arrivals.map(a=>shifted.beginMinute+a.due/60);
    actual.forEach((minute,i)=>assert.ok(Math.abs(minute-original[i])<1e-8));
  }
});

test('newly parked current-service cars get finite readiness and fresh departure control admission',()=>{
  const config=serviceOptions('nine',{demand:0,beginMinute:540});
  const state=createCampusTraffic({initialOccupancy:empty,service:{enabled:true,...config}});
  // Controlled arrival injection isolates lifecycle from the incoming distribution.
  state.waiting[0]=1;
  step(state,180);
  assert.equal(state.parkedVehicles.length,1);
  const car=state.parkedVehicles[0];
  assert.equal(car.serviceId,'nine');assert.equal(car.cohort,'current');
  assert.ok(Number.isFinite(car.readyAt));assert.ok(car.readyAt>state.clock);
  assert.equal(car.aMergePassed,undefined);assert.equal(car.corporatePassed,undefined);
  const identity=car.id;
  state.clock=car.readyAt-.1;step(state,.05);
  assert.equal(state.parkedVehicles.length,1);
  step(state,120);
  assert.ok(!state.parkedVehicles.some(c=>c.id===identity));
  assert.ok(state.aMainControl.history.some(c=>c.id===identity&&c.phase==='departing'),'fresh departure passes Main controller');
  assert.deepEqual(state.routingIssues,[]);
});

test('idle carry preserves car service/time/id and A latch, never sends clock backward',()=>{
  const options={initialOccupancy:{a:200,b:0,c:0},service:{enabled:true,...serviceOptions('nine',{demand:0,beginMinute:600})}};
  const old=createCampusTraffic(options);
  // An explicit closure below full is carried even when occupancy alone would not latch.
  old.step(.05,[0,0,0],[{id:'a',open:false}]);
  assert.ok(old.serviceCarry);assert.equal(old.gateStatus.a,true);
  const stats={...old,active:0};
  const patch=serviceCarryOptions(options,stats,'eleven');
  assert.equal(patch.service.beginMinute,605);
  const next=createCampusTraffic({...options,...patch,service:{...patch.service,demand:0}});
  assert.equal(next.gateStatus.a,true);assert.equal(next.serviceStatus.gates.a.releaseMinute,615);
  assert.deepEqual(next.parkedVehicles.map(c=>[c.id,c.zone,c.serviceId,c.readinessMinute]),old.parkedVehicles.map(c=>[c.id,c.zone,c.serviceId,c.readinessMinute]));
  for(const car of next.parkedVehicles)assert.equal(car.readyAt,(car.readinessMinute-605)*60);
  const late={...stats,serviceCarry:{...old.serviceCarry,minute:640}};
  assert.equal(serviceCarryOptions(options,late,'eleven').service.beginMinute,640);
  assert.throws(()=>serviceCarryOptions(options,{...stats,active:1},'eleven'),/clear car routes/);
  assert.throws(()=>serviceCarryOptions(options,stats,'final'),/clear car routes/);
  assert.throws(()=>createCampusTraffic({...options,...patch,initialOccupancy:empty,initialZoneOccupancy:blankZones()}),/match section occupancy/);
});

test('manual closure redirects arrivals before assigning quota at the actual parked lot',()=>{
  const state=createCampusTraffic({initialOccupancy:empty,service:{enabled:true,...serviceOptions('nine',{demand:0})}});
  state.waiting[0]=20;state.step(.05);
  assert.equal(state.cars[0].target,'a');
  const lots=[{id:'a',open:false},{id:'b',open:true},{id:'c',open:true}];
  for(let i=0;i<8000;i++)state.step(.05,[0,0,0],lots);
  assert.equal(state.parkedVehicles.length,20);
  assert.ok(state.parkedVehicles.every(c=>c.target==='b'));
  assert.deepEqual(state.parkedVehicles.map(c=>c.departureOrdinal).sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i));
  assert.equal(state.parkedVehicles.filter(c=>c.departureGroup==='early').length,1);
  assert.equal(state.parkedVehicles.filter(c=>c.departureGroup==='late').length,0);
  assert.deepEqual(state.routingIssues,[]);
});

test('final ordinary readiness does not delete cars queued behind a real blocker at 3pm',()=>{
  const service={enabled:true,...serviceOptions('final',{demand:0,beginMinute:899.99})};
  const state=createCampusTraffic({initialOccupancy:{a:0,b:1,c:0},service});
  // Block the actual departure launch. Readiness must not bypass physical traffic.
  const car=state.parkedVehicles[0];
  assert.ok(car.readinessMinute<900);
  const originalPush=state.lanes.push.bind(state.lanes);
  state.lanes.push=(...lanes)=>{const result=originalPush(...lanes);state.cars.push({id:'blocker',lane:result-1,distance:0,speed:0,phase:'departure'});return result;};
  step(state,1);
  assert.ok(state.serviceStatus.minute>=900);
  assert.equal(state.parkedVehicles.length,1,'ready car remains parked until start clears');
});

test('recorded rewind and deterministic forward reconstruct current-cohort readiness and carry snapshot',async()=>{
  const factory=()=>createCampusTraffic({initialOccupancy:{a:0,b:1,c:0},service:{enabled:true,...serviceOptions('nine',{demand:0,beginMinute:614.99})}});
  const p=createSeekablePlayback(factory,{rates:[0,0,0]},{captureFrame:captureTrafficFrame,yieldWork:async()=>{}});
  for(let i=0;i<30;i++)p.advance(.1,5);
  const reference=captureTrafficFrame(p.simulation);
  p.advance(.1,-30);await p.advance(.1,5);
  for(let i=0;i<6;i++)p.advance(.1,5);
  assert.deepEqual(captureTrafficFrame(p.simulation),reference);
});
