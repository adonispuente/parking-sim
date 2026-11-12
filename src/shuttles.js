import { buildShuttleCircuits, SHUTTLE_STOPS } from './shuttleRoutes.js';
import { busesPassThrough } from './vehicleInteractions.js';
import { createShuttleDemand } from './shuttleDemand.js';

const stopPoints=Object.fromEntries(SHUTTLE_STOPS.map(stop=>[stop.id,stop.point]));
const countOf=value=>Math.max(0,Math.min(5,Math.trunc(Number(value) || 0)));
// A keyed sample, not a shared RNG stream: playback is independent of frame rate,
// the order in which buses finish legs, and changes to the active fleet size.
const visitRandom=(bus,stop)=>{
  let hash=(Math.imul(bus.number,0x9e3779b1)^Math.imul(bus.visits+1,0x85ebca6b)^Math.imul(bus.trips+1,0xc2b2ae35))>>>0;
  for(let i=0;i<stop.length;i++)hash=Math.imul(hash^stop.charCodeAt(i),16777619)>>>0;
  hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;
  return (hash>>>0)/0x100000000;
};
const pickupDwell=(bus,config,stop)=>{
  // Preserve the old 12-second default as a compatibility sentinel. Explicit
  // non-default values (including zero) remain exact for existing callers.
  const override=Number(config.dwellSeconds);
  if(config.randomDwell!==true&&config.dwellSeconds!=null&&Number.isFinite(override)&&(config.randomDwell===false||override!==12))
    return Math.max(0,override);
  return 30+30*visitRandom(bus,stop);
};

export function serviceShuttleBreak(state) {
  const preset=state.serviceController?.preset;
  const config=state.shuttleConfig??{};
  if(!preset||config.serviceBreakEnabled===false)return {enabled:false,active:false};
  const after=Math.max(0,Number(config.serviceBreakAfterMinutes??45));
  const duration=Math.max(0,Number(config.serviceBreakMinutes??10));
  const start=(preset.startMinute-preset.beginMinute+after)*60;
  const end=start+duration*60;
  return {enabled:true,active:state.clock>=start&&state.clock<end,
    startMinute:preset.startMinute+after,endMinute:preset.startMinute+after+duration,
    remainingSeconds:Math.max(0,end-state.clock)};
}

export function attachShuttles(state, makeLane, options={}) {
  const circuits=buildShuttleCircuits();
  const laneIds=Object.fromEntries(Object.entries(circuits).map(([circuit,legs])=>[
    circuit,legs.map((leg,index)=>{
      const id=state.lanes.length;
      state.lanes.push(makeLane(leg.points,`Shuttle · ${circuit} · leg ${index+1} → ${leg.stop}`));
      return id;
    }),
  ]));
  state.shuttleConfig={enabled:true,activeCount:5,bFullPercent:100,dwellSeconds:12,
    cDirection:'auto',dispatchDuringDepartures:true,dispatchMode:'fixed',
    serviceBreakEnabled:true,serviceBreakAfterMinutes:45,serviceBreakMinutes:10,...options};
  state.shuttles=Array.from({length:5},(_,i)=>({id:`shuttle-${i+1}`,number:i+1,
    phase:'home',readyAt:i*20+(i===0?0:Math.floor(visitRandom({number:i+1,visits:0,trips:0},'initial')*7)),trips:0,visits:0,stop:null,circuit:null,leg:0,
    dwellStop:'home',stationary:stopPoints.home}));
  state.setShuttleConfig=config=>{Object.assign(state.shuttleConfig,config);};
  const tripSeconds=Object.fromEntries(Object.entries(laneIds).map(([id,lanes])=>[
    id,lanes.reduce((sum,index)=>sum+state.lanes[index].length/2.5,0)+135,
  ]));
  const demand=createShuttleDemand(state,tripSeconds);
  state.observeShuttleParking=car=>demand.register(car,true);
  demand.update();demand.publish();
  const demandMode=()=>state.shuttleConfig.dispatchMode==='demand';
  let rotation=0;
  let nextHomeLaunch=0;
  const cDirection=()=>{
    const requested=state.shuttleConfig.cDirection;
    if(requested==='north'||requested==='south')return requested;
    if(requested==='rotate')return rotation++%2?'south':'north';
    const occupancy=state.zoneOccupancy??{};
    const north=(Number(occupancy.cNorth)||0)+(Number(occupancy.cFirstNorth)||0);
    const south=(Number(occupancy.cSouth)||0)+(Number(occupancy.cFirstSouth)||0);
    if(north!==south)return north>south?'north':'south';
    return rotation++%2?'south':'north';
  };
  state.shuttleDispatch=live=>{
    if(demandMode())return 'demand-responsive';
    const b=live.find(lot=>lot.id==='b');
    const full=state.occupancy.b >= b.capacity*Math.max(1,Math.min(100,Number(state.shuttleConfig.bFullPercent)||100))/100;
    // Cars cannot enter a full B, but riders still need a B pickup during dismissal.
    const departing=state.phase==='departure'||state.servicePhase==='transition'||state.transitionActive===true;
    const keepB=state.shuttleConfig.dispatchDuringDepartures&&departing&&state.occupancy.b>0;
    return (!b.open||full)&&!keepB?'all-c':countOf(state.shuttleConfig.activeCount)<=3?'two-b-one-c':'four-b-one-c';
  };
  const blockedStart=(index, launchingBus)=>{
    const start=state.lanes[index].path.getPointAt(0);
    return state.cars.some(car=>{
      if(busesPassThrough(launchingBus,car))return false;
      const lane=state.lanes[car.lane],p=lane.path.getPointAt(Math.min(1,car.distance/lane.length));
      return p.distanceTo(start)<((car.bodyLength??1.35)+2.9)/2+1.25;
    });
  };
  const launch=(bus)=>{
    const index=laneIds[bus.circuit][bus.leg];
    if(blockedStart(index,{...bus,fleetBus:true}))return false;
    state.cars.push({id:bus.id,lane:index,distance:0,phase:'shuttle',shuttle:true,
      fleetBus:true,bodyLength:2.9,speed:2.5,busNumber:bus.number,target:bus.stop});
    bus.phase=bus.leg===0?'outbound':'circuit';bus.stationary=null;
    if(bus.leg===0)nextHomeLaunch=state.clock+15;
    return true;
  };
  state.prepareShuttles=live=>{
    demand.update();
    const mode=state.shuttleDispatch(live);state.shuttleDispatchMode=mode;
    const serviceBreak=serviceShuttleBreak(state);state.shuttleBreak=serviceBreak;
    const active=state.shuttleConfig.enabled?countOf(state.shuttleConfig.activeCount):0;
    for(const bus of state.shuttles) {
      const retiring=bus.number>active;
      // Already in motion: complete the current circuit, then hold at home.
      if(state.cars.some(car=>car.id===bus.id))continue;
      if(bus.circuit&&bus.leg>0) {
        // A reduced fleet leaves any remote pickup via its remaining legs.
        if(state.clock>=bus.readyAt||retiring||!state.shuttleConfig.enabled)launch(bus);
        continue;
      }
      if(retiring||!state.shuttleConfig.enabled||serviceBreak.active) {
        // Finish remote legs above, then hold safely at home. Never halt a bus
        // in moving traffic or teleport it home when the break begins.
        if(bus.leg===0){bus.circuit=null;bus.demandAssignment=null;}
        bus.phase=serviceBreak.active?'service-break':'home';
        bus.dwellStop='home';bus.stationary=stopPoints.home;continue;
      }
      if(state.clock<bus.readyAt)continue;
      if(state.clock<nextHomeLaunch)continue;
      if(bus.circuit) {launch(bus);continue;}
      if(demandMode()) {
        const requested=state.shuttleConfig.cDirection;
        const allowed=requested==='north'?['b','cNorth']:requested==='south'?['b','cSouth']:undefined;
        const decision=demand.choose(allowed);
        demand.reserve(bus,decision);
        if(!decision.area){bus.phase='demand-hold';bus.dwellStop='home';bus.stationary=stopPoints.home;continue;}
        bus.circuit=decision.area;bus.stop=decision.area==='b'?'bSouth':decision.area;
        bus.leg=0;launch(bus);continue;
      }
      const bAssignment=mode!=='all-c'&&bus.number<=(mode==='two-b-one-c'?2:4);
      bus.circuit=bAssignment?'b':`c${cDirection()==='north'?'North':'South'}`;
      demand.reserve(bus,{area:bus.circuit,reason:'Fixed-split comparison assignment'});
      bus.stop=bAssignment?'bSouth':bus.circuit;
      bus.leg=0;launch(bus);
    }
    demand.publish();
  };
  state.completeShuttle=car=>{
    const bus=state.shuttles.find(item=>item.id===car.id);
    const leg=circuits[bus.circuit][bus.leg];
    demand.pickup(bus,leg.stop);
    bus.visits+=leg.stop==='home'?0:1;
    bus.stop=leg.stop==='home'?null:leg.stop;
    bus.dwellStop=leg.stop;bus.stationary=stopPoints[leg.stop];
    bus.lastDwellSeconds=pickupDwell(bus,state.shuttleConfig,leg.stop);
    bus.readyAt=state.clock+bus.lastDwellSeconds;
    // C's volunteer makes the branch choice at the roundabout, not back at A.
    // Both C circuits share this first leg; changing branch here is continuous.
    if(leg.stop==='cRoundabout') {
      if(demandMode()) {
        const requested=state.shuttleConfig.cDirection;
        const allowed=requested==='north'?['cNorth']:requested==='south'?['cSouth']:['cNorth','cSouth'];
        const decision=demand.choose(allowed,bus);
        // With no new uncovered demand retain the reserved branch, not a new road.
        if(decision.area){demand.reserve(bus,decision);bus.circuit=decision.area;}
      } else {
        bus.circuit=`c${cDirection()==='north'?'North':'South'}`;
        demand.reserve(bus,{area:bus.circuit,reason:'Fixed-mode C branch selection'});
      }
    }
    bus.leg++;
    if(bus.leg===circuits[bus.circuit].length) {
      bus.phase='home-dwell';bus.trips++;bus.circuit=null;bus.leg=0;bus.stop=null;bus.demandAssignment=null;
    } else bus.phase='remote-dwell';
    demand.publish();
  };
  state.shuttleLaneIds=laneIds;
}
