import { shapeAt, IMAGE_SIZE } from './clearImageSource.js';
import { inPolygon, clearSegment, distance, join, avoidsObstacles } from './sourceRouting.js';
import { feederSegmentOk, feederGridStepOk, PAVEMENT_PATCHES } from './layoutOverlay.js';
export { inPolygon };
const polygons=[...[54,55,56].map(i=>shapeAt(i).points),...PAVEMENT_PATCHES];
export const onStreet=p=>polygons.some(r=>inPolygon(p,r));
const allowed=p=>onStreet(p)&&avoidsObstacles(p);
// Shortcuts must obey the same northbound-only feeder rule as grid edges
// (images/layout-overlay.json oneway:feeder-north).
const directed=feederSegmentOk;
const shortcut=(a,b)=>directed(a,b)&&clearSegment(a,b,allowed);
const STEP=4,cache=new Map();let grid;
function getGrid() {
  if(grid)return grid;
  const nodes=[],lookup=new Map();
  for(let y=0;y<=IMAGE_SIZE.height;y+=STEP)for(let x=0;x<=IMAGE_SIZE.width;x+=STEP)
    if(allowed([x,y])){lookup.set(`${x},${y}`,nodes.length);nodes.push([x,y]);}
  return grid={nodes,lookup,neighbors:new Map()};
}
export function streetPath(start,end) {
  const key=JSON.stringify([start,end]);if(cache.has(key))return cache.get(key);
  const {nodes,lookup,neighbors}=getGrid();
  const nearest=p=>nodes.reduce((best,q,i)=>distance(q,p)<distance(nodes[best],p)?i:best,0);
  const from=nearest(start),to=nearest(end);
  // Endpoints may be hand-drawn just beyond a pavement edge; source connectors
  // are explicit and obstacle-checked, never transplanted from another image.
  if(distance(nodes[from],start)>25||distance(nodes[to],end)>25)
    throw new Error('Unavailable street connection: source endpoint more than 25px from traced road');
  const dist=new Map([[from,0]]),previous=new Map(),heap=[[0,from]];
  const push=item=>{heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
  while(heap.length) {
    const [cost,id]=pop();if(cost!==dist.get(id))continue;if(id===to)break;
    if(!neighbors.has(id)) {
      const a=nodes[id],edges=[];
      for(const dx of [-STEP,0,STEP])for(const dy of [-STEP,0,STEP]) {
        if((!dx&&!dy)||!feederGridStepOk(a,dy))continue; // northbound-only feeder
        const next=lookup.get(`${a[0]+dx},${a[1]+dy}`);
        if(next!==undefined&&clearSegment(a,nodes[next],allowed))edges.push([next,Math.hypot(dx,dy)]);
      }
      neighbors.set(id,edges);
    }
    for(const [next,length] of neighbors.get(id)) {
      const value=cost+length;if(value>=(dist.get(next)??Infinity))continue;
      dist.set(next,value);previous.set(next,id);push([value,next]);
    }
  }
  if(!dist.has(to))throw new Error('Unavailable directed connection in Clear Image road polygons');
  const path=[];let id=to;while(id!==undefined){path.push(nodes[id]);id=previous.get(id);}path.reverse();
  const simple=[path[0]];let i=0;
  while(i<path.length-1){let j=Math.min(path.length-1,i+80);while(j>i+1&&!shortcut(path[i],path[j]))j--;simple.push(path[j]);i=j;}
  if(!clearSegment(start,simple[0])||!clearSegment(simple.at(-1),end))throw new Error('Unavailable obstacle-safe street endpoint connector');
  const result=join([start],simple,[end]);cache.set(key,result);return result;
}
