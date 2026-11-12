import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachBlackPermitControl,PERMIT_WARNING} from '../src/blackPermitControl.js';
import {pointAt,WORLD_SCALE} from '../src/clearImageSource.js';
import {advanceSharedTraffic} from '../src/sharedTraffic.js';
import {createCampusTraffic} from '../src/traffic.js';
import {attachWideAisles} from '../src/wideAisles.js';
function fixture(){
  const [x,z]=pointAt(60).map(v=>v*WORLD_SCALE);
  const lane=pts=>{const path=new THREE.CurvePath();for(let i=1;i<pts.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i-1]),new THREE.Vector3(...pts[i])));return {path,length:path.getLength()};};
  // 0: eastbound Corporate, 1: outbound bus from the Black Permit driveway (north side),
  // 2: westbound Corporate, nearer the driveway, so the bus crosses it first (as on the real map: bus z rises through P60).
  const s={lanes:[lane([[x-12,0,z+2],[x+12,0,z+2]]),lane([[x,0,z-12],[x,0,z],[x+12,0,z+2]]),lane([[x+12,0,z+1.2],[x-12,0,z+1.2]])],cars:[]};
  attachBlackPermitControl(s);return s;
}
test('Black Permit holds feeder through-arrivals for outbound shuttle then immediately releases',()=>{
  const s=fixture(),car={id:1,phase:'arrival',source:0,lane:0,distance:8,speed:2.8},bus={id:'bus',fleetBus:true,lane:1,distance:7,speed:2.5,bodyLength:2.9};
  s.cars=[car,bus];s.prepareBlackPermitControl();
  assert.equal(s.blackPermitControl.waitingBuses,1);assert.ok(Number.isFinite(car.permitStopDistance));
  car.distance=car.permitStopDistance;s.prepareBlackPermitControl();advanceSharedTraffic(s,.05);
  assert.ok(car.distance<=car.permitStopDistance+1e-8);
  assert.equal(bus.permitStopDistance,undefined);
  s.cars=[car];s.prepareBlackPermitControl();assert.equal(car.permitStopDistance,undefined);
});
// Commander rule (2026-11-09): the officer stops BOTH sides of Corporate in time for the bus.
test('Black Permit stops both directions, including departures, before they enter the bus crossing',()=>{
  const s=fixture(),east={id:1,phase:'arrival',source:0,lane:0,distance:4},west={id:2,phase:'departing',lane:2,distance:1},bus={id:'bus',fleetBus:true,lane:1,distance:7,bodyLength:2.9};
  s.cars=[east,west,bus];s.prepareBlackPermitControl();
  assert.ok(Number.isFinite(east.permitStopDistance),'eastbound arrival gets a stop line');
  assert.ok(Number.isFinite(west.permitStopDistance),'westbound departure gets a stop line');
  for(const car of [east,west])car.distance=car.permitStopDistance;
  s.prepareBlackPermitControl();
  assert.ok(east.holdForPermit&&west.holdForPermit);
  assert.equal(s.blackPermitControl.heldArrivals,1);assert.equal(s.blackPermitControl.heldDepartures,1);
  assert.equal(s.blackPermitControl.reason,'stop both directions · release shuttle');
});
test('cars already inside the bus crossing keep going and clear it',()=>{
  const s=fixture(),bus={id:'bus',fleetBus:true,lane:1,distance:7,bodyLength:2.9};
  const probe={id:1,phase:'arrival',source:0,lane:0,distance:0};s.cars=[probe,bus];s.prepareBlackPermitControl();
  const inside={id:2,phase:'arrival',source:0,lane:0,distance:probe.permitStopDistance+2};
  s.cars=[inside,bus];s.prepareBlackPermitControl();
  assert.equal(inside.permitStopDistance,undefined);assert.equal(inside.holdForPermit,false);
});
test('the hold starts while the bus is still approaching, not only at the merge',()=>{
  const s=fixture(),car={id:1,phase:'arrival',source:0,lane:0,distance:2};
  const far={id:'bus',fleetBus:true,lane:1,distance:12-PERMIT_WARNING-1,bodyLength:2.9};
  s.cars=[car,far];s.prepareBlackPermitControl();assert.equal(s.blackPermitControl.waitingBuses,0);
  far.distance=12-PERMIT_WARNING+1;s.prepareBlackPermitControl();
  assert.equal(s.blackPermitControl.waitingBuses,1);assert.ok(PERMIT_WARNING>6);
});
test('actual outbound B and C shuttle lanes trigger the Black Permit operator',()=>{
  const s=createCampusTraffic({shuttles:{activeCount:0}});
  const [x,z]=pointAt(60).map(v=>v*WORLD_SCALE);
  for(const name of ['Shuttle · b · leg 1 → bSouth','Shuttle · cNorth · leg 1 → cRoundabout']){
    const lane=s.lanes.findIndex(l=>l.name===name),l=s.lanes[lane];let best=Infinity,merge=0;
    for(let d=0;d<=l.length;d+=.1){const p=l.path.getPointAt(d/l.length),gap=Math.hypot(p.x-x,p.z-z);if(gap<best){best=gap;merge=d;}}
    s.cars=[{id:'bus',fleetBus:true,lane,distance:merge-4,bodyLength:2.9}];
    s.prepareBlackPermitControl();assert.equal(s.blackPermitControl.waitingBuses,1,name);
  }
});
// Commander rule (2026-11-09): Lot C aisles fit ~5 car widths; cars there can steer around each other.
test('wide-aisle check covers Lot C ground only',()=>{
  const lane=(px)=>{const [x,z]=px.map(v=>v*WORLD_SCALE),path=new THREE.CurvePath();path.add(new THREE.LineCurve3(new THREE.Vector3(x,0,z),new THREE.Vector3(x+.01,0,z)));return {path,length:path.getLength()};};
  const s={lanes:[lane([962,224]),lane(pointAt(60))],cars:[]};attachWideAisles(s);
  assert.equal(s.inWideAisle({lane:0,distance:0}),true,'cWest arrival aisle inside Lot C');
  assert.equal(s.inWideAisle({lane:1,distance:0}),false,'Corporate Drive at Black Permit');
});
