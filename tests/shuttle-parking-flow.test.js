import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createShuttleDemand } from '../src/shuttleDemand.js';
import { attachShuttles } from '../src/shuttles.js';

const arrivals=(b,north,south)=>[
  ...Array.from({length:b},(_,i)=>({id:`b-${i}`,target:'b',zone:'bNorth',phase:'arrival'})),
  ...Array.from({length:north},(_,i)=>({id:`n-${i}`,target:'c',zone:'cFirstNorth',phase:'arrival'})),
  ...Array.from({length:south},(_,i)=>({id:`s-${i}`,target:'c',zone:'cFirstSouth',phase:'arrival'})),
];
const setup=(b,north,south)=>{
  const state={clock:0,cars:arrivals(b,north,south),shuttleConfig:{},shuttles:[],parkedVehicles:[]};
  // A long C circuit must not cause the busier lot to lose its fleet share.
  const demand=createShuttleDemand(state,{b:100,cNorth:1000,cSouth:1000});
  demand.update();return {state,demand};
};
const assignFleet=(state,demand)=>{
  const counts={b:0,c:0};
  for(let i=0;i<5;i++){
    const bus={number:i+1};state.shuttles.push(bus);
    const decision=demand.choose();assert.ok(decision.area);
    demand.reserve(bus,decision);counts[decision.area==='b'?'b':'c']++;
  }
  return counts;
};

test('80% of incoming parking in C gets four of five buses despite its longer, split circuits',()=>{
  const {state,demand}=setup(80,160,160);
  assert.deepEqual(assignFleet(state,demand),{b:1,c:4});
});

test('fleet allocation follows the reverse parking mix into B',()=>{
  const {state,demand}=setup(320,40,40);
  assert.deepEqual(assignFleet(state,demand),{b:4,c:1});
});

test('combined C North/South demand wins over a larger individual B queue',()=>{
  const {demand}=setup(120,80,80);
  assert.match(demand.choose().area,/^c/);
});

test('incoming cars create an early reservation, become waiting riders once, and are not counted as served',()=>{
  const {state,demand}=setup(0,1,0);
  demand.publish();
  assert.equal(state.shuttleDemand.areas.cNorth.waiting.toHome,0);
  assert.equal(state.shuttleDemand.areas.cNorth.incomingCars,1);
  const bus={number:1};state.shuttles.push(bus);demand.reserve(bus,demand.choose());
  assert.equal(bus.demandAssignment.toHome,1.25);
  assert.equal(demand.choose().area,'cNorth','an exclusive C arrival stream stages the whole available fleet');
  const stagingBus={number:2};state.shuttles.push(stagingBus);demand.reserve(stagingBus,demand.choose());
  assert.equal(stagingBus.demandAssignment.toHome,0,'staging another bus must not invent riders');
  const car=state.cars[0];
  demand.register(car,true);demand.register(car,true);demand.publish();
  const row=state.shuttleDemand.areas.cNorth;
  assert.equal(row.incomingCars,0);
  assert.equal(row.waiting.toHome,1.25);
  assert.equal(row.generated.toHome,1.25);
  assert.equal(row.served.toHome,0);
  state.cars=[];demand.update();demand.pickup(bus,'cNorth');demand.publish();
  assert.equal(state.shuttleDemand.areas.cNorth.served.toHome,1.25);
  demand.update();assert.equal(demand.choose().area,null);
});

test('a canceled or redirected arrival updates the forecast without inventing a rider queue',()=>{
  const {state,demand}=setup(0,10,0);
  state.cars=state.cars.slice(0,3).map(car=>({...car,target:'b',zone:'bSouth'}));
  demand.update();demand.publish();
  assert.equal(state.shuttleDemand.areas.cNorth.incomingCars,0);
  assert.equal(state.shuttleDemand.areas.cNorth.waiting.toHome,0);
  assert.equal(state.shuttleDemand.areas.b.incomingCars,3);
  assert.equal(demand.choose().area,'b');
});

test('the real bus state machine sends four of five buses toward C before those cars finish parking',()=>{
  const makeLane=points=>{
    const path=new THREE.CurvePath();
    for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1][0],0,points[i-1][1]),new THREE.Vector3(points[i][0],0,points[i][1])));
    return {path,length:path.getLength()};
  };
  const state={clock:0,cars:[],lanes:[],occupancy:{b:0},zoneOccupancy:{},parkedVehicles:[],phase:'arrival'};
  attachShuttles(state,makeLane,{activeCount:5,dispatchMode:'demand',dwellSeconds:0});
  const incoming=arrivals(80,160,160);
  // Exercise the actual controller with inbound cars on an existing lane well
  // beyond the A-home launch point, without finishing their parking road legs.
  const lane=state.shuttleLaneIds.cNorth[1];
  state.cars=incoming.map(car=>({...car,lane,distance:state.lanes[lane].length/2}));
  const live=[{id:'b',open:true,capacity:487}];
  for(let i=0;i<5;i++){state.clock=i*30;state.prepareShuttles(live);}
  assert.equal(state.shuttles.filter(bus=>bus.circuit==='b').length,1);
  assert.equal(state.shuttles.filter(bus=>bus.circuit?.startsWith('c')).length,4);
  assert.equal(state.cars.filter(car=>car.fleetBus).length,5);
  assert.ok(Object.values(state.shuttleDemand.areas).every(area=>area.waiting.toHome===0));
});

test('an exclusive C stream sends all five available buses, even with older B demand and enough buses already assigned',()=>{
  const makeLane=points=>{
    const path=new THREE.CurvePath();
    for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1][0],0,points[i-1][1]),new THREE.Vector3(points[i][0],0,points[i][1])));
    return {path,length:path.getLength()};
  };
  const state={clock:0,cars:[],lanes:[],occupancy:{b:100},zoneOccupancy:{},parkedVehicles:[],phase:'arrival'};
  attachShuttles(state,makeLane,{activeCount:5,dispatchMode:'demand',dwellSeconds:0});
  for(let i=0;i<100;i++)state.observeShuttleParking({id:`old-b-${i}`,target:'b',zone:'bNorth'});
  const lane=state.shuttleLaneIds.cNorth[1];
  state.cars=arrivals(0,1,1).map(car=>({...car,lane,distance:state.lanes[lane].length/2}));
  for(let i=0;i<5;i++){state.clock=300+i*30;state.prepareShuttles([{id:'b',open:true,capacity:487}]);}
  assert.equal(state.shuttles.filter(bus=>bus.circuit?.startsWith('c')).length,5);
  assert.equal(state.cars.filter(car=>car.fleetBus).length,5);
  assert.equal(state.shuttleDemand.arrivalFocus,'c');
  assert.equal(state.shuttleDemand.areas.b.waiting.toHome,125,'B riders remain accounted for');
  const reserved=state.shuttles.reduce((sum,bus)=>sum+bus.demandAssignment.toHome,0);
  assert.equal(reserved,2.5,'five staged buses do not duplicate the two arriving cars’ rider estimate');
});

test('C-only focus clears when other lots receive cars or C pickups finish',()=>{
  const {state,demand}=setup(0,3,0);
  demand.publish();assert.equal(state.shuttleDemand.arrivalFocus,'c');
  state.cars.push({id:'a-car',target:'a',phase:'arrival'});
  demand.update();demand.publish();assert.equal(state.shuttleDemand.arrivalFocus,null);
  state.cars=state.cars.filter(car=>car.target==='c');
  demand.update();
  for(const car of state.cars)demand.register(car,true);
  state.cars=[];demand.update();demand.publish();
  assert.equal(state.shuttleDemand.arrivalFocus,'c','focus lasts while newly parked C riders still wait');
  const bus={number:1};state.shuttles.push(bus);demand.reserve(bus,demand.choose());demand.pickup(bus,'cNorth');
  demand.update();demand.publish();
  assert.equal(state.shuttleDemand.arrivalFocus,null);
  assert.equal(demand.choose().area,null);
});
