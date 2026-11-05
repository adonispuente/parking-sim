import { ShapeUtils, Vector2 } from 'three';
import { annotationShape } from './campusAnnotations.js';

// Partition the original North/South pavement by the NEW traced first-half mask.
// Intersections are geometry only; capacities are operational training inputs.
const triangles = ring => ShapeUtils.triangulateShape(ring.map(p=>new Vector2(...p)),[]).map(ids=>ids.map(i=>ring[i]));
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
const signedArea=points=>points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p[0]*q[1]-q[0]*p[1];},0)/2;
function clip(points,a,b,orientation,inside) {
  const output=[];
  for(let i=0;i<points.length;i++) {
    const p=points[i],q=points[(i+1)%points.length];
    const dp=cross(a,b,p)*orientation,dq=cross(a,b,q)*orientation;
    const keepP=inside?dp>=0:dp<=0,keepQ=inside?dq>=0:dq<=0;
    if(keepP)output.push(p);
    if(keepP!==keepQ){const t=dp/(dp-dq);output.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }
  return output;
}
function splitByTriangle(points,triangle) {
  const orientation=Math.sign(signedArea(triangle)),outside=[];
  let remaining=points;
  for(let i=0;i<3&&remaining.length>=3;i++) {
    const a=triangle[i],b=triangle[(i+1)%3],piece=clip(remaining,a,b,orientation,false);
    if(piece.length>=3&&Math.abs(signedArea(piece))>1e-8)outside.push(piece);
    remaining=clip(remaining,a,b,orientation,true);
  }
  return {inside:remaining.length>=3&&Math.abs(signedArea(remaining))>1e-8?[remaining]:[],outside};
}
const mask=annotationShape('Lot C First Half');
if(!mask)throw new Error('Updated C trace is missing Lot C First Half.');
const maskTriangles=triangles(mask.points);
export const C_ZONE_PIECES={};
for(const [label,first,remainder] of [['Lot C North','cFirstNorth','cNorth'],['Lot C south','cFirstSouth','cSouth']]) {
  let pending=triangles(annotationShape(label).points),included=[];
  for(const triangle of maskTriangles) {
    const next=[];
    for(const piece of pending){const split=splitByTriangle(piece,triangle);included.push(...split.inside);next.push(...split.outside);}
    pending=next;
  }
  C_ZONE_PIECES[first]=included;C_ZONE_PIECES[remainder]=pending;
}
