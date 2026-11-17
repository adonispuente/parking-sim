import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';

const advance=(state,seconds)=>{for(let i=0;i<Math.round(seconds*20);i++)state.step(.05);};
const conserved=totals=>assert.equal(totals.scheduled+totals.waiting+totals.onRoad+totals.reachedParking+totals.turnedAway,totals.demand,'every requested car has exactly one accounting state');

test('a full badge pool keeps badge cars queued without blocking general demand or Equity',()=>{
  const state=createCampusTraffic({badgePercent:5,initialZoneOccupancy:{aBadge:51},
    service:{enabled:true,...serviceOptions('nine',{demand:200,beginMinute:600})}});
  advance(state,600);
  const totals=state.serviceTraffic.nine;
  conserved(totals);
  assert.equal(totals.issued,200);
  assert.ok(totals.entered>170,'general cars continue past waiting badge requests');
  assert.ok(totals.waiting>0,'badge cars retain their requests until authorized parking frees');
  assert.ok(state.arrivalQueues[0].every(request=>request.category==='badge'));
  assert.equal(state.badgeParking,51);
  assert.equal(state.entered[1]+state.entered[2],20);
  assert.equal(state.sentAway,0);
  assert.deepEqual(state.routingIssues,[]);
});

test('Corporate-through requests waiting for B/C do not block general cars from available A spaces',()=>{
  const state=createCampusTraffic({lotSettings:[{id:'b',open:false},{id:'c',open:false}],
    service:{enabled:true,...serviceOptions('nine',{demand:100,beginMinute:600})}});
  advance(state,400);
  conserved(state.serviceTraffic.nine);
  assert.equal(state.occupancy.a,80);
  assert.equal(state.serviceTraffic.nine.waiting,20);
  assert.equal(state.serviceTraffic.nine.turnedAway,0);
  assert.ok(state.arrivalQueues[0].every(request=>request.parkingIntent==='corporate'));
});

test('2300-car 9am demand fills all three lots and accounts for every excess car',()=>{
  const service=serviceOptions('nine',{demand:2300});
  const state=createCampusTraffic({autoContinue:true,badgePercent:5,initialOccupancy:service.initialOccupancy,
    service:{enabled:true,...service},shuttles:{enabled:true,activeCount:3,dispatchMode:'demand',randomDwell:true,dwellSeconds:45}});
  // 10:00: all 9am arrivals have been issued, before early dismissals or handoff.
  advance(state,(600-service.beginMinute)*60);
  const totals=state.serviceTraffic.nine;
  conserved(totals);
  assert.equal(totals.demand,2300);
  assert.equal(totals.issued,2300);
  assert.deepEqual(state.occupancy,{a:411,b:487,c:686});
  assert.equal(totals.entered,1584);
  assert.equal(totals.reachedParking,1584);
  assert.equal(totals.turnedAway,716);
  assert.equal(totals.waiting,0);
  assert.deepEqual(state.waiting,[0,0,0]);
  assert.deepEqual(state.routingIssues,[]);
  // The next service must not erase the 2300-car reconciliation.
  advance(state,5*60+.1);
  assert.equal(state.serviceStatus.id,'eleven');
  assert.equal(state.serviceTraffic.nine.demand,2300);
  assert.equal(state.serviceTraffic.nine.turnedAway,716);
  conserved(state.serviceTraffic.nine);
  conserved(state.serviceTraffic.eleven);
});
