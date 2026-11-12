import test from 'node:test';
import assert from 'node:assert/strict';
import { attachAlphaQueueRelief, beforeAlphaDecision, alphaReliefReach, ALPHA_RELIEF_NEAR_MAIN, ALPHA_RELIEF_CAR_PITCH, ALPHA_RELIEF_FILL } from '../src/alphaQueueRelief.js';
import { createCampusTraffic } from '../src/traffic.js';
import { feederReliefRoute } from '../src/parkingRoutes.js';
import { fromWorld } from '../src/clearImageSource.js';

// A real backed-up line: standing cars at the measured 2.6 pitch from Main back,
// long enough to fill ALPHA_RELIEF_FILL of the lane's #59-to-Main stretch.
// (Before the reach slice this packed six cars 0.8 apart, which never models a
// backed-up line on the real 56.7-world stretch.) Returns the car count.
function queue(s, n) {
  const lead=s.cars.find(c=>c.target==='a'&&!c.badgePool);
  assert.ok(lead,'fixture needs one real Alpha lane');
  const lane=s.lanes[lead.lane],control=lane.aControl;
  n??=Math.max(6,Math.ceil(ALPHA_RELIEF_FILL*Math.floor(alphaReliefReach(lane)/ALPHA_RELIEF_CAR_PITCH)));
  for(let i=0;i<n;i++) {
    s.cars.push({...lead,id:10000+i,distance:control.mergeDistance-1.7-i*ALPHA_RELIEF_CAR_PITCH,speed:0});
    s.zoneReserved[lead.zone]++;s.assignments.a++;
  }
  return n;
}
function campus(options={}) {
  const s=createCampusTraffic({feederOfficer:{enabled:false},corporateOperators:{enabled:false},...options});
  s.waiting[0]=1;s.step(0);
  return s;
}
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
test('on-road redirect conserves built pose, ID, cohort and reservations and updates history',()=>{
  const s=campus(),car=s.cars[0],queued=queue(s);
  car.distance=20;
  const old=s.lanes[car.lane],pose=old.path.getPointAt(car.distance/old.length);
  assert.equal(beforeAlphaDecision(fromWorld([pose.x,pose.z])),true);
  const identity={id:car.id,source:car.source,cohort:car.cohort,badge:car.badge};
  const reserved=Object.values(s.zoneReserved).reduce((a,b)=>a+b,0),entered=[...s.entered];
  s.step(0);
  assert.equal(car.target,'b');assert.equal(car.distance,0);
  const start=s.lanes[car.lane].path.getPointAt(0);
  assert.ok(start.distanceTo(pose)<1e-6);
  for(const [key,value] of Object.entries(identity))assert.equal(car[key],value);
  assert.equal(Object.values(s.zoneReserved).reduce((a,b)=>a+b,0),reserved);
  assert.deepEqual(s.entered,entered);assert.equal(s.assignments.a,queued);assert.equal(s.assignments.b,1);
  assert.equal(s.alphaQueueRelief.redirected,1);
  const history=s.routeHistory.find(h=>h.id===car.id);
  assert.equal(history.target,'b');assert.equal(history.redirects[0].target,'a');
  assert.equal(history.redirects[0].reason,'Alpha queue backup');
  s.step(0);assert.equal(s.alphaQueueRelief.redirected,1,'redirect once only');
});
test('new general requests choose Bravo while closed or full Bravo falls back to Alpha',()=>{
  for(const mode of ['open','closed','full']) {
    const s=campus();queue(s);s.cars[0].distance=s.lanes[s.cars[0].lane].aControl.mergeDistance-4;
    if(mode==='full')for(const zone of ['bSouth','bBanana','bPocket','bNorth'])s.closedZones.push(zone);
    s.waiting[0]=1;s.step(0,[0,0,0],[{id:'b',open:mode!=='closed'}]);
    assert.equal(s.routeHistory.at(-1).target,mode==='open'?'b':'a');
    assert.equal(s.alphaQueueRelief.assigned,mode==='open'?1:0);
  }
});
test('permit arrival is not diverted when Alpha is backed up',()=>{
  const s=campus();queue(s);s.cars[0].distance=s.lanes[s.cars[0].lane].aControl.mergeDistance-4;
  s.badgePercent=100;
  // badgePercent is fixed at construction: use a fresh permit-configured campus
  // and transfer only the measured queue, not permission from mutable UI state.
  const p=createCampusTraffic({badgePercent:100});
  p.lanes.push(s.lanes[s.cars[0].lane]);
  const index=p.lanes.length-1;
  p.cars=s.cars.filter(c=>c.id>=10000).map(c=>({...c,lane:index}));
  p.waiting[0]=1;p.step(0);
  assert.equal(p.routeHistory.at(-1).zone,'aBadge');assert.equal(p.alphaQueueRelief.assigned,0);
});test('#59 measures the whole line back to the decision point and trips only when it is backed up',()=>{
  // Eleven-service evidence: 36 cars frozen on aNorth at 2.6 pitch, decision line
  // 56.7 world before Main; the old 12-world window read 4 and never tripped six.
  const s=campus(),lead=s.cars.find(c=>c.target==='a'&&!c.badgePool);
  assert.ok(lead,'fixture needs one real Alpha lane');
  const lane=s.lanes[lead.lane],c=lane.aControl,reach=alphaReliefReach(lane);
  assert.ok(reach>ALPHA_RELIEF_NEAR_MAIN+6*2.6,`decision-to-Main reach ${reach} must hold a six-car line`);
  // Reach ends exactly where the #59 road decision begins on the built lane.
  const at=d=>{const p=lane.path.getPointAt(Math.min(1,d/lane.length));return fromWorld([p.x,p.z]);};
  assert.equal(beforeAlphaDecision(at(c.mergeDistance-reach+.2)),false);
  assert.equal(beforeAlphaDecision(at(c.mergeDistance-reach-.2)),true);
  lead.distance=0;if(c.mergeDistance>reach+1)lead.distance=c.mergeDistance-reach-1; // lead sits short of #59
  const capacity=Math.floor(reach/ALPHA_RELIEF_CAR_PITCH),need=Math.ceil(ALPHA_RELIEF_FILL*capacity);
  assert.ok(need>6,'a single five-car batch plus one is not "that backed up" on the real stretch');
  // Standing line from Main back, at the measured 2.6 pitch (36 such cars logged at eleven).
  const line=Array.from({length:need},(_,i)=>({...lead,id:20000+i,distance:c.mergeDistance-1.7-i*ALPHA_RELIEF_CAR_PITCH}));
  for(const car of line)assert.ok(c.mergeDistance-car.distance<=reach);
  assert.ok(line.filter(car=>c.mergeDistance-car.distance>ALPHA_RELIEF_NEAR_MAIN).length>=need-5,'most of the line lies beyond the old 12-world window');
  s.cars.push(...line.slice(0,6));s.prepareAlphaQueueRelief();
  assert.equal(s.alphaQueueRelief.queued,6,'six in the line, the car short of #59 excluded');
  assert.equal(s.alphaQueueRelief.active,false,'six cars do not divert on the real stretch');
  s.cars.push(...line.slice(6));s.prepareAlphaQueueRelief();
  assert.equal(s.alphaQueueRelief.queued,need);assert.equal(s.alphaQueueRelief.trigger,need);
  assert.equal(s.alphaQueueRelief.active,true,'line filling the stretch toward #59 diverts');
  s.cars=s.cars.filter(car=>car.id<20002);s.prepareAlphaQueueRelief();
  assert.equal(s.alphaQueueRelief.active,false,'returns to Alpha once the line drains to two');
});
