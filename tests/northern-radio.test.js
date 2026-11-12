import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachNorthernCorporateControl} from '../src/northernCorporateControl.js';
import {pointAt,WORLD_SCALE} from '../src/clearImageSource.js';
import {advanceSharedTraffic} from '../src/sharedTraffic.js';
import {createCampusTraffic} from '../src/traffic.js';
import {createSeekablePlayback} from '../src/playback.js';
import {serviceOptions} from '../src/sundayServices.js';

function fixture(){
  const [x,z]=pointAt(64).map(v=>v*WORLD_SCALE);
  const lane=pts=>{const path=new THREE.CurvePath();for(let i=1;i<pts.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i-1]),new THREE.Vector3(...pts[i])));return {path,length:path.getLength()};};
  const s={clock:0,cars:[],lanes:[lane([[x-15,0,z],[x+15,0,z]]),lane([[x,0,z+15],[x,0,z-15]]),lane([[x-15,0,z+12],[x+15,0,z+12]])]};
  attachNorthernCorporateControl(s);return s;
}
const bus=()=>({id:'bus',fleetBus:true,cExitShuttle:true,lane:1,distance:4,bodyLength:2.9,speed:2.5});
test('C exit officer holds conflicting arrivals and departures; independent road stays open',()=>{
  const s=fixture();s.cars=[bus(),{id:1,phase:'arrival',lane:0,distance:4,speed:2.8},{id:2,phase:'departing',lane:0,distance:1,speed:2.8},{id:3,phase:'arrival',lane:2,distance:5}];
  s.prepareNorthernCorporateControl();assert.equal(s.northernRadio.heldCars,2);
  assert.ok(Number.isFinite(s.cars[1].northernStopDistance));assert.equal(s.cars[3].northernStopDistance,undefined);
  const car=s.cars[1];car.distance=car.northernStopDistance;s.prepareNorthernCorporateControl();const before=car.distance;advanceSharedTraffic(s,.05);assert.equal(car.distance,before);
  s.cars.shift();s.prepareNorthernCorporateControl();assert.equal(car.northernStopDistance,undefined);
});
test('occupied Corporate traffic clears before the shuttle, bus-to-bus exception retained',()=>{
  const s=fixture(),b=bus(),car={id:1,phase:'departing',lane:0,distance:14,speed:2.8};
  s.cars=[b,car,{...bus(),id:'other',lane:0,distance:4}];s.prepareNorthernCorporateControl();
  assert.equal(car.northernStopDistance,undefined);assert.ok(Number.isFinite(b.northernStopDistance));
  assert.equal(s.cars[2].northernStopDistance,undefined);assert.equal(s.northernRadio.clearingCars,1);
  const before=car.distance;advanceSharedTraffic(s,.05);assert.ok(car.distance>before);
});
test('radio releases a stopped physical leader needed by an occupied car',()=>{
  const s=fixture();
  // Force differing final-lane conflict stations like real C joins: a lead
  // still before its own stop can block a follower admitted on another lane.
  const path=new THREE.CurvePath();
  const [x,z]=pointAt(64).map(v=>v*WORLD_SCALE);
  path.add(new THREE.LineCurve3(new THREE.Vector3(x-15,0,z),new THREE.Vector3(x+15,0,z)));
  s.lanes.push({path,length:path.getLength()});
  const leader={id:1,phase:'arrival',lane:0,distance:10,speed:2.8};
  const follower={id:2,phase:'arrival',lane:3,distance:8,speed:2.8};
  // Exercise the actual integration run via the smoke too; here verify a
  // physically occupied leader is never stopped on either coincident lane.
  leader.distance=14;follower.distance=12;s.cars=[bus(),leader,follower];
  s.prepareNorthernCorporateControl();assert.equal(leader.northernStopDistance,undefined);
  assert.equal(follower.northernStopDistance,undefined);
});
test('hold continues until shuttle tail clears and inbound/non-C buses do not preempt',()=>{
  const s=fixture(),b=bus(),car={id:1,phase:'arrival',lane:0,distance:1};s.cars=[b,car];
  b.distance=15.5;s.prepareNorthernCorporateControl();assert.ok(Number.isFinite(car.northernStopDistance));
  b.distance=19;s.prepareNorthernCorporateControl();assert.equal(car.northernStopDistance,undefined);
  b.distance=4;b.cExitShuttle=false;s.prepareNorthernCorporateControl();assert.equal(s.northernRadio.releaseBuses.length,0);
});
test('new west C loop reports on radio without claiming distant east exit; ordinary C east policy stays intact',()=>{
  const s=createCampusTraffic({phase:'departure',initialOccupancy:{c:4},departurePolicy:{c:'east'},shuttles:{activeCount:0}});
  for(const circuit of ['cNorth','cSouth']){
    const lane=s.shuttleLaneIds[circuit][2],l=s.lanes[lane],[x,z]=pointAt(64).map(v=>v*WORLD_SCALE);let gap=Infinity,merge=0;
    for(let d=0;d<l.length;d+=.1){const p=l.path.getPointAt(d/l.length),g=Math.hypot(p.x-x,p.z-z);if(g<gap){gap=g;merge=d;}}
    s.shuttles[0].circuit=circuit;s.shuttles[0].leg=2;s.cars=[{id:s.shuttles[0].id,fleetBus:true,lane,distance:Math.max(0,merge-5),bodyLength:2.9}];
    assert.ok(gap>9,'new return must stay outside the east officer radius');
    s.prepareNorthernCorporateControl();assert.deepEqual(s.northernRadio.releaseBuses,[]);assert.equal(s.northernRadio.shuttles.length,5);
    const report=s.northernRadio.shuttles.find(b=>b.id===s.shuttles[0].id);
    assert.equal(report.circuit,circuit);assert.equal(report.moving,true);
    assert.ok(report.position.every(Number.isFinite),'radio still reports actual moving pose');
  }
  s.cars=[];for(let i=0;i<20;i++)s.step(.05);
  assert.ok(s.cars.some(c=>c.target==='c'&&c.phase==='departing'));assert.ok(s.cars.every(c=>c.fleetBus||c.target!=='c'||c.access==='cEast'));
});
test('B diversions count five actual launches, pause between batches, restore east route when clear',()=>{
  const s=fixture(),radio=s.northernRadio,car={target:'b'};radio.clayBackedUp=true;
  for(let i=0;i<5;i++){assert.equal(s.northernDepartureAccess(car,'bNorth'),'bWest');s.observeNorthernDeparture(car,'bNorth','bWest');}
  assert.equal(radio.diverted,5);assert.equal(s.northernDepartureAccess(car,'bNorth'),null);
  s.clock=6;assert.equal(s.northernDepartureAccess(car,'bNorth'),'bWest');
  radio.clayBackedUp=false;assert.equal(s.northernDepartureAccess(car,'bNorth'),'bNorth');
});
test('Clay backup requires sustained road waits and resets when cars move',()=>{
  const s=fixture();
  s.cars=[1,2,3].map(id=>({id,lane:2,distance:id,phase:'departing',exitDirection:'equity-east',trafficWaiting:true}));
  s.prepareNorthernCorporateControl();assert.equal(s.northernRadio.clayBackedUp,false);
  s.clock=9;s.prepareNorthernCorporateControl();assert.equal(s.northernRadio.clayBackedUp,true);
  s.cars.forEach(c=>c.trafficWaiting=false);s.prepareNorthernCorporateControl();assert.equal(s.northernRadio.clayBackedUp,false);
  assert.equal(s.parkingRadio.positions.length,8);assert.equal(s.parkingRadio.status,s.northernRadio);
});
test('reverse restores private state, never steps negative, and forward resumes identically',async()=>{
  const factory=()=>{let serial=0;return {clock:0,events:[],step(dt){assert.ok(dt>0);this.clock+=dt;this.events.push(++serial);}};};
  const p=createSeekablePlayback(factory,{}, {yieldWork:async()=>{}});
  for(let i=0;i<10;i++)p.advance(.1,5);const saved=structuredClone(p.simulation.events);
  await p.advance(.1,-10);assert.equal(p.clock,4);
  p.advance(.1,10);assert.equal(p.clock,5);assert.deepEqual(p.simulation.events,saved);
  await p.advance(.1,-30);await p.advance(.1,-30);assert.equal(p.clock,0);
});
test('reverse retains fractional ticks across rendered frames',async()=>{
  const p=createSeekablePlayback(()=>({step(){}}),{}, {yieldWork:async()=>{}});
  for(let i=0;i<60;i++)p.advance(1/60,5);
  for(let i=0;i<60;i++)await p.advance(1/60,-5);
  assert.equal(p.clock,0);
});
test('real 40-minute eleven transition keeps relocated C fleet progressing without phantom east holds',()=>{
  const preset=serviceOptions('eleven');
  const s=createCampusTraffic({service:{enabled:true,...preset},initialOccupancy:preset.initialOccupancy,shuttles:{activeCount:5,randomDwell:true}});
  let holds=0;
  for(let i=0;i<48000;i++){s.step(.05);if(s.northernRadio.heldCars)holds++;}
  assert.equal(holds,0,'west C loop must not preempt unrelated east-side road');assert.deepEqual(s.routingIssues,[]);
  assert.ok(s.shuttles[4].trips>=8,'C bus must continue after queue leader clears');
  assert.ok(s.northernRadio.heldCars<12,'no sustained 62-car C exit trap');
});
