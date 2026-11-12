// Staff at C's entrance reserve shuttle turns, using the actual conflicting
// portions of each lane. Area, lookahead, and gaps are provisional estimates.
import { pointAt, WORLD_SCALE } from './clearImageSource.js';
import { C_FOUR_WAY } from './cHubSource.js';
import { inPolygon } from './sourceRouting.js';
const [x,y]=pointAt(63);
export const C_ENTRANCE_AREA=Object.freeze([[x-45,y-30],[x+45,y-30],[x+45,y+65],[x-45,y+65]].map(p=>Object.freeze(p)));
const half=car=>(car.bodyLength??(car.fleetBus?2.9:1.35))/2;
export function attachCEntranceControl(state,options={}) {
  const config={enabled:true,lookahead:14,conflictWidth:1.2,stopGap:1.25,...options};
  const lanes=new WeakMap(),pairs=new WeakMap(),roundExits=new WeakMap();
  const status=state.cEntrance={position:pointAt(63),enabled:config.enabled,provisional:true,
    priority:['shuttle','departure','arrival'],waiting:{shuttle:0,departure:0,arrival:0},admitted:[],held:[],clearing:[],reason:'free flow'};
  const visits=lane=>{
    if(!lanes.has(lane)) {
      const groups=[],count=Math.max(1,Math.ceil(lane.length/.3));let group,lastRound=-Infinity;
      for(let i=0;i<=count;i++) {
        const distance=lane.length*i/count,p=lane.path.getPointAt(i/count);
        if(inPolygon([p.x/WORLD_SCALE,p.z/WORLD_SCALE],C_FOUR_WAY))lastRound=distance;
        if(inPolygon([p.x/WORLD_SCALE,p.z/WORLD_SCALE],C_ENTRANCE_AREA)) {
          if(!group){group={from:distance,to:distance,points:[],lane};groups.push(group);}
          group.to=distance;group.points.push({distance,x:p.x,z:p.z});
        } else group=null;
      }
      lanes.set(lane,groups);roundExits.set(lane,lastRound);
    }
    return lanes.get(lane);
  };
  const visit=car=>visits(state.lanes[car.lane]).find(v=>car.distance-half(car)<=v.to&&car.distance<state.lanes[car.lane].length);
  const conflict=(a,b)=>{
    if(!pairs.has(a))pairs.set(a,new WeakMap());
    const cache=pairs.get(a);
    if(!cache.has(b)) {
      let busFrom=Infinity,busTo=-Infinity,carFrom=Infinity,carTo=-Infinity;
      for(const p of a.points)for(const q of b.points) {
        if(Math.hypot(p.x-q.x,p.z-q.z)>=config.conflictWidth)continue;
        busFrom=Math.min(busFrom,p.distance);busTo=Math.max(busTo,p.distance);
        carFrom=Math.min(carFrom,q.distance);carTo=Math.max(carTo,q.distance);
      }
      const aligned=Number.isFinite(busFrom)&&a.lane.path.getTangentAt(Math.min(1,busFrom/a.lane.length)).dot(b.lane.path.getTangentAt(Math.min(1,carFrom/b.lane.length)))>.7;
      cache.set(b,Number.isFinite(busFrom)?{busFrom,busTo,carFrom,carTo,aligned}:null);
    }
    return cache.get(b);
  };
  state.prepareCEntranceControl=()=>{
    for(const car of state.cars){delete car.cEntranceStopDistance;car.holdForCEntrance=false;}
    status.admitted=[];status.held=[];status.clearing=[];status.waiting={shuttle:0,departure:0,arrival:0};
    if(!config.enabled)return;
    const buses=state.cars.filter(c=>c.fleetBus).map(car=>({car,visit:visit(car)})).filter(b=>
      b.visit&&b.visit.from-b.car.distance<=config.lookahead&&
      !(b.car.holdForCRoundabout&&b.car.distance+half(b.car)<b.visit.from));
    const held=new Set(),clearing=new Set();
    for(const bus of buses)for(const car of state.cars) {
      if(car.fleetBus)continue;
      const carVisit=visit(car);if(!carVisit)continue;
      const hit=conflict(bus.visit,carVisit);
      if(!hit||hit.busFrom-bus.car.distance>config.lookahead||bus.car.distance-half(bus.car)>hit.busTo||car.distance-half(car)>hit.carTo)continue;
      const gap=half(car)+half(bus.car)+config.stopGap;
      let stop=Math.max(0,hit.carFrom-gap);
      const roundExit=roundExits.get(state.lanes[car.lane]);
      if(Number.isFinite(roundExit)&&roundExit<hit.carFrom) {
        // The roundabout marshal owns this exit stream. An entrance hold
        // before that crossing would trap the bus's own blocking chain.
        // Let that marshal clear/release it, rather than adding a second gate.
        clearing.add(car.id);continue;
      }
      const carEta=(hit.carFrom-car.distance)/(car.speed??2.8),busEta=(hit.busFrom-bus.car.distance)/(bus.car.speed??2.5);
      if(car.distance>stop+.1||(hit.aligned&&carEta<=busEta+.4)) {
        // Admitted cars and leaders of a shared exit clear before the bus,
        // including leaders around a bend whose current tangents differ.
        clearing.add(car.id);
      } else {
        car.cEntranceStopDistance=Math.min(car.cEntranceStopDistance??Infinity,stop);
        car.holdForCEntrance=car.distance>=stop-.05;held.add(car.id);
      }
    }
    // A priority bus must not be held by a car stopped for that same bus. Clear
    // the actual blocking chain, keeping unrelated conflicting arrivals held.
    const byId=new Map(state.cars.map(c=>[c.id,c]));
    for(const bus of buses) {
      const seen=new Set([bus.car.id]);let next=byId.get(bus.car.yieldingTo);
      while(next&&!seen.has(next.id)) {
        seen.add(next.id);
        if(held.has(next.id)) {
          delete next.cEntranceStopDistance;next.holdForCEntrance=false;
          held.delete(next.id);clearing.add(next.id);
        }
        next=byId.get(next.yieldingTo);
      }
    }
    status.admitted=[...buses.map(b=>b.car.id),...clearing];status.held=[...held];status.clearing=[...clearing];
    status.waiting.shuttle=buses.length;
    for(const id of held){const car=byId.get(id);status.waiting[car.phase==='departing'?'departure':'arrival']++;}
    status.reason=clearing.size?'clear admitted cars; reserve shuttle turn':buses.length?'hold conflicting cars for shuttle turn':'free flow';
  };
}
