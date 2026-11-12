// QWEN independent M1 lifecycle tests (2026-11-09).
// Written ONLY against the landed source: src/sundayServices.js, src/serviceCarry.js,
// src/campusSimulation.js (serviceCarry snapshot). No existing file is modified here.
// Contract under test:
//   departureSchedule(serviceId,lot,ordinal,settings={}) ->
//     {serviceId, dismissalMinute, readinessMinute, departureGroup('early'|'main'|'late')}
//     ordinal 0-based; every 20th (n%20===19) early; A only: n%50===48 late (~2%),
//     disjoint from early; early window dismissal-10..-5; main dismissal..+25;
//     A late +25..+30; B/C never late; final service readiness <= 900 (3:00).
//   serviceCarryOptions(options, stats, nextId) -> UI-ready options patch;
//     validates completed arrivals + clear routes; begins at max(next.begin, carry.minute);
//     preserves initial occupancy/zones + initialServiceCarry snapshot.
//   state.serviceCarry -> idle-only public snapshot
//     {minute, parkedVehicles[abs readiness metadata], gate{closed,releaseMinute,reopenedMinute}}.
// Cohort keying (verified against source): initial-occupancy cars are PREVIOUS-cohort
// (eleven preset -> nine dismissal 615); arrivals parked within a service get the
// CURRENT service's dismissal (eleven -> 735). Each car releases at ITS OWN dismissal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { SUNDAY_SERVICES, serviceOptions, departureSchedule, serviceTimeline, createServiceController } from '../src/sundayServices.js';
import { serviceCarryOptions } from '../src/serviceCarry.js';
import { blankZones } from '../src/parkingZones.js';
import { createSeekablePlayback } from '../src/playback.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';

const step=(state,seconds)=>{for(let i=0;i<Math.round(seconds*20);i++)state.step(.05);};

// --- 1. Service timelines -------------------------------------------------
test('service timelines: dismissal = start + 75; 11 begins 605 / final begins 725; previous dismissal',()=>{
  const nine=serviceTimeline({id:'nine'});
  const eleven=serviceTimeline({id:'eleven'});
  const final=serviceTimeline({id:'final'});
  for(const t of [nine,eleven,final])assert.equal(t.dismissalMinute,t.startMinute+75);
  assert.equal(nine.startMinute,540);assert.equal(nine.beginMinute,495);
  assert.equal(eleven.startMinute,660);assert.equal(eleven.beginMinute,605);
  assert.equal(final.startMinute,795);assert.equal(final.beginMinute,725);
  assert.equal(nine.dismissalMinute,615);
  assert.equal(eleven.dismissalMinute,735);
  assert.equal(final.dismissalMinute,870);
  assert.equal(nine.previousDismissalMinute,null);
  assert.equal(eleven.previousDismissalMinute,615);
  assert.equal(final.previousDismissalMinute,735);
});

// --- 2. Readiness quotas: all services x all lots x N values ---------------
const N_VALUES=[1,19,20,49,50,100,411];
for(const serviceId of ['nine','eleven','final']){
  for(const lot of ['a','b','c']){
    test(`${serviceId}/${lot}: exact early floor(N/20), ~2% A late, disjoint, window bounds, final <= 3pm`,()=>{
      const cars=[];
      for(const n of N_VALUES)for(let i=0;i<n;i++)cars.push({n,i,...departureSchedule(serviceId,lot,i)});
      for(const n of N_VALUES){
        const subset=cars.filter(c=>c.n===n);
        const early=subset.filter(c=>c.departureGroup==='early').length;
        const late=subset.filter(c=>c.departureGroup==='late').length;
        const main=subset.filter(c=>c.departureGroup==='main').length;
        assert.equal(early,Math.floor(n/20),`${serviceId}/${lot} N=${n} early count`);
        assert.ok(Math.abs(late-(lot==='a'?n*0.02:0))<1,`${serviceId}/${lot} N=${n} late count`);
        if(lot!=='a')assert.equal(late,0,`B/C never late: ${serviceId}/${lot} N=${n}`);
        assert.equal(early+late+main,n,'group counts partition N');
      }
      for(const c of cars){
        const offset=c.readinessMinute-c.dismissalMinute;
        if(c.departureGroup==='early')assert.ok(offset>=-10-1e-9&&offset<=-5+1e-9,`early window ${offset}`);
        else if(c.departureGroup==='late')assert.ok(offset>=25-1e-9&&offset<=30+1e-9,`late window ${offset}`);
        else assert.ok(offset>=-1e-9&&offset<=25+1e-9,`main window ${offset}`);
        assert.equal(c.serviceId,SUNDAY_SERVICES[serviceId].id);
        assert.equal(c.departureOrdinal,c.i);
        assert.ok(Number.isFinite(c.readinessMinute));
        if(serviceId==='final')assert.ok(c.readinessMinute<=900,`final readiness ${c.readinessMinute} past 3pm`);
      }
      assert.ok(cars.some(c=>c.departureGroup==='early'),'N=411 must contain early cars');
    });
  }
}

test('departureSchedule is deterministic per (service,lot,ordinal) and lot-seeded distinct',()=>{
  const s1=departureSchedule('eleven','b',41);
  assert.deepEqual(s1,departureSchedule('eleven','b',41));
  const other=departureSchedule('eleven','c',41);
  assert.notEqual(s1.readinessMinute,other.readinessMinute,'different lots must not share identical readiness at same ordinal');
  const fallback=departureSchedule('nope','b',0);
  assert.equal(fallback.serviceId,'nine','unknown service id falls back to nine');
});

test('departureSchedule clamps settings: main window 5..25, late tail 1..5',()=>{
  const base=departureSchedule('nine','a',0,{departureWindowMinutes:99,lingerMinutes:99});
  const late=departureSchedule('nine','a',48,{departureWindowMinutes:99,lingerMinutes:99});
  assert.ok(base.readinessMinute-base.dismissalMinute<=25+1e-9);
  assert.ok(late.readinessMinute-late.dismissalMinute<=30+1e-9,'clamped tail must not escape 25..30');
});

// --- 3. Controller: wall-clock distribution invariant under pre-roll -------
test('shifting service begin does not change incoming arrival wall-clock times',()=>{
  for(const id of ['nine','eleven','final']){
    const base=serviceOptions(id,{demand:101,earlyPercent:10});
    const original=createServiceController(base,blankZones()).arrivals.map(a=>base.beginMinute+a.due/60);
    const shifted={...base,beginMinute:base.beginMinute+17};
    const actual=createServiceController(shifted,blankZones()).arrivals.map(a=>shifted.beginMinute+a.due/60);
    actual.forEach((minute,i)=>assert.ok(Math.abs(minute-original[i])<1e-8));
  }
});

// --- 4. serviceCarryOptions: validation, patch shape, begin clamp ----------
const baseOptions=()=>({
  initialOccupancy:{a:0,b:0,c:0},
  service:{enabled:true,...serviceOptions('nine',{demand:0,beginMinute:600})},
});

test('serviceCarryOptions builds UI-ready patch from a completed idle snapshot',()=>{
  const options=baseOptions();
  const stats={serviceStatus:{id:'nine',remaining:0},active:0,waiting:[0,0,0],reserved:{a:0,b:0,c:0},
    occupancy:{a:200,b:0,c:0},zoneOccupancy:blankZones(),
    serviceCarry:{minute:602,parkedVehicles:[{id:1,target:'a',zone:'aNorth',readinessMinute:620}],
      gate:{closed:true,releaseMinute:615,reopenedMinute:null}}};
  const patch=serviceCarryOptions(options,stats,'eleven');
  assert.equal(patch.phase,'arrival');
  assert.equal(patch.service.id,'eleven');
  assert.equal(patch.service.beginMinute,605,'next preset begin wins when the carry ended before it (max(605,602))');
  assert.deepEqual(patch.initialOccupancy,{a:200,b:0,c:0});
  assert.deepEqual(Object.keys(patch.initialZoneOccupancy),Object.keys(blankZones()));
  assert.ok(patch.initialServiceCarry);
  assert.equal(patch.initialServiceCarry.minute,602);
  assert.equal(patch.initialServiceCarry.parkedVehicles.length,1);
  assert.deepEqual(patch.initialServiceCarry.gate,{closed:true,releaseMinute:615,reopenedMinute:null});
  assert.equal(patch.shuttles.activeCount,SUNDAY_SERVICES.eleven.activeBuses);
  assert.equal(patch.shuttles.dispatchDuringDepartures,true);
});

test('carry begin is max(next.begin, carry minute): late carry never rewinds the clock',()=>{
  const options=baseOptions();
  const stats={serviceStatus:{id:'nine',remaining:0},active:0,waiting:[0,0,0],reserved:{a:0,b:0,c:0},
    occupancy:{a:0,b:0,c:0},zoneOccupancy:blankZones(),
    serviceCarry:{minute:640,parkedVehicles:[],gate:{closed:false,releaseMinute:615,reopenedMinute:620}}};
  assert.equal(serviceCarryOptions(options,stats,'eleven').service.beginMinute,640);
});

test('serviceCarryOptions rejects incomplete or mismatched carry state',()=>{
  const options=baseOptions();
  const idle={serviceStatus:{id:'nine',remaining:0},active:0,waiting:[0,0,0],reserved:{a:0,b:0,c:0},
    occupancy:{a:0,b:0,c:0},zoneOccupancy:blankZones(),
    serviceCarry:{minute:615,parkedVehicles:[],gate:{closed:false,releaseMinute:615,reopenedMinute:620}}};
  assert.throws(()=>serviceCarryOptions(options,{...idle,active:1},'eleven'),/clear car routes/);
  assert.throws(()=>serviceCarryOptions(options,{...idle,serviceStatus:{...idle.serviceStatus,remaining:3}},'eleven'),/completed arrivals/);
  assert.throws(()=>serviceCarryOptions(options,{...idle,waiting:[0,2,0]},'eleven'),/clear car routes/);
  assert.throws(()=>serviceCarryOptions(options,{...idle,reserved:{a:1,b:0,c:0}},'eleven'),/clear car routes/);
  assert.throws(()=>serviceCarryOptions(options,{...idle,serviceCarry:null},'eleven'),/clear car routes/);
  assert.throws(()=>serviceCarryOptions(options,{...idle,serviceCarry:{...idle.serviceCarry,minute:NaN}},'eleven'),/clear car routes/);
  // eleven -> final IS a valid pairing: no throw
  assert.doesNotThrow(()=>serviceCarryOptions(options,{...idle,serviceStatus:{id:'eleven',remaining:0}},'final'),'eleven->final is valid');
  assert.throws(()=>serviceCarryOptions(options,idle,'final'),'nine->final skips eleven and must be rejected');
  assert.throws(()=>serviceCarryOptions(options,{...idle,serviceStatus:{id:'nine',remaining:0}},'nope'),'unknown next id');
});

// --- 5. Live carry snapshot: state.serviceCarry ----------------------------
test('live serviceCarry snapshot: null while a car is in transit, then absolute-minute + absolute-readiness metadata',()=>{
  const options=baseOptions();
  const state=createCampusTraffic(options);
  state.waiting[0]=1; // in transit -> not idle once the tick sees it
  state.step(.05);
  assert.equal(state.serviceCarry,null,'no transferable checkpoint while a car is still arriving');
  step(state,300); // car parks (~3-6 min); its readiness (>= 615) is still ahead -> still idle
  assert.ok(state.serviceCarry,`idle state must publish a checkpoint (minute ${state.serviceStatus.minute})`);
  const {serviceCarry}=state;
  assert.equal(serviceCarry.minute,state.serviceStatus.minute);
  assert.ok(serviceCarry.minute>=options.service.beginMinute,'never a past minute');
  assert.equal(serviceCarry.parkedVehicles.length,1);
  const car=serviceCarry.parkedVehicles[0];
  assert.ok(Number.isFinite(car.readinessMinute),'carried vehicle carries absolute readiness');
  assert.equal(car.readyAt,(car.readinessMinute-options.service.beginMinute)*60);
  assert.ok(['closed','releaseMinute','reopenedMinute'].every(k=>k in serviceCarry.gate));
  // lane/control fields must NOT leak into the transferable record
  assert.equal(car.lane,undefined);assert.equal(car.aMergePassed,undefined);
});

// --- 6. Full idle carry across the nine->eleven transition -----------------
test('idle carry across nine->eleven: ids, zones, readiness and A latch preserved; begin 605',()=>{
  const options={initialOccupancy:{a:200,b:0,c:0},service:{enabled:true,...serviceOptions('nine',{demand:0,beginMinute:600})}};
  const old=createCampusTraffic(options);
  // An explicit closure below full is carried even when occupancy alone would not latch.
  old.step(.05,[0,0,0],[{id:'a',open:false}]);
  assert.ok(old.serviceCarry);assert.equal(old.gateStatus.a,true);
  step(old,120); // 200 cars still parked: none ready before (615-600)*60 = 900s
  const stats={...old,active:0};
  const patch=serviceCarryOptions(options,stats,'eleven');
  assert.equal(patch.service.beginMinute,605);
  const next=createCampusTraffic({
    ...options,...patch,
    service:{...patch.service,demand:0,beginMinute:605},
  });
  // exact same cars, metadata re-based onto the new preset begin
  assert.equal(next.parkedVehicles.length,200);
  assert.deepEqual(
    next.parkedVehicles.map(c=>[c.id,c.zone,c.serviceId,c.readinessMinute]),
    old.parkedVehicles.map(c=>[c.id,c.zone,c.serviceId,c.readinessMinute]),
  );
  for(const car of next.parkedVehicles){
    assert.equal(car.serviceId,'nine','old cars keep their own service identity');
    assert.equal(car.cohort,'previous');
    assert.equal(car.readyAt,(car.readinessMinute-605)*60);
  }
  // A latch carries: manually closed, carry minute 602 < release 615 -> still closed
  assert.equal(next.gateStatus.a,true);
  assert.equal(next.serviceStatus.gates.a.releaseMinute,615);
});

// --- 7. Current-service lifecycle: every car releases at ITS OWN dismissal --
test('carried 9:00-cohort cars key to 9:00 dismissal; fresh 11:00 arrivals key to 11:00 dismissal',()=>{
  const state=createCampusTraffic({
    initialOccupancy:{a:0,b:200,c:0},
    service:{enabled:true,...serviceOptions('eleven',{demand:20,beginMinute:605})},
  });
  // Carried 9:00-cohort cars (initial occupancy): dismissal 615, main 615..640.
  const nine=state.parkedVehicles.filter(c=>c.serviceId==='nine'&&c.cohort==='previous');
  assert.equal(nine.length,200);
  for(const c of nine){
    assert.equal(c.dismissalMinute,615);
    assert.ok(c.readinessMinute>=605-1e-9&&c.readinessMinute<=640+1e-9,`9:00-cohort readiness ${c.readinessMinute} outside 9:00 dismissal window`);
  }
  assert.equal(nine.filter(c=>c.departureGroup==='early').length,10,'floor(200/20) early in 9:00 cohort');
  // Fresh 11:00 arrivals (parked from demand): dismissal 735, readiness 725..760.
  state.waiting[0]=20;
  step(state,60); // through 10:25: all due arrivals park (3-5 min road leg)
  const eleven=state.parkedVehicles.filter(c=>c.serviceId==='eleven'&&c.cohort==='current');
  assert.ok(eleven.length>=10,`at least 10 of 20 arrivals must have parked by 10:25 (got ${eleven.length})`);
  for(const c of eleven){
    assert.equal(c.dismissalMinute,735,'fresh arrival keys to the 11:00 dismissal, not a fixed offset');
    assert.ok(c.readinessMinute>=725-1e-9&&c.readinessMinute<=760+1e-9,`11:00 readiness ${c.readinessMinute} outside 11:00 dismissal window`);
    assert.ok(Number.isFinite(c.readyAt));
  }
  // current-cohort ordinals start fresh from 0 in the actual parked lot
  assert.deepEqual(eleven.map(c=>c.departureOrdinal).sort((a,b)=>a-b),Array.from({length:eleven.length},(_,i)=>i));
  assert.deepEqual(state.routingIssues,[]);
});

// --- 8. Full-day chain: nine -> eleven -> final ----------------------------
test('chain: a completed eleven service carries forward to final without rewinding the clock',()=>{
  // 60 nine-cohort lot-A cars (all ready by 645) + no incoming demand: the service
  // finishes early; the snapshot carries the latch state and the current minute.
  const options={
    initialOccupancy:{a:60,b:0,c:0},
    service:{enabled:true,...serviceOptions('eleven',{demand:0,beginMinute:605})},
  };
  const eleven=createCampusTraffic(options);
  step(eleven,3000); // 605 -> 755 min: covers all readiness + road legs
  assert.equal(eleven.parkedVehicles.length,0,'every modeled car of the 11:00 service has departed');
  assert.equal(eleven.routingIssues.length,0,`routing issues: ${eleven.routingIssues}`);
  assert.ok(eleven.serviceCarry,'completed idle service must expose a checkpoint');
  const carryMinute=eleven.serviceCarry.minute;
  assert.equal(carryMinute,eleven.serviceStatus.minute);
  const stats={...eleven,active:0};
  const patch=serviceCarryOptions(options,stats,'final');
  // begin = max(725, carry minute): the 11:00 ran past 1:15, so final starts later, never earlier
  assert.equal(patch.service.beginMinute,Math.max(725,carryMinute));
  assert.ok(patch.service.beginMinute>=725,'carry never rewinds the clock');
  const final=createCampusTraffic({...options,...patch,service:{...patch.service,demand:0}});
  assert.equal(final.serviceStatus.id,'final');
  assert.equal(final.serviceStatus.minute,patch.service.beginMinute,'carried minute becomes the new begin');
  assert.equal(final.parkedVehicles.length,0,'carried population is empty because every car of 11:00 left in its own window');
  // (A-gate open/closed here depends on the re-latch history, not on carry — not asserted.)
  assert.equal(final.routingIssues.length,0);
});

// --- 9. Final service real lifecycle: readiness by 3pm, all clear ----------
test('final service: every car readiness <= 3pm and the lot is clear shortly after',()=>{
  const state=createCampusTraffic({
    initialOccupancy:{a:0,b:0,c:0},
    service:{enabled:true,...serviceOptions('final',{demand:30,beginMinute:725})},
  });
  step(state,11700); // 725 -> 920 min: covers 750..810 arrivals, 870 dismissal, road legs
  assert.equal(state.serviceStatus.issued,30,'all demand issued');
  const parked=state.parkedVehicles;
  for(const car of parked) {
    assert.ok(Number.isFinite(car.readinessMinute),`car ${car.id} parked forever`);
    assert.ok(car.readinessMinute<=900+1e-9,`car ${car.id} readiness ${car.readinessMinute} past 3pm`);
  }
  assert.equal(parked.length,0,`modeled cars must all be gone by 3:20: ${parked.length} remain`);
  assert.equal(state.routingIssues.length,0,`routing issues: ${state.routingIssues}`);
});

// --- 10. Presentation capture exposes the carry snapshot --------------------
test('replay frame capture includes the public serviceCarry snapshot',()=>{
  const options=baseOptions();
  const state=createCampusTraffic(options);
  state.waiting[0]=1;
  state.step(.05);
  step(state,300);
  const frame=captureTrafficFrame(state);
  assert.ok('serviceCarry' in frame);
  assert.deepEqual(frame.serviceCarry,structuredClone(state.serviceCarry));
  const p=createSeekablePlayback(()=>createCampusTraffic(baseOptions()),{rates:[0,0,0]},{captureFrame:captureTrafficFrame,yieldWork:async()=>{}});
  for(let i=0;i<600;i++)p.advance(.1,5); // 300s of simulation -> idle checkpoint
  assert.ok(p.simulation.serviceCarry,'sim exposes the snapshot after idle');
});
