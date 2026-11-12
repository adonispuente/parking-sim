// Black Permit position #60 lets outbound shuttles out of the Black Permit driveway.
// The officer stands at the driveway mouth on Corporate Drive and stops BOTH directions
// (eastbound Feeder arrivals, westbound departures, and badge cars turning in) before
// they reach the bus's crossing, starting while the bus is still approaching, so the
// crossing is empty when the bus arrives. Cars already inside the crossing keep going
// and clear it. This is a LOCAL release, never an alternating valve along Corporate.
import { pointAt, WORLD_SCALE } from './clearImageSource.js';
import { trafficClass } from './trafficPriority.js';

// Scene units (WORLD_SCALE ≈ .083 per image px). Provisional estimates, not surveyed.
export const PERMIT_WARNING = 12;   // start holding when the bus is this far before the merge (~4-5 s)
const BOX_BEHIND = 3, BOX_AHEAD = 6; // bus path treated as the crossing, around the merge
const BOX_REACH = 1.4;               // another lane is "in the crossing" within this distance of the bus path
const STOP_SETBACK = 1.0;            // stop line this far before that lane enters the crossing

export function attachBlackPermitControl(state) {
  const position=pointAt(60),x=position[0]*WORLD_SCALE,z=position[1]*WORLD_SCALE;
  const merges=new WeakMap(),boxes=new Map(),entries=new Map();
  const gate=state.blackPermitControl={position,name:'Black Permit shuttle release',waitingBuses:0,heldArrivals:0,heldDepartures:0,reason:'free flow'};
  const control=car=>{
    const lane=state.lanes[car.lane];if(!lane)return null;
    if(!merges.has(lane)) {
      let gap=Infinity,merge=0;
      const n=Math.max(1,Math.ceil(lane.length/.2));
      for(let i=0;i<=n;i++) {
        const p=lane.path.getPointAt(i/n),d=Math.hypot(p.x-x,p.z-z);
        if(d<gap){gap=d;merge=lane.length*i/n;}
      }
      merges.set(lane,gap<=4?{merge,release:Math.min(lane.length,merge+4)}:null);
    }
    return merges.get(lane);
  };
  const outbound=car=>{
    if(trafficClass(car)!=='shuttle')return false;
    const c=control(car);if(!c)return false;
    const lane=state.lanes[car.lane],before=lane.path.getPointAt(Math.max(0,c.merge-5)/lane.length);
    const after=lane.path.getPointAt(Math.min(lane.length,c.merge+6)/lane.length);
    // Leaving the Black Permit driveway north of Corporate toward B/C, not a
    // returning bus on the opposing through lane. No route-name dependency.
    return before.z<z+1&&after.x>before.x+1;
  };
  // The bus's crossing: its own path from just before the merge to just past it.
  const boxFor=busLane=>{
    if(!boxes.has(busLane)) {
      const lane=state.lanes[busLane],{merge}=merges.get(lane);
      const from=Math.max(0,merge-BOX_BEHIND),to=Math.min(lane.length,merge+BOX_AHEAD),pts=[];
      for(let d=from;d<=to+1e-9;d+=.3)pts.push(lane.path.getPointAt(Math.min(1,d/lane.length)));
      boxes.set(busLane,pts);
    }
    return boxes.get(busLane);
  };
  // Where another lane first enters that crossing (lane distance), or null if it never does.
  const entryFor=(busLane,laneIndex)=>{
    const key=`${busLane}:${laneIndex}`;
    if(!entries.has(key)) {
      let entry=null;
      if(laneIndex!==busLane) {
        const lane=state.lanes[laneIndex],box=boxFor(busLane),n=Math.max(1,Math.ceil(lane.length/.2));
        for(let i=0;i<=n&&entry===null;i++) {
          const p=lane.path.getPointAt(i/n);
          if(box.some(b=>Math.hypot(b.x-p.x,b.z-p.z)<=BOX_REACH))entry=lane.length*i/n;
        }
      }
      entries.set(key,entry);
    }
    return entries.get(key);
  };
  state.prepareBlackPermitControl=()=>{
    for(const car of state.cars){delete car.permitStopDistance;car.holdForPermit=false;}
    const buses=state.cars.filter(car=>{
      const c=control(car);if(!c||!outbound(car))return false;
      return c.merge-car.distance<=PERMIT_WARNING&&car.distance-(car.bodyLength??2.9)/2<c.release;
    });
    gate.waitingBuses=buses.length;gate.heldArrivals=0;gate.heldDepartures=0;
    gate.reason=buses.length?'stop both directions · release shuttle':'free flow';
    if(!buses.length)return;
    for(const car of state.cars) {
      if(car.fleetBus||trafficClass(car)==='shuttle')continue;
      let stop=Infinity;
      for(const bus of buses) {
        const entry=entryFor(bus.lane,car.lane);
        if(entry===null)continue;
        const line=Math.max(0,entry-STOP_SETBACK);
        // Already at or inside the crossing: keep going and clear it.
        if(car.distance>line+.1)continue;
        stop=Math.min(stop,line);
      }
      if(!Number.isFinite(stop))continue;
      car.permitStopDistance=stop;car.holdForPermit=car.distance>=stop-.01;
      if(car.holdForPermit)car.phase==='departing'?gate.heldDepartures++:gate.heldArrivals++;
    }
  };
}
