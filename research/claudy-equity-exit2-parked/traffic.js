import * as THREE from 'three';
import { tracedFeatures, traceWorldPoint } from './tracedMap.js';
import { VECTOR_ROUTES, vectorToTrace } from './vectorRoutes.js';
import { createZonedCampus } from './campusSimulation.js';
import { indexLanePath } from './lanePath.js';
import { onStreet, inPolygon } from './pavementRouting.js';
import { avoidsObstacles } from './sourceRouting.js';
import { shapeAt } from './clearImageSource.js';

const point = ([x,y]) => { const [wx,wz]=traceWorldPoint([x,y]); return new THREE.Vector3(wx,.6,wz); };
// Removed: legacy CENTERLINE/makeLanes preview (old pre-migration coordinates,
// y>1118 outside the 1374x1118 source frame; no importer).
export const PAVEMENT = tracedFeatures.find(f=>/feeder road/i.test(f.label))?.points ?? [];
export function insidePavement([x,z]) { let inside=false; for(let i=0,j=PAVEMENT.length-1;i<PAVEMENT.length;j=i++){const [a,b]=PAVEMENT[i],[c,d]=PAVEMENT[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;} return inside; }
// Right-hand travel lanes. Source traces are single centerlines drawn in either
// direction, so opposing cars/buses on a street shared one line and stalemated.
// Street runs are resampled (<= LANE_STEP_PX), offset along a smoothed tangent
// normal with a smoothed street-centering shift, and points whose offset would
// reverse travel (inner side of a tight bend) are dropped, so curved lanes keep
// one consistent cross-section and cannot fold or self-intersect. Raw source
// points never change; lots/stations are untouched (Main is never offset).
export const KEEP_RIGHT_PX=6;
export const LANE_STEP_PX=4;
// Corporate Drive (#56) and Equity Drive (#55) are two-way streets (Commander,
// 2026-11-06). Their paved width (40-54 px on the Corporate west stretch,
// research/claudy-two-way-diagnosis-2026-11-06.md) fits two directions, but a
// 6 px offset puts opposing lanes ~12 px apart, below bus/bus body clearance
// (12.5 px), so the model behaved single-file. On these two streets each
// direction sits 9 px right of centre (opposing 18 px = 1.49 world), still
// bounded by the measured-room guard below. Feeder Road and lots are unchanged.
export const TWO_WAY_KEEP_RIGHT_PX=9;
const TWO_WAY_STREETS=[55,56].map(i=>shapeAt(i).points);
export const onTwoWayStreet=p=>TWO_WAY_STREETS.some(r=>inPolygon(p,r));
// Feeder Road (#54) has three lanes (Commander, 2026-11-06): church-bound cars
// queue in the outer northbound lane, and exiting cars use the middle lane to
// pass that queue. Lot B west departures turn north onto Feeder, the same
// direction as Alpha arrivals, so with one keep-right lane they joined the
// arrival queue (B departure 416 held by arrival 1172). On Feeder only, those
// departures sit this many px LEFT of centre (negative = left of travel), the
// mirror of the arrivals' KEEP_RIGHT_PX: ~12 px (1.0 world) between them at the
// B exit, over the 0.9 conflict width (research/claudy-feeder-middle-plan-2026-11-07.md).
// Arrivals, Lot A departures, Main and every clearance rule are unchanged.
export const FEEDER_MIDDLE_OUTBOUND_PX=-6;
const FEEDER_STREET=shapeAt(54).points;
export const onFeederStreet=p=>inPolygon(p,FEEDER_STREET);
export const usesFeederMiddleLane=name=>/^Departure · bWest · /.test(name);
// Equity entrance/exit 2 driveway (south end of the C/B Equity approach).
// Arrivals spawn and departures leave the campus at ~(1032.6,1105.7), joined to
// Equity Drive (#55) by one traced chord that lies OUTSIDE every mapped polygon
// for ~30 px (1033,1076)->(1032.6,1106). Off-street points are never offset, so
// both directions shared one centreline 0.03 world apart and deadlocked head-on
// (eleven 700/1029/750 = 887/1207/599; research/claudy-equity-c-diagnosis-2026-11-07.md).
// The real driveway is two-way width (Commander, 2026-11-07). Inside this box
// only, keep-right treats the driveway as two-way pavement (same 9 px offset as
// Equity Drive). The 30 px box width is an assumption: the map has no polygon.
export const EQUITY_EXIT2_CONNECTOR=Object.freeze([[1018,1076],[1048,1076],[1048,1112],[1018,1112]]);
export const onEquityExit2Connector=p=>inPolygon(p,EQUITY_EXIT2_CONNECTOR);
const drivable=p=>onStreet(p)||onEquityExit2Connector(p);
const twoWayAt=p=>onTwoWayStreet(p)||onEquityExit2Connector(p);
const edgeAt=(p,nx,ny,sign)=>{for(let s=1;s<=30;s++)if(!drivable([p[0]+nx*s*sign,p[1]+ny*s*sign]))return s-.5;return null;};
const unit=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy);return n<1e-9?null:[dx/n,dy/n];};
function resampleStreets(coords) {
  const out=[coords[0]];
  for(let i=1;i<coords.length;i++) {
    const a=coords[i-1],b=coords[i];
    if(drivable(a)||drivable(b)) {
      const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/LANE_STEP_PX));
      for(let k=1;k<n;k++)out.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);
    }
    out.push(b);
  }
  return out;
}
export function keepRight(coords,offset=KEEP_RIGHT_PX,feederOffset=null) {
  if(coords.length<2)return coords.map(p=>[...p]);
  const pts=resampleStreets(coords),n=pts.length,street=pts.map(p=>drivable(p));
  const feederLane=i=>feederOffset!==null&&onFeederStreet(pts[i]);
  // Smoothed tangent: sum of unit vectors over +-2 neighbours (bend-consistent).
  const normals=pts.map((p,i)=>{
    let tx=0,ty=0;
    for(let k=Math.max(1,i-1);k<=Math.min(n-1,i+2);k++){const u=unit(pts[k-1],pts[k]);if(u){tx+=u[0];ty+=u[1];}}
    const m=Math.hypot(tx,ty);return m<1e-9?null:[-ty/m,tx/m]; // right of travel, image y down
  });
  const raw=pts.map((p,i)=>{
    if(!street[i]||!normals[i])return null;
    const [nx,ny]=normals[i],right=edgeAt(p,nx,ny,1),left=edgeAt(p,nx,ny,-1);
    // Edge beyond the 30 px probe = wide pavement: allow the full intended offset
    // (two-way target on Corporate/Equity), not the narrower default.
    const target=offset===KEEP_RIGHT_PX&&twoWayAt(p)?TWO_WAY_KEEP_RIGHT_PX:offset;
    return right!==null&&left!==null?{shift:(right-left)/2,room:(right+left)/2}:{shift:0,room:target+3};
  });
  // Smooth the centering shift along each street run (window +-3).
  const section=raw.map((r,i)=>{
    if(!r)return null;let s=0,c=0,room=Infinity;
    for(let k=Math.max(0,i-3);k<=Math.min(n-1,i+3);k++)if(raw[k]){s+=raw[k].shift;c++;room=Math.min(room,raw[k].room);}
    return {shift:s/c,room};
  });
  const shifted=pts.map((p,i)=>{
    if(!section[i])return [...p];
    const [nx,ny]=normals[i],{shift,room}=section[i];
    if(feederLane(i)) {
      // Signed middle-lane offset, bounded by measured room like keep-right;
      // falls back toward centre, never past the pavement or an obstacle.
      const limit=Math.max(0,room-3),s0=Math.sign(feederOffset)*Math.min(Math.abs(feederOffset),limit);
      for(const s of [s0,s0/2,0]) {
        const q=[p[0]+nx*(shift+s),p[1]+ny*(shift+s)];
        if(drivable(q)&&avoidsObstacles(q))return q;
      }
      return [...p];
    }
    const want=offset===KEEP_RIGHT_PX&&twoWayAt(p)?TWO_WAY_KEEP_RIGHT_PX:offset;
    for(const s of [Math.min(want,room-3),Math.min(offset,room-3),offset/2,0]) {
      if(s<0)continue;const q=[p[0]+nx*(shift+s),p[1]+ny*(shift+s)];
      if(drivable(q)&&avoidsObstacles(q))return q;
    }
    return [...p];
  });
  // Drop interior points whose offset step runs against the source direction
  // (inner-bend fold). Endpoints and every non-street point are kept.
  const result=[shifted[0]];let last=0;
  for(let i=1;i<n;i++) {
    const keep=i===n-1||!street[i];
    const src=unit(pts[last],pts[i]),step=unit(result.at(-1),shifted[i]);
    if(keep||(src&&step&&src[0]*step[0]+src[1]*step[1]>.2)){result.push(shifted[i]);last=i;}
  }
  return result;
}
const lane=(coords,name,metadata={})=>{
  const shifted=keepRight(coords.map(vectorToTrace),KEEP_RIGHT_PX,usesFeederMiddleLane(name)?FEEDER_MIDDLE_OUTBOUND_PX:null);
  // A redirect starts at the actual built pose, not a new offset of that pose.
  // Blend into the new corridor instead of creating an instantaneous side-step.
  if(metadata.startPoint&&shifted.length>1) {
    const delta=[metadata.startPoint[0]-shifted[0][0],metadata.startPoint[1]-shifted[0][1]];
    let distance=0;
    const original=shifted.map(p=>[...p]);
    for(let i=0;i<shifted.length;i++) {
      if(i)distance+=Math.hypot(original[i][0]-original[i-1][0],original[i][1]-original[i-1][1]);
      const blend=Math.max(0,1-distance/24);
      shifted[i]=[original[i][0]+delta[0]*blend,original[i][1]+delta[1]*blend];
    }
  }
  const pts=shifted.map(point),path=new THREE.CurvePath();
  for(let i=1;i<pts.length;i++)if(pts[i].distanceTo(pts[i-1])>.00001)path.add(new THREE.LineCurve3(pts[i-1],pts[i]));
  indexLanePath(path);
  return {path,length:path.getLength(),name,...metadata};
};
const arrivalNames={a:'Feeder → A public',badgeA:'Feeder → A Black Permit',bWest:'Feeder → B west',cWest:'Feeder → C staffed entrance',eCWest:'Equity Entrance → C staffed entrance',e2CWest:'Equity entrance/exit 2 → C staffed entrance'};
const legacyLanes=Object.entries(arrivalNames).map(([key,name])=>lane(VECTOR_ROUTES.arrival[key],name));
export function createCampusTraffic(options={}) {return createZonedCampus(options,lane,legacyLanes);}
export function createTraffic(){return createCampusTraffic();}
export function createTenCarDemo(options={}){
  const state=createCampusTraffic({...options,service:{enabled:false}});state.mode='demo';
  const step=state.step;let issued=0,nextArrival=0;
  state.step=(dt,rates,lotSettings)=>{
    if(state.phase!=='departure'&&issued<10&&state.clock>=nextArrival){const source=issued%3===2?(issued%2?2:1):0;state.waiting[source]++;issued++;nextArrival+=3;}
    step(dt,[0,0,0],lotSettings);
  };
  return state;
}
