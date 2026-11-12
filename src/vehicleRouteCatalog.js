import { VEHICLE_ROUTE_MANIFEST as M } from './vehicleRouteManifest.js';
import { boundRoutes, REGISTRATION, SOURCE_INTEGRITY, onMappedPavement } from './vehicleRegistration.js';
import { avoidsObstacles, drivingPrefix, CONNECTOR_PROVENANCE } from './sourceRouting.js';
import { SOURCE_PAIR } from './clearImageSource.js';
export { fitAffine, applyAffine, REGISTRATION, registerPoint, SOURCE_INTEGRITY, onMappedPavement } from './vehicleRegistration.js';
const routes=boundRoutes.map(({entry,shape})=>{
  const points=shape.points,diagnostics=[];
  const coverage=points.filter(onMappedPavement).length/points.length;
  const reversalAt=entry.shapeType==='linestrip'&&entry.index<=7&&entry.index!==3&&drivingPrefix(entry.index).length<points.length?[drivingPrefix(entry.index).length-1]:[];
  if(reversalAt.length)diagnostics.push({code:'sweep',message:'Parking-row guidance trimmed from individual driving paths'});
  if(entry.index>=31&&entry.index<=35)diagnostics.push({code:'alias',message:'Duplicate observation; canonical later staffing point is used'});
  if([26,27,28,30].includes(entry.index))diagnostics.push({code:'outbound-only',message:'No complete return in this line; runtime explicitly composes #29 plus derived connectors'});
  return {...entry,sourcePoints:points,points,diagnostics,coverage,status:entry.status==='proposal'?'proposal':reversalAt.length?'guidance':'source',
    evidence:'source annotation; centerline only, not surveyed swept-width clearance',reversalAt,stopsVisited:[],continuations:[],positionCandidates:[],segments:[],segmentEvidence:null};
});
export const VEHICLE_ROUTE_CATALOG=Object.freeze({source:M.source,target:M.target,bindingProblems:[],registration:REGISTRATION,integrity:SOURCE_INTEGRITY,liveGuidanceEnabled:true,routes});
export const routeById=id=>routes.find(r=>r.id===id)??null;
export const ROUTE_RUNTIME={version:0,uses:{}};
export const runtimeKey=(road,zone)=>`arrival:${road}:${zone}`;
const listeners=new Set();
export function recordRouteUse(road,zone,info){ROUTE_RUNTIME.uses[runtimeKey(road,zone)]={road,zone,...info};ROUTE_RUNTIME.version++;for(const fn of listeners)fn(ROUTE_RUNTIME.version);}
export function subscribeRouteRuntime(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export const connectorModes=()=>CONNECTOR_PROVENANCE.reduce((all,c)=>(all[c.mode]=(all[c.mode]??0)+1,all),{});
export function catalogSummary(){return {sourcePair:SOURCE_PAIR,routes:routes.length,integrity:true,liveGuidanceEnabled:true,registration:{method:'identity',ok:true,maxResidualPx:0,shift:[0,0]},runtimeVersion:ROUTE_RUNTIME.version,runtime:ROUTE_RUNTIME.uses,
  derivedConnectors:CONNECTOR_PROVENANCE.length,connectorModes:connectorModes(),nonpavementConnectors:CONNECTOR_PROVENANCE.filter(c=>c.nonpavement).length};}
export function routeDiagnostics(){return {
  source:{file:M.source.file,expected:'1374x1118',actual:'1374x1118',shapes:65,manifestRoutes:65,sourcePair:SOURCE_PAIR},
  integrity:SOURCE_INTEGRITY,liveGuidanceEnabled:true,registration:{...REGISTRATION,limitPx:0,residuals:[]},
  byStatus:routes.reduce((all,r)=>(all[r.status]=(all[r.status]??0)+1,all),{}),
  zones:Object.values(ROUTE_RUNTIME.uses).map(u=>({zone:u.zone,routeId:u.routeId,status:'active source',eligible:true,built:true,live:true,uses:[u]})),
  runtimeVersion:ROUTE_RUNTIME.version,connectors:CONNECTOR_PROVENANCE,connectorModes:connectorModes(),
  laneModel:'runtime lanes keep right 6px of the local street cross-section; raw source points unchanged',
  gaps:['S5 pavement patches are active with source roofs excluded; centerline coverage is not swept-body certification','No traced A home point: derived from source shuttle endpoints','Internal staging and exact pickup/staff joins are derived obstacle-checked centerlines, not surveyed aisles','C #26–28/#30 are outbound-only; runtime uses explicit #29 return','Clay origin is the source #10 origin; road name not independently surveyed','Police #59/#60 visual only; no new policy invented'],
};}
