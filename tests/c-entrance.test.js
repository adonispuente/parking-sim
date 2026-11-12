import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WORLD_SCALE } from '../src/clearImageSource.js';
import { attachCEntranceControl } from '../src/cEntranceControl.js';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';
import { attachWideAisles } from '../src/wideAisles.js';
const lane=points=>{const path=new THREE.CurvePath();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1][0]*WORLD_SCALE,.6,points[i-1][1]*WORLD_SCALE),new THREE.Vector3(points[i][0]*WORLD_SCALE,.6,points[i][1]*WORLD_SCALE)));return {path,length:path.getLength()};};
const fixture=()=>({clock:0,lanes:[lane([[1070,60],[995,60],[982,90],[982,150]]),lane([[885,86],[1055,86]]),lane([[885,68],[982,68],[976,150]])],cars:[
  {id:'bus',lane:0,phase:'shuttle',fleetBus:true,bodyLength:2.9,distance:0,speed:2.5},
  {id:'exit',lane:1,phase:'departing',distance:0,speed:2.8},
  {id:'entry',lane:2,phase:'arrival',distance:0,speed:2.8},
]});
test('C entrance reserves an approaching shuttle turn before either car stream enters',()=>{
  const s=fixture();attachCEntranceControl(s);s.prepareCEntranceControl();
  assert.ok(s.cEntrance.admitted.includes('bus'));
  for(const c of s.cars.filter(c=>!c.fleetBus))assert.ok(Number.isFinite(c.cEntranceStopDistance));
  for(let i=0;i<160;i++){s.clock+=.1;s.prepareCEntranceControl();advanceSharedTraffic(s,.1);}
  assert.ok(s.cars[0].distance>8,'bus clears its turn');
  assert.ok(s.cars.slice(1).every(c=>c.distance>5),'car queues resume after the turn');
});
test('an occupied C entrance clears before a newly approaching bus',()=>{
  const s=fixture();s.cars[1].distance=6;attachCEntranceControl(s);s.prepareCEntranceControl();
  assert.ok(s.cEntrance.admitted.includes('exit'));
  assert.equal(s.cars[1].cEntranceStopDistance,undefined,'occupied car keeps clearing');
});
test('the wide-aisle escape applies to the C entrance, not unrelated Corporate stretches',()=>{
  const s={lanes:[lane([[975,76],[1000,76]]),lane([[600,540],[650,540]])],cars:[]};
  attachWideAisles(s);
  const bus={lane:0,distance:0,fleetBus:true},car={lane:0,distance:0};
  assert.equal(s.canPullAroundInWideAisle(bus,car),true);
  assert.equal(s.canPullAroundInWideAisle(car,bus),false);
  assert.equal(s.inWideAisle({lane:1,distance:0}),false);
});

test('entrance marshal does not add a second stop before the roundabout exit stream',()=>{
  const s={clock:0,lanes:[lane([[1080,60],[995,60],[982,90],[982,150]]),lane([[960,240],[984,184],[995,120],[995,45]])],cars:[
    {id:'bus',lane:0,phase:'shuttle',fleetBus:true,bodyLength:2.9,distance:0,speed:2.5},
    {id:'exit',lane:1,phase:'departing',target:'c',distance:0,speed:2.8},
  ]};
  attachCEntranceControl(s);s.prepareCEntranceControl();
  assert.equal(s.cars[1].cEntranceStopDistance,undefined);
  assert.ok(s.cEntrance.clearing.includes('exit'));
});
