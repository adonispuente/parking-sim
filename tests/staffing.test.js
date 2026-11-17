import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCampusTraffic } from '../src/traffic.js';
import { POSITIONS, C_HUB_POSITIONS } from '../src/positions/index.js';
import { attachLotAControl } from '../src/lotAControl.js';
import { attachBlackPermitControl } from '../src/blackPermitControl.js';
import { attachNorthernCorporateControl } from '../src/northernCorporateControl.js';
import { pointAt, WORLD_SCALE } from '../src/clearImageSource.js';
import { serviceOptions } from '../src/sundayServices.js';
import { serviceCarryOptions } from '../src/serviceCarry.js';
import { createSeekablePlayback } from '../src/playback.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';

const allOff=Object.fromEntries([...POSITIONS,...C_HUB_POSITIONS].map(p=>[p.id,false]));
const lane=points=>{const path=new THREE.CurvePath();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i-1]),new THREE.Vector3(...points[i])));return {path,length:path.getLength()};};

test('staffing defaults on and each position independently disables its own controls',()=>{
  const defaults=createCampusTraffic();
  assert.equal(defaults.aMainControl.enabled,true);
  assert.equal(defaults.parkingRadio.positions.length,9);
  for(const id of Object.keys(allOff)) {
    const s=createCampusTraffic({staffing:{[id]:false}});
    assert.equal(s.parkingRadio.positions.some(p=>p.id===id),false,id);
    assert.equal(s.parkingRadio.positions.length,8,id);
    for(const [position,status] of [['aMain','aMainControl'],['aExitOfficer','feederOfficer'],['corporateOfficer','corporateExitJunction'],['permitOfficer','blackPermitControl'],['cEntrance','cEntrance'],['cRoundabout','cRoundabout']])
      assert.equal(s[status].enabled,position!==id,`${id}: ${status}`);
    assert.equal(s.alphaQueueRelief.enabled,id!=='corporateOfficer');
  }
});

test('removing Main eliminates staffed batching on the same physical approaches',()=>{
  const make=staffed=>{
    const s={staffing:{aMain:staffed},cars:[],lanes:['aNorth','aSouth','aMain'].map(approach=>({length:12,aControl:{approach,stopDistance:4,releaseDistance:9}}))};
    attachLotAControl(s);
    s.cars=s.lanes.map((_,i)=>({id:i,lane:i,distance:4,phase:i===2?'arrival':'departing'}));
    s.prepareLotAControl();return s;
  };
  assert.equal(make(true).cars.filter(c=>c.controlStopDistance!==undefined).length,2);
  const unstaffed=make(false);
  assert.ok(unstaffed.cars.every(c=>c.controlStopDistance===undefined&&!c.holdForBatch));
  assert.equal(unstaffed.aMainControl.admittedId,null);
});

test('Black Permit removal releases advance marshal holds while keeping the bus and road',()=>{
  const make=staffed=>{
    const [x,z]=pointAt(60).map(v=>v*WORLD_SCALE);
    const s={staffing:{permitOfficer:staffed},lanes:[lane([[x-12,0,z+2],[x+12,0,z+2]]),lane([[x,0,z-12],[x,0,z],[x+12,0,z+2]])],cars:[]};
    attachBlackPermitControl(s);
    s.cars=[{id:1,phase:'arrival',lane:0,distance:4},{id:'bus',fleetBus:true,lane:1,distance:7,bodyLength:2.9}];
    s.prepareBlackPermitControl();return s;
  };
  assert.ok(Number.isFinite(make(true).cars[0].permitStopDistance));
  const unstaffed=make(false);
  assert.equal(unstaffed.cars[0].permitStopDistance,undefined);
  assert.equal(unstaffed.cars.length,2);
});

test('C exit removal stops radio holds and B exit removal stops backup diversions independently',()=>{
  const make=staffing=>{
    const [x,z]=pointAt(64).map(v=>v*WORLD_SCALE);
    const s={staffing,clock:0,lanes:[lane([[x-15,0,z],[x+15,0,z]]),lane([[x,0,z+15],[x,0,z-15]])],cars:[]};
    attachNorthernCorporateControl(s);
    s.cars=[{id:1,phase:'arrival',lane:0,distance:4},{id:'bus',fleetBus:true,cExitShuttle:true,lane:1,distance:4,bodyLength:2.9}];
    s.prepareNorthernCorporateControl();return s;
  };
  assert.ok(Number.isFinite(make({}).cars[0].northernStopDistance));
  const noExit=make({cExit:false});
  assert.equal(noExit.cars[0].northernStopDistance,undefined);
  for(const staffed of [true,false]) {
    const s=make({bExit:staffed});s.northernRadio.clayBackedUp=true;
    assert.equal(s.northernDepartureAccess({target:'b',zone:'bNorth'},'bNorth'),staffed?'bWest':'bNorth');
  }
});

test('all positions can be unstaffed while the permanent Equity / Clay stop remains active',()=>{
  const s=createCampusTraffic({staffing:allOff,initialZoneOccupancy:{aNorth:1,bNorth:1,cFirstNorth:1}});
  for(let i=0;i<20;i++)s.step(.1,[12,12,12]);
  assert.equal(s.parkingRadio.positions.length,0);
  assert.deepEqual(s.routingIssues,[]);
  for(const c of s.cars)for(const key of ['controlStopDistance','feederStopDistance','corporateJunctionStopDistance','permitStopDistance','northernStopDistance','cEntranceStopDistance','cRoundaboutStopDistance'])assert.equal(c[key],undefined,key);
  assert.equal(typeof s.prepareEquityClayStop,'function');
  assert.ok(s.equityClayStop);
});

test('staffing survives carry and deterministic playback reconstruction',async()=>{
  const options={staffing:{aMain:false,cExit:false},service:{enabled:true,...serviceOptions('nine',{demand:0,beginMinute:600})}};
  const first=createCampusTraffic(options);
  const patch=serviceCarryOptions(options,{...first,active:0},'eleven');
  const next=createCampusTraffic({...options,...patch});
  assert.equal(next.aMainControl.enabled,false);
  assert.equal(next.parkingRadio.positions.some(p=>p.id==='cExit'),false);
  const p=createSeekablePlayback(()=>createCampusTraffic(options),{}, {captureFrame:captureTrafficFrame,yieldWork:async()=>{}});
  p.advance(.1,5);
  const expected=captureTrafficFrame(p.simulation);
  await p.seek(.5);
  assert.deepEqual(captureTrafficFrame(p.simulation),expected);
});
