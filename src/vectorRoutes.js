import { routeAt, pointAt } from './clearImageSource.js';
import { drivingPrefix, nearestIndex, join, obstacleConnector } from './sourceRouting.js';
import { streetPath, onStreet } from './pavementRouting.js';
export const vectorToTrace=p=>[...p];
const prefixTo=(index,point)=>{
  const raw=drivingPrefix(index),k=nearestIndex(raw,point);
  return join(raw.slice(0,k+1),obstacleConnector(raw[k],point,`route #${index} to canonical station`));
};
const aMain=pointAt(57),bEntrance=pointAt(61),cEntrance=pointAt(63);
const a=prefixTo(0,aMain),badgeA=drivingPrefix(2),bWest=prefixTo(4,bEntrance),cWest=prefixTo(8,cEntrance);
const eCWest=prefixTo(9,cEntrance),e2CWest=prefixTo(10,cEntrance);
// Equity -> A/B lacks its own complete trace. Compose the source Equity origin
// with the destination's traced street approach; only the road join is derived.

// Keep the inbound feeder trace out of an Equity connector: join at its road-side
// destination station instead of sending Equity traffic down a northbound feeder.
const bRoad=routeAt(4)[8],aRoad=routeAt(0)[1];
const equityApproach=index=>routeAt(index).slice(0,-2);
const toB=index=>{const approach=equityApproach(index);return join(approach,streetPath(approach.at(-1),bRoad),obstacleConnector(bRoad,bEntrance,'Equity to B entrance'));};
const toA=()=>{const approach=equityApproach(9);return join(approach,streetPath(approach.at(-1),aRoad),a.slice(1));};
const arrival={a,badgeA,bWest,bNorth:bWest,cWest,cEast:cWest,eCWest,e2CWest,eCEast:eCWest,eB:toB(9),eBMain:toB(9),e2BMain:toB(10),eA:toA()};
const departure={a:routeAt(18).slice(nearestIndex(routeAt(18),aMain)),badgeA:routeAt(20),bWest:routeAt(17),bNorth:routeAt(11),cWest:routeAt(13),cEast:routeAt(15)};
export const VECTOR_ROUTES=Object.freeze({arrival,departure});
export const ACCESS_THROATS=Object.freeze(Object.fromEntries(['a','badgeA','bWest','bNorth','cWest','cEast'].map(key=>[key,{arrival:arrival[key].slice(-2),departure:departure[key].slice(0,2)}])));
export const STREET_SECTIONS={arrival:Object.fromEntries(Object.entries(arrival).map(([key,points])=>[key,Math.max(1,points.length-1)])),departure:Object.fromEntries(Object.keys(departure).map(key=>[key,1]))};
// Leading source vertices outside the traced street polygons: the source origin
// approaches from beyond the mapped street (e.g. #10 starts past the traced
// Equity edge). Disclosed as an untraced approach, not claimed as street.
const leadIn=points=>{let i=0;while(i<points.length-1&&!onStreet(points[i]))i++;return i;};
export const ROUTE_METADATA=Object.freeze({
  offMapLeadIn:Object.fromEntries(Object.entries(arrival).map(([key,points])=>[key,leadIn(points)])),
  equityOrigins:{west:routeAt(9).slice(0,2),south:routeAt(10).slice(0,2)},
  arrivalOrigin:Object.fromEntries(Object.keys(arrival).map(key=>[key,key.startsWith('e2')?'south':key.startsWith('e')?'west':'feeder'])),
  arrivalAccess:{a:'a',badgeA:'badgeA',bWest:'bWest',bNorth:'bWest',cWest:'cWest',cEast:'cWest',eCWest:'cWest',e2CWest:'cWest',eCEast:'cWest',eB:'bWest',eBMain:'bWest',e2BMain:'bWest',eA:'a'},
  cStaffedEntrance:[cEntrance],cEquityEntrance:[cEntrance],
  provenance:'EverythingClearImage routes + explicit obstacle-checked source-frame station/Equity connectors; no older geometry',
});
