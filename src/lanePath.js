// CurvePath.getPoint linearly scans every tiny traced segment. Traffic lookahead
// asks for thousands of poses per frame, so search its SAME cumulative lengths
// with a lower-bound lookup. Keep Three's getPointAt arc mapping and tangent
// behavior unchanged: this is an index optimization, not a different route.
export function indexLanePath(path) {
  path.getPoint = function getIndexedPoint(t, target) {
    const distance=t*this.getLength(), lengths=this.getCurveLengths();
    if (!lengths.length || distance>lengths.at(-1)) return null;
    let lo=0,hi=lengths.length-1;
    while(lo<hi) {
      const mid=(lo+hi)>>1;
      if(lengths[mid]>=distance)hi=mid;else lo=mid+1;
    }
    const curve=this.curves[lo],length=curve.getLength();
    const u=length===0?0:1-(lengths[lo]-distance)/length;
    return curve.getPointAt(u,target);
  };
  return path;
}
