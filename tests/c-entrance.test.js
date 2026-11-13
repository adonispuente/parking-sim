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

test('C apron pull-around clears the captured Easter following cycle across route lanes',()=>{
  // Local route windows from the 11:05 freeze: shuttle-2 -> 1589 -> 383 ->
  // 1112 -> shuttle-2. Stations are relative to these trimmed route windows.
  const paths=[
    [[1004.006852041,80.746867234],[1004.944608162,74.597061286],[1001.88786279,68.890748949],[986.568173072,54.55102574],[918.534452679,52.501129663]],
    [[1006.356618082,55.147263247],[983.157874795,54.448271444],[966.757602674,62.420085759],[969.274913984,71.44697124],[976.069979646,78.245600745],[976.307162533,77.437954675],[978.764228582,86.575789718],[980.112177511,89.822070478],[977.352215745,115.759494216]],
    [[954.613471343,77.599103508],[1016.648422055,79.468253121],[1020.535509728,79.564574499],[1024.546874606,79.653079262],[1028.441913024,79.737088637],[1057.482758144,80.362884983]],
    [[995.709179949,113.800535228],[996.233747478,90.521739757],[997.958832654,87.595958015],[1001.780560019,85.999914847],[1005.358649673,84.250640236],[1005.112074967,78.6803307],[1005.892125901,76.783695613],[1008.971994076,79.236957824],[1019.09780187,79.533638136],[1023.023677699,79.620331984],[1064.654549507,80.517428724]],
  ];
  const run=allowPullAround=>{
    const s={lanes:paths.map(lane),cars:[
      {id:'shuttle-2',lane:0,distance:2.5,speed:2.5,phase:'shuttle',fleetBus:true,bodyLength:2.9},
      {id:1589,lane:1,distance:2.5,speed:2.87454082317563,phase:'arrival'},
      {id:383,lane:2,distance:2.5,speed:2.663455365057962,phase:'departing'},
      {id:1112,lane:3,distance:2.5,speed:3.0275865191330014,phase:'departing'},
    ]};
    attachWideAisles(s);
    if(!allowPullAround)s.canPullAroundInWideAisle=()=>false;
    for(let i=0;i<200;i++) {
      advanceSharedTraffic(s,.05);
      s.cars=s.cars.filter(c=>c.distance<s.lanes[c.lane].length);
    }
    return s.cars.length;
  };
  assert.equal(run(false),4,'captured queue stays locked without the local apron maneuver');
  assert.equal(run(true),0,'all four vehicles clear when the shuttle can pull around');
});
