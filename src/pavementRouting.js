import annotation from './campusAnnotations.js';

// One source frame for the map, street containment, and access corridors.
const polygons = annotation.shapes.filter(s => /^(feeder road|corporate drive|equity drive|equity entrance|equity entrance & exit 2)$/i.test(s.label))
  .map(s => s.points);
const corporate=annotation.shapes.find(s=>/^corporate drive$/i.test(s.label)).points;
const equity=annotation.shapes.find(s=>/^equity drive$/i.test(s.label)).points;
// Source rings are immutable for a scenario. Reject outside points cheaply;
// retain the exact same ray-crossing expression for points within the bounds.
const polygonBounds=new WeakMap();
export function inPolygon([x,y], ring) {
  let bounds=polygonBounds.get(ring);
  if(!bounds) {
    bounds={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
    for(const [px,py] of ring) {
      bounds.minX=Math.min(bounds.minX,px);bounds.maxX=Math.max(bounds.maxX,px);
      bounds.minY=Math.min(bounds.minY,py);bounds.maxY=Math.max(bounds.maxY,py);
    }
    polygonBounds.set(ring,bounds);
  }
  if(x<bounds.minX||x>bounds.maxX||y<bounds.minY||y>bounds.maxY)return false;
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [a,b]=ring[i], [c,d]=ring[j];
    if((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) inside=!inside;
  }
  return inside;
}
export const onStreet = p => polygons.some(poly=>inPolygon(p,poly));
const STEP=2;
const nodes=[];
const lookup=new Map();
for(let y=0;y<=566;y+=STEP) for(let x=0;x<=735;x+=STEP) {
  if(onStreet([x,y])) { const id=nodes.length;nodes.push([x,y]);lookup.set(`${x},${y}`,id); }
}
function nearest(p) {
 let best=0, distance=Infinity;
 nodes.forEach((n,i)=>{const d=(n[0]-p[0])**2+(n[1]-p[1])**2;if(d<distance){best=i;distance=d;}});
 return best;
}
function clear(a,b) {
 const count=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.05);
 for(let i=0;i<=count;i++) if(!onStreet([a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count]))return false;
 return true;
}
// Find the two pavement edges on a cross section perpendicular to travel.
// A shortest path tends to hug the inside edge of bends, so an offset from
// that path is NOT an offset from the road's middle. Work in source-image px.
function roadHalfWidths(p, normal, polygon) {
 const reach=direction=>{
  let distance=0;
  while(distance<24 && inPolygon([p[0]+direction*normal[0]*(distance+.25),
    p[1]+direction*normal[1]*(distance+.25)],polygon)) distance+=.25;
  return distance;
 };
 return [reach(-1),reach(1)];
}
// Two directions aim 3.8px to their own right of the same local midline:
// nominal opposing bus centers are 7.6px apart (> 5.7px bus body width).
// Throats and tight corners taper only when the approved polygon requires it.
// Corporate AND Equity are two-way; feeder operations remain northbound.
function offsetTwoWayRoads(path) {
 const points=[];
 for(let i=0;i<path.length-1;i++) {
  const a=path[i],b=path[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(length===0)continue;
  const right=[-(b[1]-a[1])/length,(b[0]-a[0])/length];
  for(let k=0;k<Math.ceil(length);k++) {
   const t=k/Math.ceil(length),p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
   let choice=p;
   const polygon=inPolygon(p,corporate)?corporate:inPolygon(p,equity)?equity:null;
   if(polygon) {
    const [leftWidth,rightWidth]=roadHalfWidths(p,right,polygon);
    const midpoint=(rightWidth-leftWidth)/2;
    // Maintain a bus half-width of pavement at both sides where feasible.
    const halfWidth=(leftWidth+rightWidth)/2;
    const offset=Math.min(3.8,Math.max(0,halfWidth-2.85));
    for(const fraction of [1,.75,.5,.25,0]) {
     const shift=(midpoint+offset)*fraction;
     const candidate=[p[0]+right[0]*shift,p[1]+right[1]*shift];
     if(inPolygon(candidate,polygon)&&clear(p,candidate) &&
       (!points.length||clear(points.at(-1),candidate))) {choice=candidate;break;}
    }
   }
   points.push(choice);
  }
 }
 points.push(path.at(-1));
 return points;
}
// All routes share the same immutable pavement grid. Check each directed grid
// edge once, rather than re-scanning its pavement for every destination.
const streetNeighbors=new Map(),streetRoutes=new Map();
function neighborsOf(id) {
 if(streetNeighbors.has(id))return streetNeighbors.get(id);
 const a=nodes[id],neighbors=[];
 for(const dx of [-STEP,0,STEP])for(const dy of [-STEP,0,STEP]) {
  if((!dx&&!dy)||(a[0]<48&&dy>0))continue;
  const next=lookup.get(`${a[0]+dx},${a[1]+dy}`);
  if(next!==undefined&&clear(a,nodes[next]))neighbors.push([next,Math.hypot(dx,dy)]);
 }
 streetNeighbors.set(id,neighbors);return neighbors;
}
// Dijkstra with a binary heap; directed feeder edges never travel south.
export function streetPath(start,end) {
 const from=nearest(start),to=nearest(end),key=`${from}:${to}`;
 if(streetRoutes.has(key))return streetRoutes.get(key);
 const dist=new Map([[from,0]]),previous=new Map(),heap=[[0,from]];
 const push=item=>{heap.push(item);let i=heap.length-1;while(i){let p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
 while(heap.length) {
  const [cost,id]=pop();if(cost!==dist.get(id))continue;if(id===to)break;
  for(const [next,length] of neighborsOf(id)) {
   const value=cost+length;if(value>=(dist.get(next)??Infinity))continue;
   dist.set(next,value);previous.set(next,id);push([value,next]);
  }
 }
 if(!dist.has(to)) throw new Error('No pavement-contained directed street route');
 const path=[];let id=to;while(id!==undefined){path.push(nodes[id]);id=previous.get(id);}path.reverse();
 // Visibility simplification preserves containment instead of curve overshoot.
 const simplified=[path[0]];let i=0;
 while(i<path.length-1){let j=Math.min(path.length-1,i+60);while(j>i+1&&!clear(path[i],path[j]))j--;simplified.push(path[j]);i=j;}
 const result=offsetTwoWayRoads(simplified);streetRoutes.set(key,result);return result;
}
