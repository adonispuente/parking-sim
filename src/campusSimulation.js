import { selectArrivalAccess } from './trafficPolicy.js';
import { attachShuttles } from './shuttles.js';
import { advanceSharedTraffic } from './sharedTraffic.js';
import { ZONE_BY_ID, GENERAL_CAPACITY, blankZones, distributeInitialOccupancy, lotTotals, chooseZone } from './parkingZones.js';
import { createServiceController, seededFraction, serviceArrivalPriorities } from './sundayServices.js';
import { zoneArrivalRoute, zoneDepartureRoute, redirectedArrivalRoute } from './parkingRoutes.js';
import { onStreet } from './pavementRouting.js';
import { attachLotAControl, attachMainPositionToLane } from './lotAControl.js';

const ids=['a','b','c'];
export function createZonedCampus(options, makeLane, legacyLanes) {
  const state={lanes:[...legacyLanes],cars:[],clock:0,entered:[0,0,0],exited:[0,0,0],departed:{a:0,b:0,c:0},departedBySource:[0,0,0],
    waiting:[0,0,0],arrivalQueues:[[],[],[]],pendingIntent:[null,null,null],credit:[0,0,0],occupancy:{a:0,b:0,c:0},reserved:{a:0,b:0,c:0},parked:{a:0,b:0,c:0},assignments:{a:0,b:0,c:0},
    denied:0,overflow:0,sentAway:0,sentAwayBySource:[0,0,0],atCapacity:false,badgePercent:Math.max(0,Math.min(100,Number(options.badgePercent)||0)),
    badgeParking:0,badgeReserved:0,pendingCategory:[null,null,null],phase:options.phase??'arrival',mode:'campus',routeHistory:[],parkedVehicles:[],
    zoneOccupancy:distributeInitialOccupancy(options.initialOccupancy,options.initialZoneOccupancy),zoneReserved:blankZones(),
    zonePreferences:{a:'auto',b:'auto',c:'auto',...options.zonePreferences},closedZones:[],gateStatus:{a:false,b:false,c:false},routingIssues:[],redirected:0,
  };
  const service=options.service?.enabled?createServiceController(options.service,state.zoneOccupancy):null;
  state.serviceController=service;state.transitionActive=service?.isTransition??false;
  const sync=()=>{
    state.occupancy=lotTotals(state.zoneOccupancy);state.parked={...state.occupancy};
    state.reserved=lotTotals(state.zoneReserved);state.badgeParking=state.zoneOccupancy.aBadge;state.badgeReserved=state.zoneReserved.aBadge;
  };
  sync();attachLotAControl(state);let sequence=0,manualFeederCount=0;
  service?.tick(state);state.gateStatus={...(service?.gated??{a:false,b:false,c:false})};
  for(const [zone,count] of Object.entries(state.zoneOccupancy))for(let i=0;i<count;i++) {
    const target=ZONE_BY_ID[zone].lot,badge=zone==='aBadge';
    state.parkedVehicles.push({id:sequence++,source:null,target,zone,access:badge?'badgeA':{a:'a',b:'bWest',c:'cWest'}[target],badge,badgePool:badge,
      phase:'parked',initialStaged:true,cohort:'previous',readyAt:service?service.departureReadyAt(sequence,target):0});
  }
  if(options.shuttles)attachShuttles(state,makeLane,{...options.shuttles,...(service?{activeCount:service.preset.activeBuses}:{} )});
  state.setPhase=phase=>{state.phase=['arrival','departure','mixed'].includes(phase)?phase:'arrival';};
  state.setZonePreferences=preferences=>Object.assign(state.zonePreferences,preferences);
  state.departurePolicy={b:'split',c:'split',...options.departurePolicy};
  state.setDeparturePolicy=policy=>Object.assign(state.departurePolicy,policy);
  const routeLanes=new Map();
  const getLane=(key,zone,out=false)=>{
    const origin=key==='eCWest'?'Equity Entrance → C staffed entrance':key==='e2CWest'?'Equity entrance/exit 2 → C staffed entrance':key;
    const name=`${out?'Departure':'Arrival'} · ${origin} · ${zone}`;
    const cached=routeLanes.get(name);
    if(cached instanceof Error)throw cached;
    if(cached===undefined) {
      try {
        const points=out?zoneDepartureRoute(key,zone):zoneArrivalRoute(key,zone);
        const index=state.lanes.length,lane=makeLane(points,name);
        if(['aNorth','aSouth'].includes(zone) &&
          !attachMainPositionToLane(lane,points,out?zone:'aMain'))
          throw new Error('Lot A route misses Lot A Main Position');
        state.lanes.push(lane);routeLanes.set(name,index);
      } catch(error) {
        // Geometry is immutable for this simulation. An unresolved route stays
        // visible in routingIssues, but must not run A* again for every queued
        // car on every substep. Restarting the scenario clears this cache.
        routeLanes.set(name,error instanceof Error?error:new Error(String(error)));
        throw routeLanes.get(name);
      }
    }
    return routeLanes.get(name);
  };
  const logIssue=error=>{const text=error.message;if(!state.routingIssues.includes(text))state.routingIssues.push(text);};
  const startClear=index=>{
    const path=state.lanes[index];
    return !state.cars.some(car=>{
      if(car.lane===index)return car.distance<2.9;
      const p=state.lanes[car.lane].path.getPointAt(Math.min(1,car.distance/state.lanes[car.lane].length));
      return p.distanceTo(path.path.getPointAt(0))<1.6;
    });
  };
  const departureAccess=car=>{
    if(car.badgePool)return 'badgeA';
    if(car.target==='b')return state.departurePolicy.b==='north'||(state.departurePolicy.b==='split'&&['bNorth','bPocket'].includes(car.zone))?'bNorth':'bWest';
    if(car.target==='c')return state.departurePolicy.c==='east'||(state.departurePolicy.c==='split'&&ZONE_BY_ID[car.zone].side==='south')?'cEast':'cWest';
    return car.access;
  };
  state.step=(delta,rates=[0,0,0],lotSettings)=>{
    const dt=Math.max(0,Math.min(.1,Number(delta)||0));state.clock+=dt;
    const live=ids.map(id=>{
      const item=(lotSettings??options.lotSettings??[]).find(x=>x.id===id||x.id===`lot-${id}`);
      return {id,capacity:GENERAL_CAPACITY[id],open:item?.open!==false};
    });
    sync();service?.tick(state);
    state.gateStatus={...(service?.gated??{a:false,b:false,c:false})};
    const open=id=>live.find(s=>s.id===id).open&&!state.gateStatus[id];
    const zoneFor=(lot,badge=false)=>chooseZone(lot,state.zoneOccupancy,state.zoneReserved,{category:badge?'badge':'general',preferred:state.zonePreferences[lot],closed:state.closedZones});
    // Ready buses get first safe launch opportunity, then departures, then
    // arrivals. An occupied start still blocks a bus; priority is not teleporting.
    if(service&&state.shuttleConfig)Object.assign(state.shuttleConfig,{activeCount:service.preset.activeBuses,dispatchDuringDepartures:service.isTransition});
    state.prepareShuttles?.(live);
    const canDepart=service?service.isTransition:state.phase!=='arrival';
    const attemptedDepartures=new Set();
    if(canDepart)for(let i=0;i<state.parkedVehicles.length;i++) {
      const parked=state.parkedVehicles[i];
      if(service&&(parked.cohort!=='previous'||parked.readyAt>state.clock))continue;
      const key=departureAccess(parked),request=`${key}:${parked.zone}`;let index;
      // A route has one shared launch point. If its first eligible car is
      // blocked (or just launched), later cars cannot launch this substep either.
      if(attemptedDepartures.has(request))continue;
      attemptedDepartures.add(request);
      try{index=getLane(key,parked.zone,true);}catch(error){logIssue(error);continue;}
      if(!startClear(index))continue;
      state.parkedVehicles.splice(i--,1);state.zoneOccupancy[parked.zone]--;sync();
      state.cars.push({...parked,lane:index,access:key,routeName:state.lanes[index].name,phase:'departing',distance:0,
        speed:2.6+seededFraction(parked.id)*.5,exitDirection:['a','badgeA','bWest'].includes(key)?'feeder-north':'equity-east'});
    }
    const choose=(source,badge,parkingIntent='general')=>{
      if(badge&&(options.accessPolicy?.blackPermit?.badge??true)&&live[0].open&&zoneFor('a',true))return {target:'a',zone:'aBadge',badgePool:true};
      if(badge)return null; // Badge permission never creates general spaces in a full badge zone.
      const priorities=serviceArrivalPriorities(service?.preset.id,source,parkingIntent,options.arrivalPriority);
      for(const target of priorities)if(open(target)){
        const zone=zoneFor(target);if(zone)return {target,zone,badgePool:false};
      }
      return null;
    };
    // Reroute before crossing a driveway. Cars already inside remain in their lot.
    // Reservations protect spaces while vehicles are en route.
    for(const car of state.cars.filter(c=>c.phase==='arrival'&&!c.fleetBus)) {
      if(car.badgePool)continue;
      if(open(car.target)){car.holdForGate=false;continue;}
      const old=state.lanes[car.lane],p=old.path.getPointAt(Math.min(1,car.distance/old.length));
      const pixel=[p.x*735/113.6,p.z*735/113.6];if(!onStreet(pixel))continue;
      state.zoneReserved[car.zone]--;sync();
      const next=choose(car.source,false,car.parkingIntent);
      if(!next){state.zoneReserved[car.zone]++;car.holdForGate=true;continue;}
      const selection=selectArrivalAccess({target:next.target,source:car.source,policy:options.accessPolicy});
      try {
        const route=redirectedArrivalRoute(pixel,selection.route,next.zone),index=state.lanes.length;
        const lane=makeLane(route,`Redirected · ${next.zone}`);
        if(['aNorth','aSouth'].includes(next.zone)&&!attachMainPositionToLane(lane,route,'aMain'))
          throw new Error('Redirected Lot A route misses Lot A Main Position');
        state.lanes.push(lane);
        Object.assign(car,next,{access:selection.access,lane:index,distance:0,holdForGate:false,routeName:state.lanes[index].name});
        state.zoneReserved[next.zone]++;state.redirected++;
      }catch(error){state.zoneReserved[car.zone]++;car.holdForGate=true;logIssue(error);}
      sync();
    }
    for(let source=0;source<3;source++) {
      if(!service&&state.phase==='departure')continue;
      if(!service){state.credit[source]+=dt*Math.max(0,Number(rates[source])||0)/60;const n=Math.floor(state.credit[source]);state.credit[source]-=n;state.waiting[source]+=n;}
      if(!state.waiting[source])continue;
      const request=state.arrivalQueues[source][0];
      if(!state.pendingIntent[source])state.pendingIntent[source]=request?.parkingIntent??(source===0&&manualFeederCount%10===9?'corporate':'general');
      let parkingIntent=state.pendingIntent[source];
      if(!state.pendingCategory[source])state.pendingCategory[source]=source===0&&(!request||parkingIntent==='general')&&seededFraction(sequence+37)*100<state.badgePercent?'badge':'general';
      // The Corporate bypass quota applies to general traffic, not authorized
      // badge arrivals. Keep manual badge-only scenarios eligible for Black Permit.
      if(state.pendingCategory[source]==='badge')parkingIntent=state.pendingIntent[source]='general';
      const badge=state.pendingCategory[source]==='badge',next=choose(source,badge,parkingIntent);
      if(!next) {
        const generalFull=ids.every(id=>!zoneFor(id));
        if(generalFull&&!badge){const n=state.waiting[source];state.sentAway+=n;state.sentAwayBySource[source]+=n;state.denied+=n;state.overflow+=n;state.waiting[source]=0;state.arrivalQueues[source]=[];state.pendingCategory[source]=null;state.pendingIntent[source]=null;}
        continue;
      }
      const selection=selectArrivalAccess({target:next.target,source,category:badge?'badge':'general',policy:options.accessPolicy});let index;
      try{index=getLane(selection.route,next.zone);}catch(error){logIssue(error);continue;}
      if(!startClear(index))continue;
      const car={id:sequence++,lane:index,routeName:state.lanes[index].name,phase:'arrival',distance:0,source,...next,access:selection.access,badge,
        parkingIntent,cohort:'current',speed:2.5+seededFraction(sequence)*.65};
      state.zoneReserved[next.zone]++;state.assignments[next.target]++;state.cars.push(car);
      state.routeHistory.push({id:car.id,source,target:car.target,zone:car.zone,access:car.access,arrivalRoute:car.routeName,badge,badgePool:car.badgePool,parkingIntent});
      state.waiting[source]--;state.entered[source]++;state.arrivalQueues[source].shift();state.pendingCategory[source]=null;state.pendingIntent[source]=null;
      if(source===0&&!request&&!badge)manualFeederCount++;
      sync();
    }
    state.prepareLotAControl();
    advanceSharedTraffic(state,dt);
    state.observeLotAControl();
    state.cars=state.cars.filter(car=>{
      if(car.distance<state.lanes[car.lane].length)return true;
      if(car.fleetBus){state.completeShuttle(car);return false;}
      if(car.phase==='arrival') {
        state.exited[car.source]++;state.zoneReserved[car.zone]--;state.zoneOccupancy[car.zone]++;
        state.parkedVehicles.push({...car,phase:'parked',parkedAt:state.clock,readyAt:Infinity});
      } else {state.departed[car.target]++;if(car.source!==null)state.departedBySource[car.source]++;}
      return false;
    });
    sync();state.atCapacity=ids.every(id=>!zoneFor(id));
    state.zoneStats=Object.fromEntries(Object.keys(ZONE_BY_ID).map(id=>[id,{occupied:state.zoneOccupancy[id],reserved:state.zoneReserved[id],capacity:ZONE_BY_ID[id].capacity}]));
  };
  return state;
}
