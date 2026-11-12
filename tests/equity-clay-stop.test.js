import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachEquityClayStop,EQUITY_CLAY_STOP_POSITION,alignClayApproach,EQUITY_CLAY_MAX_WAIT_S,compareEquityStopQueue} from '../src/equityClayStop.js';
import {WORLD_SCALE} from '../src/clearImageSource.js';
import {advanceSharedTraffic} from '../src/sharedTraffic.js';
function fixture(){const [x,z]=EQUITY_CLAY_STOP_POSITION.map(v=>v*WORLD_SCALE);const line=(a,b)=>{const path=new THREE.LineCurve3(new THREE.Vector3(...a),new THREE.Vector3(...b));return {path,length:path.getLength()};};const s={clock:0,cars:[],lanes:[line([x-15,0,z],[x+15,0,z]),line([x+15,0,z],[x-15,0,z]),line([x,0,z+15],[x,0,z-15])]};attachEquityClayStop(s);return s;}
test('three-way stop halts all cars, then releases a single priority departure and clears before next',()=>{
 const s=fixture();s.cars=[{id:1,phase:'arrival',lane:0,distance:10,speed:2.8},{id:2,phase:'departing',lane:2,distance:10,speed:2.8}];
 s.prepareEquityClayStop();assert.equal(s.equityClayStop.admittedId,null);assert.ok(s.cars.every(c=>c.holdForEquityStop));
 s.clock=1;s.prepareEquityClayStop();assert.equal(s.equityClayStop.admittedId,2);assert.equal(s.cars[0].holdForEquityStop,true);
 for(let i=0;i<120;i++){s.clock+=.05;s.prepareEquityClayStop();advanceSharedTraffic(s,.05);s.observeEquityClayStop();}
 assert.ok(s.equityClayStop.cleared>=1);assert.ok(s.cars[0].distance>10,'second side eventually released');
});
test('Clay approach is separated into two travel-right lanes without changing source coordinates',()=>{
 const [x,y]=EQUITY_CLAY_STOP_POSITION,source=[[x,y+10],[x,y+30],[x,y+50]];
 const a=alignClayApproach(source,source),b=alignClayApproach([...source].reverse(),[...source].reverse());
 assert.ok(a[1][0]<x&&b[1][0]>x);assert.ok(Math.abs(a[1][0]-b[1][0])>=24);assert.equal(source[1][0],x);
});
// Bounded-wait fairness (2026-11-08). An occupant blocks admission while the
// arrival waits; when it leaves, the queue holds the long-waiting arrival and a
// fresh departure. Class priority alone would pick the departure every time.
function starvationCase(arrivalStoppedAt){
 const s=fixture();
 const arrival={id:1,phase:'arrival',lane:0,distance:10,speed:0};
 const occupant={id:3,phase:'departing',lane:1,distance:15,speed:0};
 s.clock=arrivalStoppedAt;s.cars=[arrival,occupant];s.prepareEquityClayStop();
 s.clock=24;s.cars.push({id:2,phase:'departing',lane:2,distance:10,speed:0});s.prepareEquityClayStop();
 assert.equal(s.equityClayStop.admittedId,null,'occupied intersection blocks admission');
 s.clock=25;s.cars=s.cars.filter(c=>c!==occupant);s.prepareEquityClayStop();
 return s;
}
test(`arrival stopped >= ${EQUITY_CLAY_MAX_WAIT_S} s is served before a fresh departure`,()=>{
 const s=starvationCase(0);
 assert.equal(s.equityClayStop.admittedId,1);
 assert.equal(s.cars.find(c=>c.id===2).holdForEquityStop,true);
});
test('below the bounded wait, departures keep their class priority',()=>{
 const s=starvationCase(20);
 assert.equal(s.equityClayStop.admittedId,2);
});
test('overdue cars are served oldest first; otherwise class then stop time',()=>{
 const at={1:0,2:5,3:30,4:31};const t=c=>at[c.id];
 const arrA={id:1,phase:'arrival'},arrB={id:2,phase:'arrival'},depA={id:3,phase:'departing'},depB={id:4,phase:'departing'};
 assert.ok(compareEquityStopQueue(arrA,arrB,40,t)<0,'both overdue: older first');
 assert.ok(compareEquityStopQueue(depA,arrA,40,t)>0,'overdue arrival beats fresh departure');
 assert.ok(compareEquityStopQueue(depA,arrA,10,t)<0,'nobody overdue: departure first');
});
test('an approaching shuttle still preempts an overdue car',()=>{
 const s=fixture();
 s.cars=[{id:1,phase:'arrival',lane:0,distance:10,speed:0},{id:9,shuttle:true,lane:2,distance:10,speed:0}];
 s.prepareEquityClayStop();s.clock=30;s.cars[1].distance=10;s.prepareEquityClayStop();
 assert.equal(s.equityClayStop.admittedId,9);
});
// Wording/behaviour reconciliation (2026-11-08, eleven car 1019). The threshold
// reorders the ready queue; it does not cap waits. Promoting one overdue
// arrival can push a second, not-yet-overdue arrival behind a fresh departure.
test('promoting an overdue arrival can delay a later arrival behind a departure (1019 pattern)',()=>{
 const at={1029:0,1019:7.5,871:21};const t=c=>at[c.id];
 const a1029={id:1029,phase:'arrival'},a1019={id:1019,phase:'arrival'},d871={id:871,phase:'departing'};
 const order=clock=>[a1019,d871,a1029].sort((a,b)=>compareEquityStopQueue(a,b,clock,t)).map(c=>c.id);
 assert.deepEqual(order(22),[1029,871,1019],'1029 overdue first; 1019 (14.5 s) still ranks after the departure');
 assert.deepEqual(order(28),[1029,1019,871],'once 1019 is overdue too it ranks ahead of the departure, behind the older 1029');
});
test('registry describes the threshold as a priority boost, not a maximum wait',async()=>{
 const {CONTROL_POINTS}=await import('../src/positions/index.js');
 const stop=CONTROL_POINTS.find(p=>p.id==='equityClayStop');
 assert.match(stop.implemented,/not a maximum wait/);
 assert.doesNotMatch(stop.implemented,/goes next/);
 assert.ok(stop.provisional.some(p=>/not a wait ceiling/.test(p)));
 assert.ok(!stop.provisional.some(p=>/bounded wait/.test(p)));
});
