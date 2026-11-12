import { pointAt, routeAt, SHUTTLE_HOME } from './clearImageSource.js';
import { obstacleConnector, avoidsObstacles, lotRings, inPolygon, join, nearestIndex } from './sourceRouting.js';
import { C_LOOP_STOPS, buildCLoopCircuits } from './cShuttleLoop.js';
export const SHUTTLE_STOPS = [
  {id:'home',lot:'a',label:'Lot A home · derived shuttle endpoints',point:SHUTTLE_HOME,provenance:'derived from source #3/#30 starts and #29 end; no home point traced'},
  ...[['bSouth','b',45],['bNorth','b',46]].map(([id,lot,index])=>({id,lot,label:`${lot.toUpperCase()} · ${id}`,point:pointAt(index),sourceIndex:index})),
  ...Object.entries(C_LOOP_STOPS).map(([id,stop])=>({id,lot:'c',label:`C · ${id}`,point:stop.point,
    sourceIndex:stop.sourceIndex,routeSource:'images/ExitPathsAndC.json#50',originalPoint:stop.originalPoint,
    provenance:'Original source pickup; drivable access spur from new C loop'})),
];
const stops=Object.fromEntries(SHUTTLE_STOPS.map(s=>[s.id,s.point]));
export const avoidsShuttleObstacles=avoidsObstacles;
export const internalPath=(lot,start,end)=>obstacleConnector(start,end,`Lot ${lot.toUpperCase()} internal join`);
export const onLotGround=(lot,p)=>avoidsObstacles(p)&&lotRings(lot).some(r=>inPolygon(p,r));
const connect=(a,b,label)=>obstacleConnector(a,b,`shuttle ${label}`);
const leg=(points,stop)=>({points,stop});
let circuits;
export function buildShuttleCircuits() {
  if(circuits)return circuits;
  // #25 is a complete B loop via both pickup approaches. #24 is a complete
  // bypass variant kept as evidence, not an invented reverse of #3.
  const b=routeAt(25),south=nearestIndex(b,stops.bSouth),north=nearestIndex(b,stops.bNorth);
  const bOut=join(connect(stops.home,b[0],'home to #25'),b.slice(0,south+1),connect(b[south],stops.bSouth,'B South dwell'));
  const bAcross=join(connect(stops.bSouth,b[south],'B South rejoin'),b.slice(south,north+1),connect(b[north],stops.bNorth,'B North dwell'));
  const bBack=join(connect(stops.bNorth,b[north],'B North rejoin'),b.slice(north),connect(b.at(-1),stops.home,'#25 home closure'));
  circuits={b:[leg(bOut,'bSouth'),leg(bAcross,'bNorth'),leg(bBack,'home')], ...buildCLoopCircuits()};
  return circuits;
}
let routes;
export function buildShuttleRoutes() {
  if(routes)return routes;
  const c=buildShuttleCircuits();routes={};
  for(const id of ['bSouth','bNorth','cRoundabout','cNorth','cSouth']) {
    const legs=c[id.startsWith('b')?'b':id==='cRoundabout'?'cNorth':id],k=legs.findIndex(l=>l.stop===id);
    routes[id]={outbound:join(...legs.slice(0,k+1).map(l=>l.points)),inbound:join(...legs.slice(k+1).map(l=>l.points)),provisionalInternalAisles:true,
      provenance:id.startsWith('b')?'source #25 B loop; explicit obstacle-checked pickup connectors':
        'ExitPathsAndC #50 C loop with original source pickups; #30 approach / #29 return; ground-checked pickup spurs'};
  }
  return routes;
}
