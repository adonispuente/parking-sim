import annotation from './campusAnnotations.js';
import { inPolygon, streetPath } from './pavementRouting.js';
import { SHUTTLE_ACCESS } from './vectorRoutes.js';

const shape = label => annotation.shapes.find(s => s.label.toLowerCase() === label.toLowerCase());
export const SHUTTLE_STOPS = [
  ['home', 'a', 'Lot A Shuttle Pickup/Dropoff'],
  ['bSouth', 'b', 'Lot B South Shuttle Pickup'],
  ['bNorth', 'b', 'Lot B North Shuttle pick up'],
  ['cRoundabout', 'c', 'Lot C Round about shuttle'],
  ['cNorth', 'c', 'Lot C North Shuttle pickup'],
  ['cSouth', 'c', 'Lot C South shuttle pickuo'],
].map(([id, lot, label]) => ({ id, lot, label, point: shape(label).points[0] }));
const stopById = Object.fromEntries(SHUTTLE_STOPS.map(s => [s.id, s]));
const roofs = annotation.shapes.filter(s => /building/i.test(s.label)).map(s => s.points);
const blocked = annotation.shapes.filter(s => /blocked off zone/i.test(s.label)).map(s => s.points);
const segmentDistance = (p, a, b) => {
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
};
export const avoidsShuttleObstacles = p => ![...roofs,...blocked].some(r =>
  inPolygon(p,r) || r.some((a,i) => segmentDistance(p,a,r[(i+1)%r.length]) < 1.2));

// These are reviewable pavement corridors, NOT surveyed internal aisle centerlines.
// A's pickup lies outside the broad parking-region annotations. Its western
// forecourt must be connected explicitly, rather than crossing the approved roof.
const corridor = {
  a: [[164,268],[135,263],[106,251],[86,233],[76,210],[83,190],[100,185],stopById.home.point],
  // Estimated internal connectors, not surveyed lanes. The south/perimeter
  // branch joins the north branch without cutting through the B building.
  b: [[294,213],[294,228],[305,267],[358,296],[386,294],[399,280],
    [412,255],[426,227],[435,209],[450,190],stopById.bSouth.point,
    [445,111],[425,87],[319,88],[310,104],[307,209]],
  c: [[516,64],[516,80],[509,74]],
};
const branches={a:[[[87,42],[112,45],[137,55],[154,42],[180,40]],[[103,45],[107,56],[82,95]]],b:[],c:[]};
const grids = new Map();
function grid(lot) {
  if(grids.has(lot)) return grids.get(lot);
  // Include the actual traced driveway polygons, not only parking regions and
  // shuttle driveways. B's north departure throat lies on the parking boundary;
  // its endpoint cannot connect if the labeled exit pavement is excluded.
  const regions=annotation.shapes.filter(s => s.shape_type==='polygon' &&
    (new RegExp(`^Lot ${lot} (north|south|black permit|banana|pocket)$`,'i').test(s.label) ||
      new RegExp(`^Lot ${lot} .*?(entrance|entrace|exit)`,'i').test(s.label))).map(s=>s.points);
  const throats=Object.values(SHUTTLE_ACCESS[lot==='a'?'home':lot]).flat();
  const points=[...corridor[lot],...branches[lot].flat(),...throats];
  // LabelMe's adjoining edges differ by hundredths of a source pixel. Treat
  // pavement as closed polygons with a .05px seam tolerance, still rejecting
  // roofs/blocked areas first. Do not use a broad guessed driveway connector.
  const onGround=p => avoidsShuttleObstacles(p) && (regions.some(r=>inPolygon(p,r) ||
    r.some((a,i)=>segmentDistance(p,a,r[(i+1)%r.length])<=.05)) ||
    points.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<5) ||
    [corridor[lot],...branches[lot]].some(branch=>branch.some((q,i)=>i>0&&segmentDistance(p,branch[i-1],q)<5)));
  const nodes=new Map();
  for(let y=14;y<318;y+=2) for(let x=52;x<684;x+=2) if(onGround([x,y])) nodes.set(`${x},${y}`,[x,y]);
  const result={nodes,onGround,neighbors:new Map(),routes:new Map()};grids.set(lot,result);return result;
}
export function internalShuttlePath(lot,start,end) {
  const {nodes,onGround,neighbors,routes}=grid(lot);
  const routeKey=JSON.stringify([start,end]);
  if(routes.has(routeKey))return routes.get(routeKey);
  const nearest=p=>[...nodes.keys()].reduce((a,b)=>Math.hypot(nodes.get(a)[0]-p[0],nodes.get(a)[1]-p[1])<Math.hypot(nodes.get(b)[0]-p[0],nodes.get(b)[1]-p[1])?a:b);
  const clear=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.5));for(let i=0;i<=n;i++)if(!onGround([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]))return false;return true;};
  const from=nearest(start),to=nearest(end),dist=new Map([[from,0]]),previous=new Map(),open=new Set([from]);
  while(open.size) {
    let id=null,best=Infinity;
    for(const candidate of open) {const p=nodes.get(candidate),q=nodes.get(to);const score=dist.get(candidate)+Math.hypot(p[0]-q[0],p[1]-q[1]);if(score<best){best=score;id=candidate;}}
    open.delete(id);if(id===to)break;
    const a=nodes.get(id);
    if(!neighbors.has(id)) {
      const connected=[];
      for(const dx of [-2,0,2])for(const dy of [-2,0,2]) {
        if(!dx&&!dy)continue;
        const key=`${a[0]+dx},${a[1]+dy}`,b=nodes.get(key);
        if(b&&clear(a,b))connected.push([key,Math.hypot(dx,dy)]);
      }
      neighbors.set(id,connected);
    }
    for(const [key,length] of neighbors.get(id)) {
      const d=dist.get(id)+length;
      if(d>=(dist.get(key)??Infinity))continue;dist.set(key,d);previous.set(key,id);open.add(key);
    }
  }
  if(!dist.has(to))throw new Error(`Disconnected internal shuttle route: ${lot}`);
  const path=[];let key=to;while(key){path.push(nodes.get(key));key=previous.get(key);}path.reverse();
  const result=[start];
  if(!clear(start,path[0]))throw new Error(`Unverified shuttle start connector: ${lot} ${JSON.stringify(start)} → ${JSON.stringify(path[0])}`);
  if(!clear(path.at(-1),end))throw new Error(`Unverified shuttle end connector: ${lot} ${JSON.stringify(path.at(-1))} → ${JSON.stringify(end)}`);
  for(let i=0;i<path.length;) {result.push(path[i]);if(i===path.length-1)break;let j=path.length-1;while(j>i+1&&!clear(path[i],path[j]))j--;i=j;}
  result.push(end);routes.set(routeKey,result);return result;
}
export const internalPath=internalShuttlePath;
const join=(...parts)=>parts.flat().filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>.001);
let cached;
export function buildShuttleRoutes() {
  if(cached)return cached;
  const home=SHUTTLE_ACCESS.home;
  const homeOut=internalPath('a',stopById.home.point,home.departure[0]);
  const homeIn=internalPath('a',home.arrival.at(-1),stopById.home.point);
  cached=Object.fromEntries(SHUTTLE_STOPS.filter(s=>s.id!=='home').map(stop=>{
    const access=SHUTTLE_ACCESS[stop.lot];
    const outbound=join(homeOut,home.departure,streetPath(home.departure.at(-1),access.arrival[0]),access.arrival,internalPath(stop.lot,access.arrival.at(-1),stop.point));
    const inbound=join(internalPath(stop.lot,stop.point,access.departure[0]),access.departure,streetPath(access.departure.at(-1),home.arrival[0]),home.arrival,homeIn);
    return [stop.id,{outbound,inbound,provisionalInternalAisles:true}];
  }));
  return cached;
}

// Full ordered circuits. The last stop of each leg is also its dwell marker.
// Legacy individual-stop outbound/inbound routes above remain unchanged.
let circuits;
export function buildShuttleCircuits() {
  if(circuits)return circuits;
  const home=SHUTTLE_ACCESS.home,b=SHUTTLE_ACCESS.b,c=SHUTTLE_ACCESS.c;
  const out=internalPath('a',stopById.home.point,home.departure[0]);
  const back=internalPath('a',home.arrival.at(-1),stopById.home.point);
  const toLot=access=>join(out,home.departure,streetPath(home.departure.at(-1),access.arrival[0]),access.arrival);
  const toHome=access=>join(access.departure,streetPath(access.departure.at(-1),home.arrival[0]),home.arrival,back);
  const leg=(points,stop)=>({points,stop});
  const bSouth=stopById.bSouth.point,bNorth=stopById.bNorth.point,cRound=stopById.cRoundabout.point;
  circuits={b:[
    leg(join(toLot(b),internalPath('b',b.arrival.at(-1),[294,228]),internalPath('b',[294,228],[305,267]),internalPath('b',[305,267],[358,296]),internalPath('b',[358,296],bSouth)),'bSouth'),
    leg(internalPath('b',bSouth,bNorth),'bNorth'),
    leg(join(internalPath('b',bNorth,b.departure[0]),toHome(b)),'home'),
  ]};
  for(const id of ['cNorth','cSouth']) {
    const pickup=stopById[id].point;
    circuits[id]=[
      leg(join(toLot(c),internalPath('c',c.arrival.at(-1),cRound)),'cRoundabout'),
      leg(internalPath('c',cRound,pickup),id),
      leg(join(internalPath('c',pickup,c.departure[0]),toHome(c)),'home'),
    ];
  }
  return circuits;
}
