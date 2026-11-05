import { ShapeUtils, Vector2 } from 'three';

const area=points=>Math.abs(points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p[0]*q[1]-q[0]*p[1];},0))/2;
function clipWest(points,x) {
  const result=[];
  for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length],insideA=a[0]<=x,insideB=b[0]<=x;
    if(insideA)result.push(a);
    if(insideA!==insideB){const t=(x-a[0])/(b[0]-a[0]);result.push([x,a[1]+t*(b[1]-a[1])]);}
  }
  return result;
}
// Equal polygon AREA represents equal operational occupancy; concave outlines
// are triangulated so the clipped fill never creates geometry outside the trace.
export function makeOccupancyFill(points) {
  return makeOccupancyFillPieces([points]);
}
export function makeOccupancyFillPieces(pieces) {
  const triangles=pieces.flatMap(points=>ShapeUtils.triangulateShape(points.map(p=>new Vector2(...p)),[]).map(ids=>ids.map(i=>points[i])));
  const total=triangles.reduce((n,t)=>n+area(t),0),xs=pieces.flat().map(p=>p[0]),min=Math.min(...xs),max=Math.max(...xs);
  return fraction=>{
    const target=Math.max(0,Math.min(1,fraction))*total;
    let lo=min,hi=max;
    for(let i=0;i<30;i++) {
      const middle=(lo+hi)/2,n=triangles.reduce((sum,t)=>sum+area(clipWest(t,middle)),0);
      if(n<target)lo=middle;else hi=middle;
    }
    return (lo+hi)/2;
  };
}
