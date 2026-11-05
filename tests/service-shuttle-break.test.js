import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { attachShuttles, serviceShuttleBreak } from '../src/shuttles.js';
import { SUNDAY_SERVICES } from '../src/sundayServices.js';

const lane=points=>{
  const path=new THREE.CurvePath();
  for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1][0],0,points[i-1][1]),new THREE.Vector3(points[i][0],0,points[i][1])));
  return {path,length:path.getLength()};
};
const live=[{id:'a',open:true,capacity:411},{id:'b',open:true,capacity:487},{id:'c',open:true,capacity:686}];

test('all service breaks use actual service +45 to +55, not scenario elapsed45',()=>{
  for(const preset of Object.values(SUNDAY_SERVICES)) {
    const state={serviceController:{preset},shuttleConfig:{},clock:45*60};
    assert.equal(serviceShuttleBreak(state).active,false);
    const start=(preset.startMinute-preset.beginMinute+45)*60;
    state.clock=start-.001;assert.equal(serviceShuttleBreak(state).active,false);
    state.clock=start;assert.equal(serviceShuttleBreak(state).active,true);
    assert.equal(serviceShuttleBreak(state).startMinute,preset.startMinute+45);
    state.clock=start+599.999;assert.equal(serviceShuttleBreak(state).active,true);
    state.clock=start+600;assert.equal(serviceShuttleBreak(state).active,false);
  }
});

test('home buses hold during service break and resume when it ends',()=>{
  const preset=SUNDAY_SERVICES.eleven;
  const state={cars:[],lanes:[],clock:5400,occupancy:{b:100},zoneOccupancy:{},phase:'arrival',serviceController:{preset}};
  attachShuttles(state,lane,{activeCount:5,dwellSeconds:0});
  state.prepareShuttles(live);
  assert.equal(state.cars.length,0);
  assert.ok(state.shuttles.every(bus=>bus.phase==='service-break'));
  state.clock=6000;state.prepareShuttles(live);
  assert.ok(state.cars.some(car=>car.fleetBus),'ready fleet resumes without resetting the scenario');
});

test('break never removes a moving bus; a remote bus can finish its circuit',()=>{
  const state={cars:[],lanes:[],clock:5400,occupancy:{b:100},zoneOccupancy:{},phase:'arrival',serviceController:{preset:SUNDAY_SERVICES.eleven}};
  attachShuttles(state,lane,{activeCount:1,dwellSeconds:0});
  const bus=state.shuttles[0];
  Object.assign(bus,{circuit:'b',leg:1,readyAt:0,phase:'remote-dwell'});
  state.prepareShuttles(live);
  const moving=state.cars.find(car=>car.id===bus.id);
  assert.ok(moving,'remote pickup launches its onward leg even during the break');
  state.prepareShuttles(live);
  assert.equal(state.cars.find(car=>car.id===bus.id),moving,'moving vehicle is not replaced or teleported');
  state.cars=[];state.completeShuttle(moving);state.prepareShuttles(live);
  const homeLeg=state.cars.find(car=>car.id===bus.id);assert.ok(homeLeg);
  state.cars=[];state.completeShuttle(homeLeg);state.prepareShuttles(live);
  assert.equal(state.cars.length,0);assert.equal(bus.phase,'service-break');
  state.serviceController=null;assert.equal(serviceShuttleBreak(state).enabled,false,'manual mode does not inherit a service break');
});
