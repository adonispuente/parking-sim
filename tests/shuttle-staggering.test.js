import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { attachShuttles } from '../src/shuttles.js';
import { SUNDAY_SERVICES } from '../src/sundayServices.js';

const makeLane=points=>{
  const path=new THREE.CurvePath();
  for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(
    new THREE.Vector3(points[i-1][0],0,points[i-1][1]),
    new THREE.Vector3(points[i][0],0,points[i][1])));
  return {path,length:path.getLength()};
};
const live=[{id:'b',open:true,capacity:487}];
const setup=(options={})=>{
  const state={cars:[],lanes:[],clock:0,occupancy:{b:0},zoneOccupancy:{},phase:'arrival'};
  attachShuttles(state,makeLane,options);
  return state;
};
const finish=(state,bus)=>{
  const car=state.cars.find(item=>item.id===bus.id);
  assert.ok(car,`${bus.id} is moving`);
  state.cars.splice(state.cars.indexOf(car),1);
  state.completeShuttle(car);
};

test('initial releases are spread over the first 90 seconds and HOME starts obey a 15s headway',()=>{
  const state=setup();
  const ready=state.shuttles.map(bus=>bus.readyAt);
  assert.equal(ready[0],0);
  assert.ok(ready.at(-1)<=90);
  assert.ok(ready.every((time,i)=>!i||time-ready[i-1]>=14));
  const starts=[];
  for(let t=0;t<=120;t++){
    state.clock=t;
    state.prepareShuttles(live);
    for(const car of state.cars.filter(car=>car.fleetBus&&!starts.some(start=>start.id===car.id)))
      starts.push({id:car.id,time:t});
    // Keep each bus marked in motion without blocking the shared HOME start.
    for(const car of state.cars)car.distance=state.lanes[car.lane].length;
  }
  assert.equal(starts.length,5);
  assert.ok(starts.every((start,i)=>!i||start.time-starts[i-1].time>=15),JSON.stringify(starts));
});

test('a blocked HOME launch retries without losing its ready time or circuit',()=>{
  const state=setup({activeCount:1});
  const bus=state.shuttles[0],lane=state.shuttleLaneIds.b[0];
  state.cars.push({id:'blocker',lane,distance:0});
  state.prepareShuttles(live);
  assert.equal(bus.readyAt,0);
  assert.equal(bus.circuit,'b');
  assert.equal(state.cars.some(car=>car.id===bus.id),false);
  state.cars=[];state.clock=1;state.prepareShuttles(live);
  assert.ok(state.cars.some(car=>car.id===bus.id));
});

test('default pickup dwell is fresh, bounded and reproducible for each bus visit',()=>{
  const series=()=>{
    const state=setup({activeCount:1}),bus=state.shuttles[0],dwells=[];
    state.prepareShuttles(live);
    for(let visit=0;visit<2;visit++){
      finish(state,bus);dwells.push(bus.readyAt-state.clock);
      state.clock=bus.readyAt;state.prepareShuttles(live);
      finish(state,bus);dwells.push(bus.readyAt-state.clock);
      state.clock=bus.readyAt;state.prepareShuttles(live);
      finish(state,bus);dwells.push(bus.readyAt-state.clock);
      state.clock=Math.max(bus.readyAt,state.clock+15);state.prepareShuttles(live);
    }
    return dwells;
  };
  const dwells=series();
  assert.deepEqual(series(),dwells);
  assert.equal(new Set(dwells).size,dwells.length,'each pickup or home visit is sampled anew');
  assert.ok(dwells.every(seconds=>seconds>=30&&seconds<60),JSON.stringify(dwells));
});

test('legacy explicit dwell override remains exact, including zero',()=>{
  for(const dwellSeconds of [0,1,75]){
    const state=setup({activeCount:1,dwellSeconds});
    const bus=state.shuttles[0];state.prepareShuttles(live);finish(state,bus);
    assert.equal(bus.readyAt-state.clock,dwellSeconds);
  }
});

test('remote legs finish during a break and a retired bus then holds at home',()=>{
  const state=setup({activeCount:1});
  state.serviceController={preset:SUNDAY_SERVICES.eleven};
  const bus=state.shuttles[0];state.prepareShuttles(live);
  state.clock=5400;finish(state,bus);
  assert.equal(bus.phase,'remote-dwell');
  state.clock=bus.readyAt;
  state.prepareShuttles(live);
  assert.ok(state.cars.some(car=>car.id===bus.id),'remote leg launched despite break');
  state.shuttleConfig.activeCount=0;
  finish(state,bus);state.prepareShuttles(live);
  assert.ok(state.cars.some(car=>car.id===bus.id),'retiring bus still launches last leg');
  finish(state,bus);state.prepareShuttles(live);
  assert.equal(state.cars.some(car=>car.id===bus.id),false);
  assert.equal(bus.phase,'service-break');
});
