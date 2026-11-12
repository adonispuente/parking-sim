// Northern positions share radio information; C exit preemption is local.
// Stop distances and queue thresholds remain provisional scene units/seconds.
import { pointAt, WORLD_SCALE, STAFF_POSITIONS } from './clearImageSource.js';
import { trafficClass } from './trafficPriority.js';

export const NORTHERN_DEFAULTS = Object.freeze({ radius:9, lookahead:10,
  conflictWidth:.95, batchSize:5, backupCount:3, backupSeconds:8 });
const half = car => (car.bodyLength ?? (car.fleetBus ? 2.9 : 1.35)) / 2;

export function attachNorthernCorporateControl(state, options = {}) {
  const config = {...NORTHERN_DEFAULTS,...options};
  const [x,z] = pointAt(64).map(v=>v*WORLD_SCALE);
  const lanes = new WeakMap(), pairs = new WeakMap(), stopped = new Map();
  const radio = state.northernRadio = { provisional:true,
    positions:[62,63,64].map(index=>({index,
      name:STAFF_POSITIONS.find(p=>p.index===index).label,position:pointAt(index),channel:'parking operations'})),
    shuttles:[],releaseBuses:[],heldCars:0,clearingCars:0,reason:'free flow',
    clayBackedUp:false,diversionRemaining:0,diverted:0,nextBatchAt:0,batchSize:config.batchSize };
  // All staffed positions hear the same fleet state, with separate duties.
  state.parkingRadio={channel:'parking operations',positions:STAFF_POSITIONS.map(p=>({id:p.id,index:p.index,name:p.label})),status:radio};
  const local = lane => {
    if (!lanes.has(lane)) {
      const points=[],count=Math.max(1,Math.ceil(lane.length/.3));
      for(let i=0;i<=count;i++) {
        const distance=lane.length*i/count,p=lane.path.getPointAt(i/count);
        if(Math.hypot(p.x-x,p.z-z)<=config.radius)points.push({distance,x:p.x,z:p.z});
      }
      lanes.set(lane,points);
    }
    return lanes.get(lane);
  };
  const conflict = (busLane,carLane) => {
    if(!pairs.has(busLane))pairs.set(busLane,new WeakMap());
    const cache=pairs.get(busLane);
    if(!cache.has(carLane)) {
      let busFrom=Infinity,busTo=-Infinity,carFrom=Infinity,carTo=-Infinity;
      for(const a of local(busLane))for(const b of local(carLane)) {
        if(Math.hypot(a.x-b.x,a.z-b.z)>=config.conflictWidth)continue;
        busFrom=Math.min(busFrom,a.distance);busTo=Math.max(busTo,a.distance);
        carFrom=Math.min(carFrom,b.distance);carTo=Math.max(carTo,b.distance);
      }
      cache.set(carLane,Number.isFinite(busFrom)?{busFrom,busTo,carFrom,carTo}:null);
    }
    return cache.get(carLane);
  };
  const exitingC = car => {
    if(trafficClass(car)!=='shuttle')return false;
    // Explicit circuit identity: B and inbound C buses never claim this exit.
    const bus=state.shuttles?.find(b=>b.id===car.id);
    return bus ? ['cNorth','cSouth'].includes(bus.circuit)&&bus.leg===2 : car.cExitShuttle===true;
  };
  state.prepareNorthernCorporateControl = () => {
    for(const car of state.cars){delete car.northernStopDistance;car.holdForNorthern=false;}
    radio.shuttles=(state.shuttles??[]).map(bus=>{
      const car=state.cars.find(c=>c.id===bus.id);
      const p=car?state.lanes[car.lane].path.getPointAt(Math.min(1,car.distance/state.lanes[car.lane].length)):null;
      return {id:bus.id,number:bus.number,phase:bus.phase,circuit:bus.circuit,leg:bus.leg,
        position:p?[p.x/WORLD_SCALE,p.z/WORLD_SCALE]:bus.stationary,moving:!!car};
    });
    const buses=state.cars.filter(exitingC).filter(bus=>{
      const points=local(state.lanes[bus.lane]);
      return points.length&&points[0].distance-bus.distance<=config.lookahead&&
        bus.distance-half(bus)<=points.at(-1).distance&&bus.distance<state.lanes[bus.lane].length;
    });
    radio.releaseBuses=buses.map(bus=>bus.id);
    const held=new Set(),clearing=new Set();
    for(const bus of buses)for(const car of state.cars) {
      if(trafficClass(car)==='shuttle')continue;
      const hit=conflict(state.lanes[bus.lane],state.lanes[car.lane]);
      if(!hit||bus.distance-half(bus)>hit.busTo||car.distance-half(car)>hit.carTo||car.distance>=state.lanes[car.lane].length)continue;
      const gap=half(car)+half(bus)+1.25;
      const stop=Math.max(0,hit.carFrom-gap),busStop=Math.max(0,hit.busFrom-gap);
      if(car.distance>stop+.1) {
        // Let already-admitted traffic clear; do not trap it in front of a bus.
        clearing.add(car.id);
        if(bus.distance<=busStop+.1) {
          bus.northernStopDistance=Math.min(bus.northernStopDistance??Infinity,busStop);
          bus.holdForNorthern=bus.distance>=busStop-.05;
        }
      } else {
        car.northernStopDistance=Math.min(car.northernStopDistance??Infinity,stop);
        car.holdForNorthern=car.distance>=stop-.05;held.add(car.id);
      }
    }
    // Radio handoff must clear the physical leaders of an already-admitted
    // car too. Different final lanes can have slightly different stop stations;
    // stopping its leader downstream otherwise traps both car and shuttle.
    const pose=car=>{
      const lane=state.lanes[car.lane],t=Math.min(1,car.distance/lane.length);
      return {p:lane.path.getPointAt(t),t:lane.path.getTangentAt(t)};
    };
    // A release bus can wait (through following and occupied-conflict yields
    // from the previous tick) on a car this radio is holding for that same bus.
    // Holding it then traps the bus forever, so release only cars on the bus's
    // own blocking chain; every other conflicting car stays held.
    const byId=new Map(state.cars.map(c=>[c.id,c]));
    const dependencyReleased=[];
    for(const bus of buses) {
      const seen=new Set([bus.id]);
      let next=byId.get(bus.yieldingTo);
      for(let hops=0;next&&hops<40&&!seen.has(next.id);hops++) {
        seen.add(next.id);
        if(held.has(next.id)) {
          delete next.northernStopDistance;next.holdForNorthern=false;
          held.delete(next.id);clearing.add(next.id);dependencyReleased.push(next.id);
        }
        next=byId.get(next.yieldingTo);
      }
    }
    radio.dependencyReleased=dependencyReleased;
    let changed=true;
    while(changed) {
      changed=false;
      for(const id of [...held]) {
        const lead=state.cars.find(c=>c.id===id),a=pose(lead);
        for(const follower of state.cars.filter(c=>clearing.has(c.id))) {
          const b=pose(follower),dx=a.p.x-b.p.x,dz=a.p.z-b.p.z;
          const along=dx*b.t.x+dz*b.t.z,lateral=Math.abs(dx*b.t.z-dz*b.t.x);
          if(a.t.dot(b.t)>.7&&along>0&&along<12&&lateral<.85) {
            delete lead.northernStopDistance;lead.holdForNorthern=false;
            held.delete(id);clearing.add(id);changed=true;break;
          }
        }
      }
    }
    radio.heldCars=held.size;radio.clearingCars=clearing.size;
    radio.clearingIds=[...clearing];
    radio.reason=clearing.size?'clear occupied Corporate traffic, then release C shuttle':buses.length?'radio: hold conflicting Corporate traffic · C shuttle release':'free flow';
    // Count sustained waits on the public eastbound road, never a B aisle.
    const live=new Set(state.cars.map(c=>c.id));
    for(const id of stopped.keys())if(!live.has(id))stopped.delete(id);
    let backed=0;
    for(const car of state.cars) {
      const p=state.lanes[car.lane].path.getPointAt(Math.min(1,car.distance/state.lanes[car.lane].length));
      const eastbound=car.phase==='departing'&&car.exitDirection==='equity-east'&&p.x/WORLD_SCALE>1000;
      if(!eastbound||!car.trafficWaiting){stopped.delete(car.id);continue;}
      if(!stopped.has(car.id))stopped.set(car.id,state.clock);
      if(state.clock-stopped.get(car.id)>=config.backupSeconds)backed++;
    }
    radio.clayBackedUp=backed>=config.backupCount;
    if(!radio.clayBackedUp)radio.diversionRemaining=0;
  };
  state.northernDepartureAccess = (car,normal) => {
    if(car.target!=='b'||car.zone==='bSouth'||normal!=='bNorth'||!radio.clayBackedUp)return normal;
    if(state.clock<radio.nextBatchAt&&!radio.diversionRemaining)return null;
    if(!radio.diversionRemaining)radio.diversionRemaining=config.batchSize;
    return 'bWest';
  };
  state.observeNorthernDeparture = (car,normal,actual) => {
    if(car.target==='b'&&normal==='bNorth'&&actual==='bWest'&&radio.clayBackedUp) {
      radio.diversionRemaining=Math.max(0,radio.diversionRemaining-1);radio.diverted++;
      if(!radio.diversionRemaining)radio.nextBatchAt=state.clock+5;
    }
  };
}