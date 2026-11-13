import test from 'node:test';
import assert from 'node:assert/strict';
import { blankZones } from '../src/parkingZones.js';
import {
  createServiceController, serviceOptions, SUNDAY_SERVICES,
  SERVICE_ARRIVAL_TARGET_MINUTES, SERVICE_ARRIVAL_TAIL_MINUTES,
  SERVICE_ARRIVAL_TARGET_SHARE, SERVICE_ON_TIME_SHARE,
} from '../src/sundayServices.js';

const makeState=clock=>({clock,zoneOccupancy:blankZones(),reserved:{a:0,b:0,c:0},waiting:[0,0,0]});

for(const id of ['nine','eleven','final'])test(`${id}: 95% arrival target is 45 minutes after actual service start`,()=>{
  const preset=SUNDAY_SERVICES[id];
  const demand=101; // Forces integer rounding at the 95% boundary.
  const controller=createServiceController(serviceOptions(id,{demand,earlyPercent:id==='nine'?0:10}),blankZones());
  const target=(preset.startMinute-preset.beginMinute+SERVICE_ARRIVAL_TARGET_MINUTES)*60;
  const end=target+SERVICE_ARRIVAL_TAIL_MINUTES*60;
  const targetCount=Math.ceil(demand*SERVICE_ARRIVAL_TARGET_SHARE);
  assert.equal(targetCount,96);
  assert.equal(controller.arrivals.length,demand);
  assert.equal(controller.arrivals.filter(a=>a.due<=target).length,targetCount);
  assert.ok(controller.arrivals.slice(targetCount).every(a=>a.due>target&&a.due<end));
  assert.ok(controller.arrivals.every((a,i)=>!i||controller.arrivals[i-1].due<=a.due));
  if(preset.transition){
    const earlyEnd=(preset.arrivalBeginMinute-preset.beginMinute)*60+1200;
    assert.equal(controller.arrivals.filter(a=>a.due<=earlyEnd).length,10);
    assert.ok(controller.arrivals.slice(10,targetCount).every(a=>a.due>earlyEnd));
  }
  // Exactly one of Equity and Corporate applies; neither quota can steal the other.
  // 11:00 defaults to 15% Equity (Commander 2026-11-13); other services 10%.
  assert.equal(controller.arrivals.filter(a=>a.source!==0).length,Math.ceil(demand*(preset.equityPercent??10)/100));
  assert.equal(controller.arrivals.filter(a=>a.source===0&&a.parkingIntent==='corporate').length,Math.ceil(demand*.1));
  const before=makeState(target-1);controller.tick(before);
  assert.ok(Math.abs(before.serviceStatus.serviceOffsetMinutes-(SERVICE_ARRIVAL_TARGET_MINUTES-1/60))<1e-9);
  assert.ok(before.serviceStatus.minutesUntilArrivalTarget>0);
  const at=makeState(target);controller.tick(at);
  assert.equal(at.serviceStatus.issued,targetCount);
  assert.equal(at.serviceStatus.remaining,demand-targetCount);
  assert.equal(at.serviceStatus.arrivalTargetMinute,preset.startMinute+SERVICE_ARRIVAL_TARGET_MINUTES);
  assert.equal(at.serviceStatus.serviceOffsetMinutes,SERVICE_ARRIVAL_TARGET_MINUTES);
  assert.equal(at.serviceStatus.minutesUntilArrivalTarget,0);
  assert.equal(at.serviceStatus.minutesUntilFinalArrival,SERVICE_ARRIVAL_TAIL_MINUTES);
  const finish=makeState(end);controller.tick(finish);
  assert.equal(finish.serviceStatus.issued,demand);
  assert.equal(finish.serviceStatus.remaining,0);
  assert.equal(finish.serviceStatus.minutesUntilFinalArrival,0);
});

test('large early transition override cannot consume the reserved 5% tail',()=>{
  // Commander 2026-11-06: 75% on time, the rest late. The early stream is part
  // of the on-time cohort, so 100% early is capped at 15 of 20 (previously 19).
  const controller=createServiceController(serviceOptions('eleven',{demand:20,earlyPercent:100}),blankZones());
  const earlyEnd=(SUNDAY_SERVICES.eleven.arrivalBeginMinute-SUNDAY_SERVICES.eleven.beginMinute)*60+1200;
  assert.equal(controller.arrivals.filter(a=>a.due<=earlyEnd).length,15);
  const target=(SUNDAY_SERVICES.eleven.startMinute-SUNDAY_SERVICES.eleven.beginMinute+45)*60;
  assert.equal(controller.arrivals.filter(a=>a.due<=target).length,19);
  assert.ok(controller.arrivals[19].due>target);
});

for(const id of ['nine','eleven','final'])for(const demand of [101,950,1224,300])test(`${id} demand ${demand}: 75% on time at service start, the rest late`,()=>{
  const preset=SUNDAY_SERVICES[id];
  const controller=createServiceController(serviceOptions(id,{demand,earlyPercent:id==='nine'?0:10}),blankZones());
  const start=(preset.startMinute-preset.beginMinute)*60;
  const onTime=Math.ceil(demand*SERVICE_ON_TIME_SHARE);
  assert.equal(SERVICE_ON_TIME_SHARE,.75);
  assert.equal(controller.arrivals.filter(a=>a.due<=start).length,onTime);
  assert.ok(controller.arrivals.slice(onTime).every(a=>a.due>start));
  const state=makeState(start);controller.tick(state);
  assert.equal(state.serviceStatus.issued,onTime);
  assert.equal(state.serviceStatus.onTimeCount,onTime);
});
