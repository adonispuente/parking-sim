// Corporate Drive west bend: three SEPARATE staffed operators that coordinate.
// Between #60 and #61 the traced opposing lanes sit closer than vehicle body
// clearance (research/claudy-west-exit-diagnosis-2026-11-06.md), so that stretch
// can carry one direction at a time. #61 controls the southwest-bound entry and
// #60 the northeast-bound entry. Each operator decides only for its own end; they
// coordinate by posting their waiting traffic and reading who is in the stretch.
// #59 records mandatory passage; no opposing conflict was measured at its point.
// Stop/clear distances and the platoon size are provisional simulation settings.
import { pointAt, WORLD_SCALE } from './clearImageSource.js';
import { compareTrafficPriority, trafficClass, trafficPriority } from './trafficPriority.js';
import { busesPassThrough } from './vehicleInteractions.js';

// conflictGap: opposing lanes closer than this (scene units) belong to the shared
// stretch. It exceeds the 0.915 bus/car body clearance in sharedTraffic.js.
export const CORPORATE_OPERATOR_DEFAULTS=Object.freeze({enabled:true,radius:3.5,stopAhead:3.4,clearAfter:3.4,lookahead:12,platoon:5,conflictGap:1.2});
// end: the direction of traffic this operator admits into the shared stretch.
export const CORPORATE_OPERATORS=Object.freeze([
  Object.freeze({id:'corporateOfficer',index:59,name:'Corporate Drive west officer (#59)',end:null}),
  Object.freeze({id:'permitOfficer',index:60,name:'Corporate Drive / Black Permit officer (#60)',end:'ne'}),
  Object.freeze({id:'bEntrance',index:61,name:'Lot B entrance position (#61)',end:'sw'}),
]);

const half=car=>(car.bodyLength??1.35)/2;
// The valve separates opposing traffic only when a departure is involved. Before
// this module, opposing arrivals and shuttles on this stretch already resolved
// under sharedTraffic's local bus priority (nine service: 950/950, zero stalls);
// the measured deadlock was always departure vs shuttle/arrival.
export const needsValve=(a,b)=>!busesPassThrough(a,b)&&(trafficClass(a)==='departure'||trafficClass(b)==='departure');

export function attachCorporateDriveOperators(state,options={}) {
  const config={...CORPORATE_OPERATOR_DEFAULTS,...options};
  const operators=CORPORATE_OPERATORS.map(op=>({...op,position:[...pointAt(op.index)],
    station:{x:pointAt(op.index)[0]*WORLD_SCALE,z:pointAt(op.index)[1]*WORLD_SCALE},
    waiting:0,passed:0,admitted:0,admittedInRow:0,request:null,reason:'idle'}));
  const byIndex=Object.fromEntries(operators.map(op=>[op.index,op]));
  const ends=operators.filter(op=>op.end);
  const otherEnd=op=>ends.find(o=>o!==op);
  const shared={occupants:[],direction:null,lastDirection:null};
  state.corporateOperators={enabled:config.enabled,provisional:true,operators,shared};
  const admitted=new Set();
  const cache=new WeakMap();
  const nearest=(lane,station)=>{
    let gap=Infinity,distance=0;
    const n=Math.max(1,Math.ceil(lane.length/.4));
    for(let i=0;i<=n;i++){const p=lane.path.getPointAt(i/n),d=Math.hypot(p.x-station.x,p.z-station.z);if(d<gap){gap=d;distance=lane.length*i/n;}}
    return {gap,distance};
  };
  const sample=(lane,from,to)=>{
    const out=[],n=Math.max(1,Math.ceil((to-from)/.4));
    for(let i=0;i<=n;i++){const d=from+(to-from)*i/n,p=lane.path.getPointAt(Math.max(0,Math.min(1,d/lane.length)));out.push({d,x:p.x,z:p.z});}
    return out;
  };
  // Per lane: operator passage points, and whether it runs #60<->#61 (direction
  // and the span between its two operator points). Geometry is immutable.
  const base=lane=>{
    if(!cache.has(lane)) {
      const near=Object.fromEntries(operators.map(op=>[op.index,nearest(lane,op.station)]));
      const passes=Object.fromEntries(operators.filter(op=>near[op.index].gap<=config.radius).map(op=>[op.index,near[op.index].distance]));
      let span=null;
      if(60 in passes&&61 in passes&&Math.abs(passes[60]-passes[61])>1)
        span={direction:passes[61]<passes[60]?'sw':'ne',from:Math.min(passes[60],passes[61]),to:Math.max(passes[60],passes[61])};
      cache.set(lane,{passes,span,points:span?sample(lane,Math.max(0,span.from-15),Math.min(lane.length,span.to+15)):null});
    }
    return cache.get(lane);
  };
  // The shared stretch on a lane runs from its first to its last approach within
  // conflictGap of any OPPOSING #60<->#61 lane, so a held vehicle never waits
  // where opposing traffic leaves. Corporate Drive is two-way: where no opposing
  // approach is measured that close, there is no stretch and no alternation;
  // the operators still record passage and post their queues.
  // Lanes are created lazily, so extents are recomputed when the lane set grows.
  let extentsFor=-1;const extents=new Map();
  const stretchOf=lane=>{
    if(extentsFor!==state.lanes.length){extents.clear();extentsFor=state.lanes.length;}
    if(extents.has(lane))return extents.get(lane);
    const own=base(lane);let stretch=null;
    if(own.span) {
      let entry=Infinity,exit=-Infinity;
      for(const other of state.lanes) {
        const theirs=other===lane?null:base(other);
        if(!theirs?.span||theirs.span.direction===own.span.direction)continue;
        for(const a of own.points)for(const b of theirs.points)
          if(Math.hypot(a.x-b.x,a.z-b.z)<config.conflictGap){if(a.d<entry)entry=a.d;if(a.d>exit)exit=a.d;}
      }
      const direction=own.span.direction;
      if(entry<=exit)stretch={direction,operator:direction==='sw'?byIndex[61]:byIndex[60],entry,exit,
        stop:Math.max(0,entry-config.stopAhead),release:Math.min(lane.length,exit+config.clearAfter)};
    }
    extents.set(lane,stretch);
    return stretch;
  };
  const control=car=>{
    const lane=state.lanes[car.lane];
    if(!lane)return null;
    return {passes:base(lane).passes,stretch:stretchOf(lane)};
  };
  // Operational class of an end's queue: a bus queued behind a held car still
  // counts, so a lower-class head vehicle cannot trap a shuttle behind it.
  const queueClass=queue=>Math.max(0,...queue.filter(q=>q.stretch.stop-q.car.distance<config.lookahead).map(q=>trafficPriority(q.car)));
  state.prepareCorporateDriveOperators=()=>{
    for(const car of state.cars){delete car.corridorStopDistance;car.holdForCorridor=false;}
    if(!config.enabled)return;
    const live=new Set(state.cars.map(car=>car.id));
    for(const id of [...admitted])if(!live.has(id))admitted.delete(id);
    const occupants=[],queues={sw:[],ne:[]};
    for(const car of state.cars) {
      const stretch=control(car)?.stretch;
      if(!stretch)continue;
      if(car.distance>=state.lanes[car.lane].length||car.distance-half(car)>=stretch.release){admitted.delete(car.id);continue;}
      if(admitted.has(car.id)||car.distance>stretch.stop+.05)occupants.push({car,stretch});
      else queues[stretch.direction].push({car,stretch});
    }
    const directions=new Set(occupants.map(o=>o.stretch.direction));
    shared.occupants=occupants.map(o=>o.car.id);
    shared.direction=directions.size===1?[...directions][0]:directions.size?'both':null;
    // Each end operator posts its own request.
    for(const op of operators) {
      if(!op.end){op.waiting=0;op.request=null;op.reason='record passage';continue;}
      const queue=queues[op.end];
      op.waiting=queue.length;
      const head=queue.filter(q=>q.car.distance>=q.stretch.stop-.25&&!q.car.holdForGate)
        .sort((a,b)=>compareTrafficPriority(a.car,b.car)||(a.stretch.stop-a.car.distance)-(b.stretch.stop-b.car.distance))[0]??null;
      op.request=head?{...head,class:queueClass(queue)}:null;
    }
    // Each end operator decides for its own end from the shared postings.
    const decisions=new Map();
    for(const op of ends) {
      const mine=op.request,other=otherEnd(op),rival=other.request;
      if(!mine){op.reason=op.waiting?'queue approaching':'clear';continue;}
      const opposing=occupants.filter(o=>o.stretch.direction!==op.end&&needsValve(o.car,mine.car));
      if(opposing.length){op.reason='opposing traffic in stretch';continue;}
      const contested=rival&&needsValve(mine.car,rival.car);
      // An admitted vehicle already travelling this end's direction that is
      // waiting on this end's head car cannot clear the stretch for the rival
      // until the head car moves, so holding the head car for the rival would
      // deadlock (research/claudy-corporate-occupant-report-2026-11-06.md). The
      // opposing-occupant check above still runs first.
      const blocksOwnOccupant=occupants.some(o=>o.stretch.direction===op.end&&o.car.yieldingTo===mine.car.id);
      if(contested&&rival.class>mine.class&&!blocksOwnOccupant){op.reason='higher class waiting at other end';continue;}
      if(contested&&rival.class===mine.class) {
        const flowingMine=shared.lastDirection===op.end;
        if(flowingMine&&op.admittedInRow>=config.platoon){op.reason='platoon complete, other end next';continue;}
        // Empty stretch with equal classes at both ends: exactly one end may go.
        if(!occupants.length) {
          const otherHasTurn=shared.lastDirection===other.end?other.admittedInRow<config.platoon:
            shared.lastDirection===op.end?op.admittedInRow>=config.platoon:compareTrafficPriority(rival.car,mine.car)<0;
          if(otherHasTurn){op.reason='other end has the turn';continue;}
        }
      }
      decisions.set(op,mine);
    }
    for(const [op,{car}] of decisions) {
      admitted.add(car.id);
      if(shared.lastDirection!==op.end){shared.lastDirection=op.end;op.admittedInRow=0;}
      op.admittedInRow++;op.admitted++;op.reason='admitted';
    }
    for(const queue of Object.values(queues))for(const {car,stretch} of queue) {
      if(admitted.has(car.id))continue;
      car.corridorStopDistance=stretch.stop;
      car.holdForCorridor=car.distance>=stretch.stop-.01;
    }
  };
  // Mandatory passage record: every operator counts vehicles crossing its point.
  state.observeCorporateDriveOperators=()=>{
    if(!config.enabled)return;
    for(const car of state.cars) {
      const passes=control(car)?.passes;
      if(!passes)continue;
      for(const [index,distance] of Object.entries(passes)) {
        if(car.distance<distance)continue;
        car.corporatePassed??={};
        if(car.corporatePassed[index])continue;
        car.corporatePassed[index]=true;byIndex[index].passed++;
      }
    }
  };
}
