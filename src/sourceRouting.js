// Derived joins are source-frame, obstacle-checked centerlines, NOT traced aisles
// or swept-body clearance. Original source lines remain unchanged in the catalog.
import source, { shapeAt, routeAt, pointAt, IMAGE_SIZE } from './clearImageSource.js';
import { feederSegmentOk, feederGridStepOk, PAVEMENT_PATCHES } from './layoutOverlay.js';
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export const join=(...parts)=>parts.flat().filter((p,i,all)=>!i||distance(p,all[i-1])>.001);
export function inPolygon([x,y],ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [a,b]=ring[i],[c,d]=ring[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
  }
  return inside;
}
export function segmentDistance(p,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  return distance(p,[a[0]+t*dx,a[1]+t*dy]);
}
const roofs=[36,43,50].map(i=>shapeAt(i).points);
export const avoidsObstacles=p=>p[0]>=0&&p[1]>=0&&p[0]<=IMAGE_SIZE.width&&p[1]<=IMAGE_SIZE.height&&
  !roofs.some(r=>inPolygon(p,r)||r.some((a,i)=>segmentDistance(p,a,r[(i+1)%r.length])<1));
export function clearSegment(a,b,allowed=avoidsObstacles) {
  const n=Math.max(1,Math.ceil(distance(a,b)));
  for(let k=0;k<=n;k++)if(!allowed([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]))return false;
  return true;
}
const connectorCache=new Map();
const corners=roofs.flatMap(r=>{
  const center=[0,1].map(axis=>r.reduce((sum,p)=>sum+p[axis],0)/r.length);
  return r.flatMap(p=>{
    const dx=p[0]-center[0],dy=p[1]-center[1],d=Math.hypot(dx,dy)||1;
    return [[p[0]+dx/d*4,p[1]+dy/d*4],...[[4,4],[-4,4],[4,-4],[-4,-4]].map(([x,y])=>[p[0]+x,p[1]+y])];
  });
}).filter(avoidsObstacles);
export const CONNECTOR_PROVENANCE=[];
// Connector modes whose joins may leave traced pavement (nonpavement:true).
// Each is a disclosed, named fallback; any other mode must stay on pavement.
export const NONPAVEMENT_CONNECTOR_MODES=Object.freeze(['roof-avoid-fallback','staffed-entrance-throat']);
// Historical reference points retained for audit/backward-compatible callers.
// S5 Commander-drawn patches now cover these stretches; no active untraced gap.
export const ROAD_GAP_REFERENCES=Object.freeze([
  Object.freeze({id:'lot-a-entrance-road',label:'Lot A entrance road (Feeder north end to Main #57)',
    sourceRoute:0,vertices:Object.freeze([2,3,4,5,6]),sourcePoints:Object.freeze([57])}),
  Object.freeze({id:'equity-exit2-driveway',label:'Equity entrance/exit 2 driveway into Equity Drive',
    sourceRoute:10,vertices:Object.freeze([0]),sourcePoints:Object.freeze([])}),
]);
export const UNTRACED_ROAD_GAPS=Object.freeze([]);
export const untracedGapPoints=id=>{
  const gap=ROAD_GAP_REFERENCES.find(g=>g.id===id);
  if(!gap)throw new Error(`Unknown road gap reference: ${id}`);
  return [...gap.vertices.map(i=>routeAt(gap.sourceRoute)[i]),...gap.sourcePoints.map(pointAt)];
};
export const isDisclosedUntraced=p=>UNTRACED_ROAD_GAPS.some(g=>untracedGapPoints(g.id).some(q=>distance(p,q)<.001));
// Drivable ground = traced lot zones + traced street polygons, minus roofs.
// Connectors prefer this ground; a roof-only straight line across grass/medians
// is a disclosed fallback (nonpavement:true), never a silent default.
const DRIVABLE=[...[37,38,39,40,41,42,44,51,52,53,54,55,56].map(i=>shapeAt(i).points),...PAVEMENT_PATCHES];
export const onDrivable=p=>DRIVABLE.some(r=>inPolygon(p,r));
export const drivableAllowed=p=>onDrivable(p)&&avoidsObstacles(p);
const GRID=4,SNAP=25;let dgrid;
// Feeder is northbound-only: no segment there may move south (image +y).
// Band and tolerance: images/layout-overlay.json oneway:feeder-north.
export const directedOk=feederSegmentOk;
const drivableSegment=(a,b)=>directedOk(a,b)&&clearSegment(a,b,drivableAllowed);
// A roof-only fallback longer than this crosses unknown ground; refuse it so the
// route surfaces in routingIssues instead of driving across grass.
export const MAX_FALLBACK_PX=80;
function drivableGrid() {
  if(dgrid)return dgrid;
  const nodes=[],lookup=new Map();
  for(let y=0;y<=IMAGE_SIZE.height;y+=GRID)for(let x=0;x<=IMAGE_SIZE.width;x+=GRID)
    if(drivableAllowed([x,y])){lookup.set(`${x},${y}`,nodes.length);nodes.push([x,y]);}
  return dgrid={nodes,lookup,neighbors:new Map()};
}
function snapNode(p,{nodes,lookup}) {
  let best=null,bestD=Infinity;
  const cx=Math.round(p[0]/GRID)*GRID,cy=Math.round(p[1]/GRID)*GRID,r=Math.ceil(SNAP/GRID)+1;
  for(let iy=-r;iy<=r;iy++)for(let ix=-r;ix<=r;ix++) {
    const dx=ix*GRID,dy=iy*GRID;
    const id=lookup.get(`${cx+dx},${cy+dy}`);if(id===undefined)continue;
    const d=distance(nodes[id],p);
    if(d<=SNAP&&d<bestD&&clearSegment(p,nodes[id])){best=id;bestD=d;}
  }
  return best;
}
export function drivablePath(start,end) {
  const g=drivableGrid(),{nodes,lookup,neighbors}=g;
  const from=snapNode(start,g),to=snapNode(end,g);
  if(from===null||to===null)return null;
  const dist=new Map([[from,0]]),previous=new Map(),heap=[[distance(nodes[from],nodes[to]),from]];
  const push=item=>{heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
  const closed=new Set();
  while(heap.length) {
    const [,id]=pop();if(closed.has(id))continue;closed.add(id);if(id===to)break;
    if(!neighbors.has(id)) {
      const a=nodes[id],edges=[];
      for(const dx of [-GRID,0,GRID])for(const dy of [-GRID,0,GRID]) {
        if((!dx&&!dy)||!feederGridStepOk(a,dy))continue; // feeder is northbound-only
        const next=lookup.get(`${a[0]+dx},${a[1]+dy}`);
        if(next!==undefined&&drivableAllowed([a[0]+dx/2,a[1]+dy/2]))edges.push([next,Math.hypot(dx,dy)]);
      }
      neighbors.set(id,edges);
    }
    const cost=dist.get(id);
    for(const [next,length] of neighbors.get(id)) {
      const value=cost+length;if(value>=(dist.get(next)??Infinity))continue;
      dist.set(next,value);previous.set(next,id);push([value+distance(nodes[next],nodes[to]),next]);
    }
  }
  if(!dist.has(to))return null;
  const path=[];let id=to;while(id!==undefined){path.push(nodes[id]);id=previous.get(id);}path.reverse();
  const simple=[path[0]];let i=0;
  while(i<path.length-1){let j=Math.min(path.length-1,i+80);while(j>i+1&&!drivableSegment(path[i],path[j]))j--;simple.push(path[j]);i=j;}
  return join([start],simple,[end]);
}
export function obstacleConnector(start,end,context='internal') {
  const key=JSON.stringify([start,end,context]);if(connectorCache.has(key))return connectorCache.get(key);
  if(!avoidsObstacles(start)||!avoidsObstacles(end))throw new Error(`Unavailable ${context}: connector endpoint touches a source roof`);
  let result,mode;
  if(distance(start,end)<.001||drivableSegment(start,end)){result=[start,end];mode='straight-on-pavement';}
  else if((result=drivablePath(start,end)))mode='pavement-grid';
  else if(distance(start,end)<=SNAP&&directedOk(start,end)&&clearSegment(start,end)){result=[start,end];mode='short-unmapped-gap';}
  else if(distance(start,end)>MAX_FALLBACK_PX)
    throw new Error(`Unavailable ${context}: no traced-pavement connection and fallback would cross ${Math.round(distance(start,end))}px of untraced ground`);
  else if(clearSegment(start,end)){result=[start,end];mode='roof-avoid-fallback';}
  else {
    mode='roof-avoid-fallback';
    const nodes=[start,end,...corners],dist=new Map([[0,0]]),prev=new Map(),open=new Set([0]),closed=new Set();
    while(open.size) {
      let id=null,best=Infinity;
      for(const i of open){const score=dist.get(i)+distance(nodes[i],end);if(score<best){best=score;id=i;}}
      open.delete(id);if(id===1)break;closed.add(id);
      for(let i=0;i<nodes.length;i++) {
        if(closed.has(i)||i===id)continue;
        const cost=dist.get(id)+distance(nodes[id],nodes[i]);
        if(cost>=(dist.get(i)??Infinity)||!clearSegment(nodes[id],nodes[i]))continue;
        dist.set(i,cost);prev.set(i,id);open.add(i);
      }
    }
    if(!dist.has(1))throw new Error(`Unavailable ${context}: no obstacle-clear source connector`);
    result=[];let i=1;while(i!==undefined){result.push(nodes[i]);i=prev.get(i);}result.reverse();
  }
  connectorCache.set(key,result);
  CONNECTOR_PROVENANCE.push({context,mode,nonpavement:mode==='roof-avoid-fallback',
    source:'derived source-frame connector (not a traced aisle)',start,end,points:result.length});
  return result;
}
export const nearestIndex=(points,p)=>points.reduce((best,q,i)=>distance(q,p)<distance(points[best],p)?i:best,0);
// Straight join kept inside a thin corridor around ONE source route line. Used
// where the grid search would wander into an opposing aisle (e.g. Lot A Main ->
// source #18 exit). Every sample must stay within SOURCE_CORRIDOR_PX of the
// traced line and clear roofs; otherwise null and the caller falls back.
export const SOURCE_CORRIDOR_PX=6;
export function sourceCorridorJoin(start,end,routeIndex,context) {
  const line=routeAt(routeIndex);
  const near=p=>line.some((a,i)=>i>0&&segmentDistance(p,line[i-1],a)<=SOURCE_CORRIDOR_PX);
  if(!directedOk(start,end)||!clearSegment(start,end,p=>avoidsObstacles(p)&&near(p)))return null;
  CONNECTOR_PROVENANCE.push({context,mode:'source-corridor',nonpavement:false,
    source:`derived source-frame connector (not a traced aisle) within ${SOURCE_CORRIDOR_PX}px of source route #${routeIndex}`,start,end,points:2});
  return [start,end];
}
// Stop at the first sharp row reversal. This is parking guidance, not a command
// to make every vehicle drive a zigzag tour of every row.
export function drivingPrefix(index) {
  const points=routeAt(index);
  for(let i=1;i<points.length-1;i++) {
    const a=points[i-1],b=points[i],c=points[i+1],ab=distance(a,b),bc=distance(b,c);
    if(ab>3&&bc>3&&((b[0]-a[0])*(c[0]-b[0])+(b[1]-a[1])*(c[1]-b[1]))/(ab*bc)<-.5)
      return points.slice(0,i+1);
  }
  return points;
}
export const lotRings=lot=>source.shapes.filter(s=>s.shape_type==='polygon'&&new RegExp(`^Lot ${lot} `,'i').test(s.label)&&!/building|first half/i.test(s.label)).map(s=>s.points);
