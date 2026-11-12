import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions, serviceTimeline, createServiceController } from '../src/sundayServices.js';
import { distributeInitialOccupancy } from '../src/parkingZones.js';
import { createSeekablePlayback } from '../src/playback.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';

const lots=[{id:'a',open:true},{id:'b',open:true},{id:'c',open:true}];

test('outgoing dismissal uses the real preceding cohort and early vacancies keep A closed',()=>{
  assert.equal(serviceTimeline({id:'nine'}).dismissalMinute,615);
  assert.equal(serviceTimeline({id:'eleven'}).dismissalMinute,735);
  assert.equal(serviceTimeline({id:'final'}).dismissalMinute,870);
  for(const [id,beginMinute,dismissal] of [['eleven',605,615],['final',725,735]]) {
    const initial=distributeInitialOccupancy({a:411,b:487,c:686});
    const controller=createServiceController(serviceOptions(id,{demand:0,beginMinute}),initial);
    const state={clock:0,zoneOccupancy:{...initial},reserved:{a:0,b:0,c:0},badgeReserved:0,waiting:[0,0,0]};
    controller.tick(state);
    state.zoneOccupancy.aNorth=30;
    state.clock=300;controller.tick(state);
    assert.equal(state.serviceStatus.gates.a.reason,'until-dismissal');
    assert.equal(state.serviceStatus.previousDismissalMinute,dismissal);
    assert.equal(controller.gated.b,false);assert.equal(controller.gated.c,false);
    state.clock=600;state.reserved.a=6;state.badgeReserved=5;
    controller.tick(state);
    assert.equal(state.serviceStatus.gates.a.generalUsed,181);
    assert.equal(state.serviceStatus.gates.a.reason,'waiting-for-half');
    state.reserved.a=5;controller.tick(state);
    assert.equal(state.serviceStatus.gates.a.reason,'open');
    assert.equal(controller.gated.a,false);
  }
});

test('service latch closes new A assignments but retains an admitted reservation',()=>{
  const state=createCampusTraffic({initialOccupancy:{a:359},badgePercent:0,
    service:{enabled:true,...serviceOptions('nine',{demand:0})}});
  state.waiting[0]=1;state.step(.05,[0,0,0],lots);
  const admitted=state.cars.find(car=>car.phase==='arrival');
  assert.equal(admitted.target,'a');assert.equal(state.reserved.a,1);
  state.step(.05,[0,0,0],lots);
  assert.equal(state.gateStatus.a,true);
  assert.equal(admitted.target,'a','reservation must not be redirected by its own full-lot latch');
  assert.equal(admitted.holdForGate,false);
  state.waiting[0]=1;
  for(let i=0;i<400;i++)state.step(.05,[0,0,0],lots);
  assert.equal(admitted.target,'a');
  assert.ok(state.routeHistory.some(car=>car.target==='b'),'new assignments go to B while A is latched');
  assert.deepEqual(state.routingIssues,[]);
});

test('manual A closure blocks badge admission, service latch alone does not',()=>{
  const state=createCampusTraffic({initialOccupancy:{a:360},badgePercent:100,
    service:{enabled:true,...serviceOptions('eleven',{demand:0})}});
  state.waiting[0]=1;
  state.step(.05,[0,0,0],[{id:'a',open:false},lots[1],lots[2]]);
  assert.equal(state.routeHistory.length,0);
  assert.equal(state.serviceStatus.gates.a.reason,'manual-closure');
  state.step(.05,[0,0,0],lots);
  assert.equal(state.routeHistory[0].zone,'aBadge');
  assert.equal(state.gateStatus.a,true);
});

test('recorded rewind crosses dismissal and rebuild restores the same private A latch',async()=>{
  // Six seconds to dismissal, controlled fixture; not a departure distribution.
  const factory=()=>createCampusTraffic({initialOccupancy:{a:180},lotSettings:[{id:'a',open:false}],
    service:{enabled:true,...serviceOptions('nine',{demand:0,beginMinute:614.9})}});
  const player=createSeekablePlayback(factory,{lots,rates:[0,0,0]},
    {captureFrame:captureTrafficFrame,yieldWork:async()=>{},maxFrames:1000});
  for(let i=0;i<20;i++)player.advance(.1,5);
  const reference=captureTrafficFrame(player.simulation);
  assert.equal(reference.serviceStatus.gates.a.reason,'open');
  assert.equal(reference.gateStatus.a,false);
  player.advance(.1,-30);player.advance(.1,-30);
  assert.equal(player.clock,4);
  assert.equal(player.simulation.serviceStatus.gates.a.reason,'until-dismissal');
  assert.equal(player.simulation.gateStatus.a,true);
  assert.equal(player.seeking,false);
  await player.advance(.1,5);
  for(let i=0;i<12;i++)player.advance(.1,5);
  assert.deepEqual(captureTrafficFrame(player.simulation),reference);
});