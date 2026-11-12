// Conservative Lot A exit merge admission. Placement/stop distances are
// provisional simulation settings, not claimed field procedures. Never replaces
// sharedTraffic body clearance or shuttle priority.
import { FEEDER_OFFICER_POSITION } from './positions/index.js';
import { compareTrafficPriority } from './trafficPriority.js';
import { WORLD_SCALE } from './clearImageSource.js';

const SCALE=WORLD_SCALE;
export const FEEDER_OFFICER_DEFAULTS=Object.freeze({enabled:true,stopAhead:3.4,clearAfter:3.4,busLookahead:12,conflictRadius:2.8,exitRoomGap:.5});
export function attachFeederOfficer(state,options={}) {
  const config={...FEEDER_OFFICER_DEFAULTS,...options};
  const station={x:FEEDER_OFFICER_POSITION[0]*SCALE,z:FEEDER_OFFICER_POSITION[1]*SCALE};
  const laneControls=new WeakMap();
  const gate=state.feederOfficer={name:'Lot A feeder exit officer',position:FEEDER_OFFICER_POSITION,
    provisional:true,enabled:config.enabled,admittedId:null,waitingExit:0,waitingFeeder:0,passed:0,reason:'idle'};
  let admitted=null;
  const control=car=>{
    const lane=state.lanes[car.lane];
    if(!lane)return null;
    if(!laneControls.has(lane)) {
      let best=Infinity,distance=0;
      const n=Math.max(1,Math.ceil(lane.length/.4));
      for(let i=0;i<=n;i++) {
        const p=lane.path.getPointAt(i/n),d=Math.hypot(p.x-station.x,p.z-station.z);
        if(d<best){best=d;distance=lane.length*i/n;}
      }
      // Region includes the exit/feeder lane widths, not merely the officer's
      // point. Conservative radius is disclosed/configurable until field review.
      laneControls.set(lane,best<=config.conflictRadius?{merge:distance,stop:Math.max(0,distance-config.stopAhead),
        release:Math.min(lane.length,distance+config.clearAfter)}:null);
    }
    return laneControls.get(lane);
  };
  const isExit=car=>car.phase==='departing'&&car.access==='a';
  const remaining=()=>state.cars.filter(c=>!c.fleetBus&&control(c)&&!c.feederMergePassed);
  const inZone=car=>{
    const c=control(car);if(!c)return false;
    const half=(car.bodyLength??1.35)/2;
    return car.distance+half>c.merge-1.7&&car.distance-half<c.release;
  };
  // Do not admit a car into a merge it cannot leave. This retains the existing
  // 0.9-world conflict width; buses remain governed by the priority check below.
  const exitRoom=car=>{
    const lane=state.lanes[car.lane],c=control(car);
    const end=Math.min(lane.length,c.release+(car.bodyLength??1.35)+config.exitRoomGap);
    const others=state.cars.filter(other=>other!==car&&!other.fleetBus).map(other=>{
      const otherLane=state.lanes[other.lane];
      return otherLane.path.getPointAt(Math.min(1,Math.max(0,other.distance/otherLane.length)));
    });
    const blocked=distance=>{
      const point=lane.path.getPointAt(Math.min(1,distance/lane.length));
      return others.some(other=>Math.hypot(other.x-point.x,other.z-point.z)<.9);
    };
    for(let distance=c.merge;distance<end;distance+=.2) {
      if(blocked(distance))return false;
    }
    return !blocked(end);
  };
  state.prepareFeederOfficer=()=>{
    for(const car of state.cars){delete car.feederStopDistance;car.holdForOfficer=false;}
    if(!config.enabled)return;
    if(admitted&&!state.cars.includes(admitted)){admitted=null;gate.admittedId=null;}
    for(const car of state.cars) {
      const c=control(car);
      if(c&&car!==admitted&&(car.distance>=state.lanes[car.lane].length||
        car.distance-(car.bodyLength??1.35)/2>=c.release))car.feederMergePassed=true;
    }
    const candidates=remaining();
    gate.waitingExit=candidates.filter(isExit).length;
    gate.waitingFeeder=candidates.filter(c=>!isExit(c)).length;
    // No exit waiting: feeder flow remains free. Cars already in the zone keep
    // going even when an A departure subsequently joins the queue.
    // Keep the merge clear in free flow too: a car not yet in the zone may not
    // enter it without exit room (same exitRoom test as admission).
    if(!gate.waitingExit&&!admitted){
      gate.reason='feeder free';
      for(const car of candidates) {
        if(inZone(car)||exitRoom(car))continue;
        car.feederStopDistance=control(car).stop;
        car.holdForOfficer=car.distance>=control(car).stop-.01;
        gate.reason='feeder free, keep merge clear';
      }
      return;
    }
    const ready=candidates.filter(c=>!c.holdForGate&&c.distance>=control(c).stop-.25&&exitRoom(c));
    const occupied=state.cars.some(c=>c!==admitted&&inZone(c));
    const priorityBus=state.cars.some(c=>c.fleetBus&&control(c)&&
      c.distance<control(c).release&&control(c).merge-c.distance<config.busLookahead);
    if(!admitted&&!occupied&&!priorityBus) {
      const next=ready.filter(c=>!inZone(c)).sort((a,b)=>compareTrafficPriority(a,b)||
        (control(a).stop-a.distance)-(control(b).stop-b.distance))[0];
      if(next){admitted=next;gate.admittedId=next.id;}
    }
    gate.reason=occupied?'clear occupied merge':priorityBus?'shuttle priority':admitted?'admitted vehicle clearing':'await ready traffic';
    for(const car of candidates) {
      if(car===admitted||inZone(car))continue;
      // Do not trap a priority bus behind a feeder car held by this officer.
      // Let that physical lead queue clear; only the competing A exit waits.
      if(priorityBus&&!isExit(car))continue;
      car.feederStopDistance=control(car).stop;
      car.holdForOfficer=car.distance>=control(car).stop-.01;
    }
  };
  state.observeFeederOfficer=()=>{
    if(!admitted)return;
    if(admitted.distance<state.lanes[admitted.lane].length&&
      admitted.distance-(admitted.bodyLength??1.35)/2<control(admitted).release)return;
    admitted.feederMergePassed=true;delete admitted.feederStopDistance;admitted.holdForOfficer=false;
    gate.passed++;admitted=null;gate.admittedId=null;
  };
}
