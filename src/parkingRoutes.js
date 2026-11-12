import { routeAt, pointAt, shapeAt } from './clearImageSource.js';
import { VECTOR_ROUTES, STREET_SECTIONS } from './vectorRoutes.js';
import { internalPath } from './shuttleRoutes.js';
import { streetPath } from './pavementRouting.js';
import { ZONE_BY_ID } from './parkingZones.js';
import { drivingPrefix, nearestIndex, distance, inPolygon, avoidsObstacles, join, obstacleConnector, segmentDistance, sourceCorridorJoin, clearSegment, drivableAllowed, CONNECTOR_PROVENANCE } from './sourceRouting.js';
import { recordRouteUse } from './vehicleRouteCatalog.js';
import { C_THROAT, C_STAGING_TARGET, B_NORTH_DIRECT_PATH } from './layoutOverlay.js';
import { A_SOUTH_CENTRELINE, A_SOUTH_CENTRELINE_PROVENANCE } from './aSouthCentreline.js';
const ZONE_SOURCE={aNorth:39,aSouth:38,aBadge:37,bSouth:40,bBanana:41,bPocket:42,bNorth:44,cFirstNorth:51,cFirstSouth:52,cNorth:51,cSouth:52};
const ARRIVAL_SOURCE={aNorth:1,aSouth:0,aBadge:2,bSouth:4,bBanana:5,bPocket:6,bNorth:7};
// #63 lies beside the street/lot boundary. Generic pavement A* snapped back
// onto Corporate and entered at x1288 near the shuttle-only exit. Use #8's
// actual inside endpoint. This station-to-trace join is derived, roof checked.
export const C_ENTRANCE_INTERIOR=routeAt(8).at(-1);
export const C_ENTRANCE_JOIN=Object.freeze([pointAt(63),C_ENTRANCE_INTERIOR]);
if(!clearSegment(...C_ENTRANCE_JOIN))throw new Error('C staffed entrance throat touches a source obstacle');
CONNECTOR_PROVENANCE.push({context:'C staffed entrance #63 to #8 interior',mode:'staffed-entrance-throat',nonpavement:true,
  source:'derived station-to-trace join (not a traced aisle); #63 is beside #8, pavement polygon omits mouth',start:C_ENTRANCE_JOIN[0],end:C_ENTRANCE_INTERIOR,points:2});
// Commander rule (2026-11-07): the Lot C entrance is two roads split by a median,
// so cars enter and exit at the same time. Source traces already carry the two
// roadways: entry #8/#9/#10 down the west side (ends ~[976,125]) and exit #13 up
// the east side (starts ~[995,132]), 15-19 px apart (> CONFLICT_WIDTH ~10.9 px).
// The painted/raised median is NOT visible in Clear Image (canopy shadow), so its
// tail (tailY) and the throat box are provisional model parameters. Parking
// staging must sit south of the tail; staging inside the throat made entering and
// exiting cars meet head-on there. Throat box and staging target now come from
// images/layout-overlay.json (stage:c-throat, stage:c-staging-target). The box is
// a staging exclusion, NOT a no-drive median: both roadways run through it.
export const C_MEDIAN=Object.freeze({nose:pointAt(63),entryEnd:C_ENTRANCE_INTERIOR,exitStart:routeAt(13)[0],
  xMin:C_THROAT.xMin,xMax:C_THROAT.xMax,tailY:C_THROAT.tailY,stagingTarget:C_STAGING_TARGET,provisional:true});
export const C_MEDIAN_PROVENANCE=Object.freeze([{context:'C entrance median',provisional:true,
  source:'entry trace #8 vs exit trace #13 offset; median not visible in Clear Image; tailY/throat box are model parameters',
  entryEnd:C_MEDIAN.entryEnd,exitStart:C_MEDIAN.exitStart,tailY:C_MEDIAN.tailY}]);
export const inCThroat=p=>p[0]>=C_MEDIAN.xMin&&p[0]<=C_MEDIAN.xMax&&p[1]<C_MEDIAN.tailY;
function staging(zone) {
  const ring=shapeAt(ZONE_SOURCE[zone]).points,mask=shapeAt(53).points;
  const target=ARRIVAL_SOURCE[zone]!==undefined?drivingPrefix(ARRIVAL_SOURCE[zone]).at(-1):C_MEDIAN.stagingTarget;
  const inZone=p=>inPolygon(p,ring)&&avoidsObstacles(p)&&(!zone.startsWith('c')||(inPolygon(p,mask)===zone.startsWith('cFirst')&&!inCThroat(p)));
  if(inZone(target))return target;
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);let best=null;
  for(let y=Math.ceil(Math.min(...ys));y<=Math.max(...ys);y+=4)for(let x=Math.ceil(Math.min(...xs));x<=Math.max(...xs);x+=4) {
    const p=[x,y];if(inZone(p)&&(!best||distance(p,target)<distance(best,target)))best=p;
  }
  if(!best)throw new Error(`No source-derived staging ground for ${zone}`);
  return best;
}
export const ZONE_STAGING=Object.freeze(Object.fromEntries(Object.keys(ZONE_SOURCE).map(zone=>[zone,staging(zone)])));
// Confirmed rule: B arrivals circulate via B South before Banana/Pocket/North.
// Checkpoint = source-derived B South staging point (#4 prefix end in #40).
export const B_SOUTH_CHECKPOINT=ZONE_STAGING.bSouth;
const cache=new Map(),main=pointAt(57);
const connect=(lot,a,b)=>internalPath(lot,a,b);
// Commander-approved side-by-side travel, derived from one fixed pavement
// centreline. Drawn source traces remain untouched. No auto-connector fallback.
export const A_SOUTH_SPLIT_PROVENANCE=Object.freeze({
  ...A_SOUTH_CENTRELINE_PROVENANCE, halfGapPx:6.2, terminalSamples:18,
  mode:'shared-centreline-split', provisional:true,
});
let aSouthLanes=null;
function aSouthLoop(part) {
  if(!aSouthLanes) {
    const samples=[A_SOUTH_CENTRELINE[0]];
    for(let i=1;i<A_SOUTH_CENTRELINE.length;i++) {
      const a=A_SOUTH_CENTRELINE[i-1],b=A_SOUTH_CENTRELINE[i];
      const n=Math.max(1,Math.ceil(distance(a,b)));
      for(let k=1;k<=n;k++)samples.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);
    }
    if(distance(samples[0],ZONE_STAGING.aSouth)>.001||distance(samples.at(-1),main)>.001)
      throw new Error('A South centreline terminals do not match staging/Main');
    const lane=sign=>samples.map((p,i)=>{
      const a=samples[Math.max(0,i-4)],b=samples[Math.min(samples.length-1,i+4)];
      const length=distance(a,b)||1;
      const offset=sign*A_SOUTH_SPLIT_PROVENANCE.halfGapPx*Math.min(1,Math.min(i,samples.length-1-i)/18);
      return [p[0]-(b[1]-a[1])/length*offset,p[1]+(b[0]-a[0])/length*offset];
    });
    const departure=lane(1),arrival=lane(-1).reverse();
    for(const line of [departure,arrival])for(let i=1;i<line.length;i++) {
      if(!clearSegment(line[i-1],line[i])||!clearSegment(line[i-1],line[i],drivableAllowed))
        throw new Error(`A South split lane not clear/drivable at segment ${i}`);
    }
    aSouthLanes={departure,arrival};
  }
  return aSouthLanes[part];
}
// A source vertex within this radius of Main is the same station. Rejoining it
// after Main made the admitted car double back into the opposing held queue.
export const MAIN_STATION_MERGE_PX=12;
// Revised A traces moved 6.4–7.5px from unchanged staff #57. The generic 6px
// corridor then grid-detoured across the opposite aisle. Accept only this local
// station residual, within the existing 12px station association; keep roofs and
// source-line bounds checked and record the wider derived corridor explicitly.
export function mainStationCorridorJoin(a,b,source,context) {
  const direct=sourceCorridorJoin(a,b,source,context);if(direct)return direct;
  const line=routeAt(source);
  const residual=p=>Math.min(...line.slice(1).map((q,i)=>segmentDistance(p,line[i],q)));
  const corridor=Math.max(6,residual(a),residual(b));
  if(corridor>MAIN_STATION_MERGE_PX||!clearSegment(a,b,p=>avoidsObstacles(p)&&residual(p)<=corridor+1e-6))return null;
  CONNECTOR_PROVENANCE.push({context,mode:'station-source-corridor',nonpavement:false,
    source:`derived Main station join (not a traced aisle) within ${corridor.toFixed(3)}px of source #${source}`,corridorPx:corridor,start:a,end:b,points:2});
  return [a,b];
}
const mainSplit=raw=>{
  const k=nearestIndex(raw,main),near=distance(raw[k],main)<MAIN_STATION_MERGE_PX;
  return {before:near?Math.max(1,k):k+1,after:near?Math.min(raw.length-1,k+1):k};
};
// A arrivals cross Main exactly ONCE. Project Main onto the raw source line
// (segment projection, not nearest vertex): keep raw vertices strictly before
// the projected segment, drop every vertex within the station radius on either
// side, resume at the first vertex past it. The old vertex split kept #1's
// [230,99] (14px > 12px radius) after Main, so the route went Main -> east
// vertex -> grid back west: a second pass beside Main. The gate then measured
// merge on the wrong pass (lead trace: car 953 held at px 221.8,94.66 inside
// the position while admitted North 188 yielded to it).
export function mainCrossing(raw) {
  let seg=1,bd=Infinity;
  for(let i=1;i<raw.length;i++){const s=segmentDistance(main,raw[i-1],raw[i]);if(s<bd){bd=s;seg=i;}}
  let b=seg-1;while(b>0&&distance(raw[b],main)<MAIN_STATION_MERGE_PX*1.5)b--;
  let a=seg;while(a<raw.length-1&&distance(raw[a],main)<MAIN_STATION_MERGE_PX*1.5)a++;
  return {road:raw.slice(0,b+1),rest:raw.slice(a)};
}
// Join that may not revisit the station: a straight source-corridor join if
// valid, else the obstacle connector, rejected only if it LEAVES the station
// radius and then comes back within it (that IS the double-back). Grid nodes
// that snap a few px from Main at the join's own start/end are not a revisit.
function stationJoin(a,b,route,context) {
  const direct=mainStationCorridorJoin(a,b,route,context);if(direct)return direct;
  const path=connect('a',a,b);
  const toMain=distance(b,main)<.001;
  // Walk toward Main for approach joins, away from it for exit joins.
  const walk=toMain?[...path].reverse():path;
  let left=false;
  for(let i=1;i<walk.length;i++) {
    const p=walk[i-1],q=walk[i],n=Math.max(1,Math.ceil(distance(p,q)/1));
    for(let j=0;j<=n;j++) {
      const s=[p[0]+(q[0]-p[0])*j/n,p[1]+(q[1]-p[1])*j/n],r=distance(s,main);
      if(r>MAIN_STATION_MERGE_PX)left=true;
      else if(left&&r<MAIN_STATION_MERGE_PX*.75)
        throw new Error(`Unavailable ${context}: join re-enters Lot A Main station`);
    }
  }
  return path;
}
// One canonical A exit tail: Main -> source #18 westbound outbound. Source #19's
// nearest vertex sits 12.77px from Main (outside the merge radius), so splitting
// #19 rejoined EAST of Main and U-turned through the held North queue. Both A
// exit streams merge at Main and share this tail; their approaches stay separate.
export const A_EXIT_TAIL=(()=>{const raw=routeAt(18),{after}=mainSplit(raw);return raw.slice(after);})();
// Main -> exit tail stays on source #18's own corridor. The pavement grid
// detoured south (px y~101) through the held South approach.
let aExitJoin=null;
const mainToExit=()=>aExitJoin??=(mainStationCorridorJoin(main,A_EXIT_TAIL[0],18,'Lot A Main to source #18 exit')??connect('a',main,A_EXIT_TAIL[0]));
// Lot A Main median (Commander, 2026-11-06: "In Lot A main entrance, theres a
// similar median that allows cars to exit while cars are entering").
// Diagnosis research/claudy-lot-a-main-diagnosis-2026-11-06.md: every general A
// arrival enters along (179.6,68.9)->Main and every A departure leaves along
// Main->(177.6,63.5). Neither stretch is on a street polygon, so keepRight never
// separates them: the gate-held arrival sat 0.8-0.9px from the outbound
// centreline and the admitted departure yielded to its body forever.
// Fix: on that shared stretch only, arrivals keep to the right of travel on the
// approach side and departures to the right of travel on the exit side.
//  - Main stays an exact vertex (the median nose). A point NOSE_HOLD px out stays
//    unshifted so mainStopBack's into/out direction and fold test are unchanged.
//  - Offset ramps to full by NOSE_HOLD+RAMP px, holds to REACH-RAMP, tapers to 0
//    at REACH; points beyond REACH are untouched.
//  - PROVISIONAL model parameters, NOT surveyed pavement: HALF_PX 7 is chosen so
//    opposing centrelines clear CONFLICT_WIDTH (.9 world ~10.9px). REACH 70
//    covers the held body (12-30px), the queued car (to ~55px) and the exit's
//    north turn at 49px. Each shifted point must stay on drivable source ground
//    if the original point was (else at least off roofs); a failure steps the
//    offset down (1, 5/7, 1/2, 0) and is RECORDED in A_MEDIAN_PROVENANCE, never
//    silent. Clearance is checked on built lanes by tests/lot-a-main-median.test.js.
// rampPx 6 (not 10): with a 10px ramp both paths fanned from the nose at ~60deg
// and the held front bumper (12.4px out) sat 10.1px from the departure's ramp,
// under CONFLICT_WIDTH. Full offset by 8px clears it (focused test, built lanes).
// Asymmetric split inPx 3 / outPx 9 (not 7/7): the aSouth departure stages along
// (164,88)->(216,104), SOUTH of the arrival line. A 7px southward arrival shift
// put the held arrival front 7.8px from that leg (was ~15px unshifted), and a
// held aSouth departure there would block an admitted arrival. Arrivals move
// 3px south, departures 9px north: same 12px separation on the shared stretch.
// Revised trace: move 1px of the provisional split from inbound to outbound.
// This retains 12px total separation while clearing the South staging leg.
export const A_MEDIAN=Object.freeze({inPx:2,outPx:10,reachPx:70,rampPx:6,noseHoldPx:2,stepPx:2,provisional:true});
export const A_MEDIAN_PROVENANCE=[];
function medianSide(points,part,context) {
  const k=points.findIndex(p=>distance(p,main)<.001);
  if(k<0)return points;
  // Walk away from Main: reversed approach for arrivals, exit side for departures.
  const walk=part==='before'?points.slice(0,k+1).reverse():points.slice(k);
  const s=[0];for(let i=1;i<walk.length;i++)s.push(s[i-1]+distance(walk[i-1],walk[i]));
  // Nose hold only on the approach side: mainStopBack reads the arrival's
  // into-Main direction. On the exit side an unshifted 2px stub pointed the
  // departure straight at the held arrival's front bumper (10.1px < CONFLICT_WIDTH);
  // departures diverge from Main itself. Departure stop-back stays 1.7 (tested).
  const total=s.at(-1),{rampPx,stepPx}=A_MEDIAN,noseHoldPx=part==='before'?A_MEDIAN.noseHoldPx:.25,reach=Math.min(A_MEDIAN.reachPx,total);
  const halfPx=part==='before'?A_MEDIAN.inPx:A_MEDIAN.outPx;
  const stat={context,part,reachPx:+reach.toFixed(2),samples:0,reduced:0,minFactor:1,offPavement:0};
  if(reach<=noseHoldPx){A_MEDIAN_PROVENANCE.push(stat);return points;}
  const at=x=>{
    x=Math.max(0,Math.min(total,x));
    for(let i=1;i<walk.length;i++)if(s[i]>=x){const t=(x-s[i-1])/((s[i]-s[i-1])||1);return [walk[i-1][0]+(walk[i][0]-walk[i-1][0])*t,walk[i-1][1]+(walk[i][1]-walk[i-1][1])*t];}
    return walk.at(-1);
  };
  const ramp=x=>Math.max(0,Math.min(1,(x-noseHoldPx)/rampPx,(reach-x)/rampPx));
  const sign=part==='before'?-1:1; // travel direction relative to the walk
  const xs=[noseHoldPx];for(let x=noseHoldPx+stepPx;x<reach;x+=stepPx)xs.push(x);xs.push(reach);
  const out=[walk[0]];let prev=walk[0];
  for(const x of xs) {
    const p=at(x),a=at(x-3),b=at(x+3),len=distance(a,b)||1;
    const t=[sign*(b[0]-a[0])/len,sign*(b[1]-a[1])/len],right=[-t[1],t[0]]; // image y points down
    const w=ramp(x),paved=drivableAllowed(p);if(!paved)stat.offPavement++;
    let q=p,used=0;
    for(const f of [1,5/7,.5,0]) {
      const c=[p[0]+right[0]*halfPx*w*f,p[1]+right[1]*halfPx*w*f];
      if(f===0||((paved?drivableAllowed(c):avoidsObstacles(c))&&clearSegment(prev,c))){q=c;used=f;break;}
    }
    stat.samples++;
    if(w>0&&used<1){stat.reduced++;stat.minFactor=Math.min(stat.minFactor,used);}
    out.push(q);prev=q;
  }
  for(let i=0;i<walk.length;i++)if(s[i]>reach+1e-9)out.push(walk[i]);
  A_MEDIAN_PROVENANCE.push(stat);
  return part==='before'?join(out.reverse(),points.slice(k+1)):join(points.slice(0,k),out);
}
// Insert the B South checkpoint on the nearest segment of the zone's own traced
// path (at/after index `from`), so the route visits B South along the traced
// aisle instead of a straight join across untraced ground between B polygons.
function spliceCheckpoint(raw,from,point) {
  let best=from+1,bd=Infinity;
  for(let i=from+1;i<raw.length;i++){const s=segmentDistance(point,raw[i-1],raw[i]);if(s<bd){bd=s;best=i;}}
  return {before:raw.slice(from,Math.min(best,raw.length)),after:raw.slice(Math.min(best,raw.length-1))};
}
// B departures whose staging has no traced join to the exit source continue
// FORWARD along a traced one-way B circulation, never reversing an aisle.
// Reversing the arrival aisle (previous fallback) put departures head-on with
// arrivals and shuttles inside B (eleven smoke px 549,408; final smoke same).
//  1. Source #25, the closed B shuttle loop (B South -> Banana -> east
//     perimeter -> north -> [536,355]/[536,367] -> west exit [483,361]). Cars
//     then travel WITH the buses and with #4-#7 arrivals, and reach #17's start
//     [539,332]/[536,362] on the westbound exit side (~25px north of the
//     eastbound entry at y~386).
//  2. Source #7, the full traced B circulation, which also passes [821,115]
//     beside the #11/#12 east exit start [845,120] that #25 does not reach.
// PROVISIONAL: car use of these circulations for departure is inferred from
// the trace (derived policy for the general B exit), not a confirmed field
// rule. No valid join -> the error surfaces in routingIssues, never a grass jump.
export const B_CIRCULATION_SOURCES=Object.freeze([25,7]);
// #7 is a parking tour after vertex 19 [821.8,115.0]: it turns ~90deg west into
// the B North row sweep (765,109 -> 755,149 -> 733,175 -> 686,155 -> 708,127 ->
// 710,113 -> 653,107 ...). drivingPrefix's >120deg cut misses these 90deg rows.
// Departures may use only the perimeter part (0..19); the sweep produced the
// eleven-smoke B North cycle (px 751-821, 109-161).
export const B7_PERIMETER_END=19;
// Sweep = #7 vertices 20-24 only (Commander decision 2026-11-06). Vertices
// 25-26 [710.5,113.4]->[653.9,107.7] are the shared westbound north aisle that
// #25 (B shuttle loop) traces 2.1/2.4px away in the same direction; every
// forward bWest exit must use it, so including them made the check unsatisfiable.
export const B7_ROW_SWEEP=Object.freeze(routeAt(7).slice(B7_PERIMETER_END+1,B7_PERIMETER_END+6));
const circulation=source=>source===7?routeAt(7).slice(0,B7_PERIMETER_END+1):routeAt(source);
export const B_EXIT_PROVENANCE=[];
// PRIMARY B departure approach: an explicit, ordered walk along source #25 (the
// B shuttle loop) to a fixed exit station, NOT the generic pavement grid, which
// treats whole parking polygons as drivable and cut across parked B North rows
// into the #7 sweep (lead diagnostic: cars at [765,109]).
//  - bWest (#17 starts [539.2,332.8], heading south): #25 to [533.0,301.5],
//    the last loop vertex BEFORE #17's start, so the join continues south.
//  - bNorth (#11 starts [844.9,120.1], heading north): #25 to its east-perimeter
//    vertex [846.1,251.3], then a DERIVED straight east-perimeter join north to
//    #11's start (no traced line there; obstacle-checked, provisional).
const B_LOOP=routeAt(25);
export const B_EXIT_STATIONS=Object.freeze({
  bWest:{until:nearestIndex(B_LOOP,[533.0306809223604,301.49474281996936]),perimeter:false},
  bNorth:{until:nearestIndex(B_LOOP,[846.1061088802537,251.25070843673137]),perimeter:true},
});
function bLoopExit(access,zone,start,target) {
  const station=B_EXIT_STATIONS[access];if(!station)return null;
  const order=B_LOOP.map((_,i)=>i).filter(i=>i<=station.until)
    .sort((a,b)=>distance(B_LOOP[a],start)-distance(B_LOOP[b],start)).slice(0,4);
  for(const s of order) {
    // Lead joins must stay short: a long grid lead would tour parked rows again.
    if(distance(start,B_LOOP[s])>90)continue;
    let lead;try{lead=connect('b',start,B_LOOP[s]);}catch{continue;}
    // Never join the loop BACKWARD: bSouth staging [562.9,498.3] sits 7px past
    // #25 vertex 9 [555.8,499.4], so the nearest-vertex lead drove west against
    // #25/#7 (dot -0.82) before turning round. Reject a lead whose final
    // segment opposes the loop's next segment; the next candidate joins ahead.
    if(s<station.until&&lead.length>1) {
      const p=lead.at(-2),q=lead.at(-1),n=B_LOOP[s+1],lp=distance(p,q),ln=distance(q,n);
      if(lp>=1&&ln>=1&&((q[0]-p[0])*(n[0]-q[0])+(q[1]-p[1])*(n[1]-q[1]))/(lp*ln)<-.5)continue;
    }
    const loop=B_LOOP.slice(s,station.until+1),last=loop.at(-1);
    let tail;
    if(station.perimeter) {
      if(!avoidsObstacles(last)||!avoidsObstacles(target)||!clearSegment(last,target))continue;
      tail=[last,target];
    } else {
      try{tail=connect('b',last,target);}catch{continue;}
    }
    B_EXIT_PROVENANCE.push({zone,access,source:25,from:s,to:station.until,
      mode:station.perimeter?'loop+derived-east-perimeter':'loop',provisional:true});
    return join(lead,loop,tail);
  }
  return null;
}
// Commander rule (2026-11-07): B North cars leave north by a direct path, not a
// tour through B South. Parked cars are counts, not stalls: every departure
// launches at its zone's single staging point, and bNorth's ([580.7,328.3],
// #7 vertex 36) is the END of the arrival row tour, the west-arm row farthest
// from #11. #25/#7 form one counter-clockwise loop (bottom east, east spine
// north, top aisle west, west arm south) and lot lanes are not keepRight-offset,
// so every direct route from that point meets arrivals/shuttles head-on
// (measured 0.09-0.44 px; QWEN's straight east line hits roof #43 58x;
// research/bnorth-direct-code-plan.md). North-bound B North departures
// therefore launch at the north rows on the #7 perimeter (vertex 18, inside
// #44, 40 px from #25, 45 px from the row sweep), ride WITH arrivals to vertex
// 19, where arrivals turn west into the rows and departures turn east to #11.
// PROVISIONAL launch abstraction for cars parked in the north rows; not an
// image-verified lane. Applies only to zone bNorth, access bNorth.
// Named S6 overlay lane preserves the three exact pre-migration vertices.
// Section-weighted access selection and the west exit are deliberately untouched.
export const B_NORTH_DIRECT=Object.freeze({start:B_NORTH_DIRECT_PATH[0],via:B_NORTH_DIRECT_PATH[1],provisional:true});
let bNorthBlockedWarned=false;
function bNorthDirectExit(target) {
  const {start,via}=B_NORTH_DIRECT;
  if(distance(B_NORTH_DIRECT_PATH[2],target)>.001)
    throw new Error('lane:b-north-direct: exit join must match the existing bNorth departure source');
  if(!clearSegment(start,via)||!clearSegment(via,target)) {
    // Record the skip so the fallback is visible; fallback order below is unchanged.
    B_EXIT_PROVENANCE.push({zone:'bNorth',access:'bNorth',source:'lane:b-north-direct',mode:'north-rows-direct-blocked',provisional:true});
    if(!bNorthBlockedWarned){bNorthBlockedWarned=true;console.warn('lane:b-north-direct crosses a source obstacle; B North departures use the B loop exit instead');}
    return null;
  }
  B_EXIT_PROVENANCE.push({zone:'bNorth',access:'bNorth',source:'lane:b-north-direct',points:B_NORTH_DIRECT_PATH.length,exitSource:11,
    origin:'#7 v18-19 (pre-S6 literal)',mode:'north-rows-direct',provisional:true});
  return B_NORTH_DIRECT_PATH;
}
function bForwardExit(zone,start,target) {
  for(const source of B_CIRCULATION_SOURCES) {
    const path=circulation(source);
    const order=path.map((_,i)=>i).sort((a,b)=>distance(path[a],start)-distance(path[b],start)).slice(0,6);
    for(const s of order) {
      let m=s;for(let i=s;i<path.length;i++)if(distance(path[i],target)<distance(path[m],target))m=i;
      if(m===s&&s!==path.length-1)continue;
      let lead,tail;
      try{lead=connect('b',start,path[s]);tail=connect('b',path[m],target);}catch{continue;}
      B_EXIT_PROVENANCE.push({zone,source,from:s,to:m,mode:'forward-circulation',provisional:true});
      return join(lead,path.slice(s,m+1),tail);
    }
  }
  throw new Error(`Unavailable Lot B forward exit for ${zone}: no traced #${B_CIRCULATION_SOURCES.join('/#')} join`);
}
export function zoneArrivalRoute(key,zone) {
  const id=`in:${key}:${zone}`;if(cache.has(id))return cache.get(id);
  const lot=ZONE_BY_ID[zone].lot,end=ZONE_STAGING[zone];let points;
  if(lot==='a'&&zone!=='aBadge') {
    const source=ARRIVAL_SOURCE[zone],raw=drivingPrefix(source),{road:rawRoad,rest}=mainCrossing(raw);
    // eA's road may end at or beside Main; trim any tail within the station
    // radius so the approach join is the single entry to Main.
    let road=key==='eA'?VECTOR_ROUTES.arrival.eA:rawRoad;
    if(key==='eA'){let n=road.length;while(n>1&&distance(road[n-1],main)<MAIN_STATION_MERGE_PX*1.5)n--;road=road.slice(0,n);}
    // If the zone's own remaining source is empty, go straight Main -> staging.
    const tail=zone==='aSouth'?aSouthLoop('arrival'):rest.length?join(stationJoin(main,rest[0],source,`Lot A Main to ${zone} source`),rest,connect('a',rest.at(-1),end))
      :stationJoin(main,end,source,`Lot A Main to ${zone} staging`);
    // Approach side of the Main median (see medianSide).
    points=medianSide(join(road,stationJoin(road.at(-1),main,source,`Lot A approach to Main (${zone})`),tail),'before',`in:${key}:${zone}`);
  } else if(lot==='b') {
    const raw=drivingPrefix(ARRIVAL_SOURCE[zone]),entrance=pointAt(61),k=nearestIndex(raw,entrance);
    const road=key.startsWith('e')?VECTOR_ROUTES.arrival[key]:raw.slice(0,k+1);
    // Feeder-origin arrivals (bWest/bNorth) follow the traced entrance-side turn
    // past #61 (median-separated mouth); they no longer drive out to #61's exact
    // point on the median and reverse across the Corporate through lane, which
    // formed the 715 -> shuttle-3 -> 716 cycle. Equity-origin keys keep the join.
    const spur=key.startsWith('e')?join(connect('b',road.at(-1),entrance),connect('b',entrance,raw[k])):[];
    if(zone==='bSouth')
      points=join(road,spur,raw.slice(k),connect('b',raw.at(-1),end));
    else {
      const {before,after}=spliceCheckpoint(raw,k,B_SOUTH_CHECKPOINT);
      points=join(road,spur,before,
        connect('b',before.at(-1)??raw[k],B_SOUTH_CHECKPOINT),connect('b',B_SOUTH_CHECKPOINT,after[0]),after,
        connect('b',raw.at(-1),end));
    }
  } else if(lot==='c') {
    const road=VECTOR_ROUTES.arrival[key];
    if(distance(road.at(-1),pointAt(63))>.001)throw new Error('C arrival bypasses staffed entrance');
    if(zone==='cFirstNorth'||zone==='cNorth') {
      // Clear the entry throat before turning east toward the staging point.
      const waypoint=[C_ENTRANCE_INTERIOR[0],C_STAGING_TARGET[1]];
      const approach=[C_ENTRANCE_INTERIOR,waypoint,end];
      for(let i=1;i<approach.length;i++) {
        if(!clearSegment(approach[i-1],approach[i])||!clearSegment(approach[i-1],approach[i],drivableAllowed))
          throw new Error('C north below-throat waypoint not clear/drivable');
      }
      CONNECTOR_PROVENANCE.push({context:'Lot C north arrival below-throat waypoint',mode:'derived-waypoint',provisional:true,
        source:'C_ENTRANCE_INTERIOR x, C_STAGING_TARGET y; keeps arrival out of departure throat path'});
      points=join(road,C_ENTRANCE_JOIN,approach);
    } else {
      points=join(road,C_ENTRANCE_JOIN,connect('c',C_ENTRANCE_INTERIOR,end));
    }
  } else {
    const road=VECTOR_ROUTES.arrival[key];
    points=join(road,connect(lot,road.at(-1),end));
  }
  recordRouteUse(key,zone,{source:'EverythingClearImage',routeId:ARRIVAL_SOURCE[zone]??(key.startsWith('e2')?10:key.startsWith('e')?9:8),
    reason:'traced driving prefix, row sweeps excluded; explicit obstacle-checked source-frame staging/staff joins'});
  cache.set(id,points);return points;
}
// Lot A North departure approach (Commander 2026-11-10: the Main aisle "is wide
// enough to let 2 directions of cars"; approved "own lane ~12 px south of the
// arrival path", no redraw). The generic staging->Main connector ran 0.03-0.45
// world from the aNorth arrival through (228,84)-(244,80); the gate-held departure
// sat 0.29 world from the admitted arrival's path and the 11:00 service locked at
// 10:36 (research/runs/lot-a-main-gridlock-claud/results.md).
// DERIVED, PROVISIONAL waypoints from the drivable-ground scan
// (research/runs/lot-a-main-repair-claud/scan.mjs) - NOT Commander-traced or
// surveyed. The lane stays on Lot A ground at y~95 (>=14 px south of the arrival
// aisle), crosses the ~4 px lot/street polygon seam at x~241-247 (obstacle-free;
// the old connector crossed the same seam further north) and reaches Main along
// the S5 street from the east. Main and everything after it are unchanged.
export const A_NORTH_DEPARTURE_WAYPOINTS=Object.freeze([[248,95],[238,95]]);
export const A_NORTH_DEPARTURE_PROVENANCE=[];
function aNorthDepartureApproach(start) {
  const pts=[start,...A_NORTH_DEPARTURE_WAYPOINTS,main];
  for(const p of pts)if(!drivableAllowed(p))throw new Error(`Lot A North departure waypoint ${p} is off drivable ground`);
  let seamPx=0;
  for(let i=1;i<pts.length;i++) {
    if(!clearSegment(pts[i-1],pts[i]))throw new Error('Lot A North departure approach touches a source obstacle');
    const len=distance(pts[i-1],pts[i]),n=Math.ceil(len);
    for(let j=0;j<n;j++){const t=(j+.5)/n,p=[pts[i-1][0]+(pts[i][0]-pts[i-1][0])*t,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*t];if(!drivableAllowed(p))seamPx+=len/n;}
  }
  A_NORTH_DEPARTURE_PROVENANCE.push({context:'Lot A North departure approach to Main',mode:'derived-separated-approach',provisional:true,
    source:'derived from drivable-ground scan; Commander-approved separation, not traced',waypoints:A_NORTH_DEPARTURE_WAYPOINTS,seamPx:+seamPx.toFixed(1)});
  CONNECTOR_PROVENANCE.push({context:'Lot A North departure approach to Main',mode:'derived-separated-approach',nonpavement:seamPx>0,
    source:'derived waypoints (not a traced aisle); Commander-approved separate departure lane',start,end:main,points:pts.length});
  return pts;
}
export function zoneDepartureRoute(access,zone) {
  const id=`out:${access}:${zone}`;if(cache.has(id))return cache.get(id);
  const lot=ZONE_BY_ID[zone].lot,start=ZONE_STAGING[zone];let result;
  if(access==='a'&&['aNorth','aSouth'].includes(zone)) {
    // Zone staging -> Main Position (separate approaches) -> shared exit tail,
    // on the exit side of the Main median (see medianSide).
    const approach=zone==='aNorth'?aNorthDepartureApproach(start):aSouthLoop('departure');
    result=medianSide(join(approach,mainToExit(),A_EXIT_TAIL),'after',`out:${access}:${zone}`);
  } else {
    const raw=VECTOR_ROUTES.departure[access];
    let lead=zone==='bNorth'&&access==='bNorth'?bNorthDirectExit(raw[0]):null;
    if(!lead&&lot==='b')lead=bLoopExit(access,zone,start,raw[0]);
    if(!lead) {
      // Zones #25 cannot serve forward (e.g. staging past the exit station)
      // keep the previous direct/forward joins, flagged so it stays visible.
      if(lot==='b')B_EXIT_PROVENANCE.push({zone,access,mode:'grid-or-forward-fallback',provisional:true});
      try{lead=connect(lot,start,raw[0]);}
      catch(error){if(lot!=='b')throw error;lead=bForwardExit(zone,start,raw[0]);}
    }
    result=join(lead,raw);
  }
  cache.set(id,result);return result;
}
export function redirectedArrivalRoute(current,key,zone) {
  const arrival=zoneArrivalRoute(key,zone),base=VECTOR_ROUTES.arrival[key];
  const approach=base[Math.max(0,STREET_SECTIONS.arrival[key]-1)];
  const k=nearestIndex(arrival,approach);
  return join([current],streetPath(current,approach),obstacleConnector(approach,arrival[k],'redirect to source route'),arrival.slice(k));
}
// Join past the Corporate turn; never send a Feeder car back south to an origin.
export function feederReliefRoute(current,key,zone) {
  if(!['bWest','bNorth'].includes(key))throw new Error('Alpha relief requires Feeder-to-Bravo access');
  const arrival=zoneArrivalRoute(key,zone);
  const turn=arrival.findIndex((p,i)=>i>0&&p[0]>=52);
  if(turn<0)throw new Error('Bravo route lacks a Corporate street approach');
  return join(streetPath(current,arrival[turn]),arrival.slice(turn));
}
