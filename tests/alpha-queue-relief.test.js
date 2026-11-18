import test from 'node:test';
import assert from 'node:assert/strict';
import { attachAlphaQueueRelief, beforeAlphaDecision } from '../src/alphaQueueRelief.js';
import { feederReliefRoute } from '../src/routes/parkingRoutes.js';

test('six/two hysteresis retains diversion through middle band and can be disabled',()=>{
  const s={clock:0,lanes:[{aControl:{mergeDistance:15}}],cars:[]};
  attachAlphaQueueRelief(s);
  s.cars=Array.from({length:6},()=>({phase:'arrival',target:'a',lane:0,distance:8}));
  s.prepareAlphaQueueRelief();assert.equal(s.alphaQueueRelief.active,true);
  s.cars.length=4;s.prepareAlphaQueueRelief();assert.equal(s.alphaQueueRelief.active,true);
  s.cars.length=2;s.prepareAlphaQueueRelief();assert.equal(s.alphaQueueRelief.active,false);
  assert.equal(s.alphaQueueRelief.transitions.length,2);
  attachAlphaQueueRelief(s,{enabled:false});s.cars.length=6;
  s.prepareAlphaQueueRelief();assert.equal(s.alphaQueueRelief.active,false);
});
test('only pre-Main general cars count; road decision excludes cars past #59',()=>{
  const s={clock:0,lanes:[{aControl:{mergeDistance:15}}],cars:[]};attachAlphaQueueRelief(s);
  const car={phase:'arrival',target:'a',lane:0,distance:8};
  s.cars=[{...car,badgePool:true},{...car,fleetBus:true},{...car,aMergePassed:true},
    {...car,phase:'parked'},{...car,distance:16},car];
  s.prepareAlphaQueueRelief();assert.equal(s.alphaQueueRelief.queued,1);
  assert.equal(beforeAlphaDecision([25,650]),true);
  assert.equal(beforeAlphaDecision([25,450]),false);
  assert.equal(beforeAlphaDecision([200,650]),false);
});
test('Bravo diversion route starts at pose and never reverses along Feeder',()=>{
  const current=[25,650],route=feederReliefRoute(current,'bWest','bSouth');
  assert.deepEqual(route[0],current);
  for(let i=1;i<route.length;i++)if(route[i-1][0]<52&&route[i][0]<52)
    assert.ok(route[i][1]<=route[i-1][1]+.001);
  assert.throws(()=>feederReliefRoute(current,'eB','bSouth'));
});
