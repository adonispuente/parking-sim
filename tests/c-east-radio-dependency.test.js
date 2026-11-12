// C East (#64) radio must never hold a car that its own release bus is waiting on.
// Regression for the 11AM / C300 / .05-step 10:40 gridlock (SPARTAN 5edd).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachNorthernCorporateControl} from '../src/northernCorporateControl.js';
import {pointAt,WORLD_SCALE} from '../src/clearImageSource.js';

function fixture(){
  const [x,z]=pointAt(64).map(v=>v*WORLD_SCALE);
  const lane=pts=>{const path=new THREE.CurvePath();for(let i=1;i<pts.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i-1]),new THREE.Vector3(...pts[i])));return {path,length:path.getLength()};};
  // lane0 crosses the bus lane (lane1); lane2 is a parallel road that never meets it.
  const s={clock:0,cars:[],lanes:[lane([[x-15,0,z],[x+15,0,z]]),lane([[x,0,z+15],[x,0,z-15]]),lane([[x-15,0,z+12],[x+15,0,z+12]])]};
  attachNorthernCorporateControl(s);return s;
}
const bus=()=>({id:'bus',fleetBus:true,cExitShuttle:true,lane:1,distance:4,bodyLength:2.9,speed:2.5});

test('held car on the release bus blocking chain is released to clear first',()=>{
  const s=fixture(),b=bus();
  const blocker={id:5,phase:'departing',lane:2,distance:5,speed:2.8};
  const held={id:1,phase:'arrival',lane:0,distance:4,speed:2.8};
  b.yieldingTo=5;blocker.yieldingTo=1;
  s.cars=[b,blocker,held];
  s.prepareNorthernCorporateControl();
  assert.equal(held.holdForNorthern,false);
  assert.equal(held.northernStopDistance,undefined);
  assert.deepEqual(s.northernRadio.dependencyReleased,[1]);
  assert.ok(s.northernRadio.clearingIds.includes(1));
  assert.equal(s.northernRadio.heldCars,0);
});

test('conflicting car not on the bus chain stays held (shuttle priority kept)',()=>{
  const s=fixture(),b=bus();
  const onChain={id:1,phase:'arrival',lane:0,distance:4,speed:2.8};
  const other={id:2,phase:'departing',lane:0,distance:1,speed:2.8};
  b.yieldingTo=1;
  s.cars=[b,onChain,other];
  s.prepareNorthernCorporateControl();
  assert.equal(onChain.northernStopDistance,undefined);
  assert.ok(Number.isFinite(other.northernStopDistance));
  assert.equal(s.northernRadio.heldCars,1);
  assert.deepEqual(s.northernRadio.dependencyReleased,[1]);
});

test('no release without a bus dependency, and yield cycles terminate',()=>{
  const s=fixture(),b=bus();
  const a={id:1,phase:'arrival',lane:0,distance:4,speed:2.8,yieldingTo:2};
  const c={id:2,phase:'departing',lane:0,distance:1,speed:2.8,yieldingTo:1};
  s.cars=[b,a,c];
  s.prepareNorthernCorporateControl();
  assert.equal(s.northernRadio.heldCars,2);
  assert.deepEqual(s.northernRadio.dependencyReleased,[]);
  b.yieldingTo=7;const loop={id:7,lane:2,distance:5,yieldingTo:7};s.cars.push(loop);
  s.prepareNorthernCorporateControl();
  assert.deepEqual(s.northernRadio.dependencyReleased,[]);
});
