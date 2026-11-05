import { VECTOR_ROUTES, STREET_SECTIONS } from './vectorRoutes.js';
import { internalPath } from './shuttleRoutes.js';
import { streetPath } from './pavementRouting.js';
import { ZONE_BY_ID } from './parkingZones.js';
import { A_DEPARTURE_MERGE } from './lotAControl.js';

// Reviewable zone staging points, NOT surveyed stalls. Internal paths are
// obstacle-avoiding estimates until aisles are independently traced.
export const ZONE_STAGING = Object.freeze({
  aNorth:[195,50],aSouth:[70,150],aBadge:[224,218],
  bSouth:[305,270],bBanana:[420,240],bPocket:[420,170],bNorth:[400,86],
  cFirstNorth:[480,95],cFirstSouth:[488,253],cNorth:[650,95],cSouth:[620,253],
});
const join=(...parts)=>parts.flat().filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>.001);
const cache=new Map();
export function zoneArrivalRoute(key,zone) {
  const id=`in:${key}:${zone}`;if(cache.has(id))return cache.get(id);
  const road=VECTOR_ROUTES.arrival[key],end=ZONE_STAGING[zone],lot=ZONE_BY_ID[zone].lot;
  // B's volunteers always send general arrivals through the southern aisle,
  // even when their selected parking zone is farther north.
  const waypoints=zone==='aBadge'?[road.at(-1),[190,250],end]:lot==='a'?[road.at(-1),A_DEPARTURE_MERGE,end]:lot==='b'?[road.at(-1),[294,228],[305,267],...(zone==='bSouth'?[]:[[358,296],[420,240]]),end]:[road.at(-1),end];
  const internal=join(...waypoints.slice(1).map((p,i)=>internalPath(lot,waypoints[i],p)));
  const result=join(road,internal);cache.set(id,result);return result;
}
export function zoneDepartureRoute(access,zone) {
  const id=`out:${access}:${zone}`;if(cache.has(id))return cache.get(id);
  const base=VECTOR_ROUTES.departure[access];
  const controlled=access==='a'&&['aNorth','aSouth'].includes(zone);
  const result=controlled
    ? join(internalPath('a',ZONE_STAGING[zone],A_DEPARTURE_MERGE),internalPath('a',A_DEPARTURE_MERGE,base[0]),base)
    : join(internalPath(ZONE_BY_ID[zone].lot,ZONE_STAGING[zone],base[0]),base);
  cache.set(id,result);return result;
}
export function redirectedArrivalRoute(current,key,zone) {
  const arrival=zoneArrivalRoute(key,zone);
  const base=VECTOR_ROUTES.arrival[key];
  // Safest available entry to the destination route is its last street station;
  // use a pavement path to its earliest access point, never a cross-lot shortcut.
  const approach=base[Math.max(0,STREET_SECTIONS.arrival[key]-1)];
  const index=arrival.findIndex(p=>p===approach||Math.hypot(p[0]-approach[0],p[1]-approach[1])<.001);
  return join([current],streetPath(current,approach),arrival.slice(Math.max(0,index)));
}
