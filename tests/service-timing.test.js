import test from 'node:test';
import assert from 'node:assert/strict';
import { blankZones } from '../src/parkingZones.js';
import {
  createServiceController, serviceOptions, SUNDAY_SERVICES,
  SERVICE_ARRIVAL_TARGET_MINUTES, SERVICE_ARRIVAL_TAIL_MINUTES,
  SERVICE_ARRIVAL_TARGET_SHARE,
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
    assert.equal(controller.arrivals.filter(a=>a.due<=1200).length,10);
    assert.ok(controller.arrivals.slice(10,targetCount).every(a=>a.due>1200));
  }
  // Exactly one of Equity and Corporate applies; neither quota can steal the other.
  assert.equal(controller.arrivals.filter(a=>a.source!==0).length,Math.ceil(demand*.1));
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
  const controller=createServiceController(serviceOptions('eleven',{demand:20,earlyPercent:100}),blankZones());
  assert.equal(controller.arrivals.filter(a=>a.due<=1200).length,19);
  const target=(SUNDAY_SERVICES.eleven.startMinute-SUNDAY_SERVICES.eleven.beginMinute+45)*60;
  assert.equal(controller.arrivals.filter(a=>a.due<=target).length,19);
  assert.ok(controller.arrivals[19].due>target);
});
