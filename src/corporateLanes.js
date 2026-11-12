// One shared road reference for both directions. Independent freehand vehicle
// traces are guidance, not separate street centerlines. Pavement stays unchanged.
import { shapeAt } from './clearImageSource.js';
import { inPolygon, avoidsObstacles, clearSegment } from './sourceRouting.js';

const pavement = shapeAt(56).points;
const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function boundary(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths.at(-1) + distance(points[i - 1], points[i]));
  return t => {
    const d = t * lengths.at(-1);
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < d) i++;
    const f = (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
    return points[i - 1].map((v, axis) => v + (points[i][axis] - v) * f);
  };
}
// Explicit binding to polygon56's two ordered banks, not vehicle trace indices.
const north = boundary(pavement.slice(0, 13));
const south = boundary(pavement.slice(13).reverse());
export const CORPORATE_CENTERLINE = Object.freeze(Array.from({ length: 401 }, (_, i) => {
  const a = north(i / 400), b = south(i / 400);
  return Object.freeze([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
}));
export const CORPORATE_LANE_OFFSET_PX = 12;
export function corporateProjection(p) {
  let best = null;
  for (let i = 1; i < CORPORATE_CENTERLINE.length; i++) {
    const a = CORPORATE_CENTERLINE[i - 1], b = CORPORATE_CENTERLINE[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (length * length || 1)));
    const point = [a[0] + t * dx, a[1] + t * dy], gap = distance(p, point);
    if (!best || gap < best.gap) best = { point, gap, tangent: [dx / length, dy / length], segment: i };
  }
  return best;
}
export function alignCorporateLanes(source, fallback) {
  const aligned = source.map((p, i) => {
    if (!inPolygon(p, pavement)) return [...fallback[i]];
    const a = source[Math.max(0, i - 1)], b = source[Math.min(source.length - 1, i + 1)];
    const length = distance(a, b);
    if (!length) return [...fallback[i]];
    const projection = corporateProjection(p), { point, tangent: [tx, ty] } = projection;
    const alignment = ((b[0] - a[0]) * tx + (b[1] - a[1]) * ty) / length;
    // Driveway turns retain their own geometry. Only through-road travel uses
    // the shared reference; a perpendicular connection is not a through lane.
    const weight = Math.max(0, Math.min(1, (Math.abs(alignment) - .45) / .35));
    if (!weight) return [...fallback[i]];
    const sign = Math.sign(alignment);
    const target = [point[0] - ty * sign * CORPORATE_LANE_OFFSET_PX, point[1] + tx * sign * CORPORATE_LANE_OFFSET_PX];
    const q = fallback[i].map((v, axis) => v + (target[axis] - v) * weight);
    return inPolygon(q, pavement) && avoidsObstacles(q) ? q : [...fallback[i]];
  });
  // A valid point alone doesn't prove its connecting segment stays on the road.
  // Reject local normalization that would cut a pavement corner or obstacle.
  const reverted=new Set();
  for (let i = 1; i < aligned.length; i++) {
    if (inPolygon(source[i - 1], pavement) && inPolygon(source[i], pavement) &&
        !clearSegment(aligned[i - 1], aligned[i], p => inPolygon(p, pavement) && avoidsObstacles(p))) {
      const changed=!reverted.has(i-1)||!reverted.has(i);
      aligned[i - 1] = [...fallback[i - 1]]; reverted.add(i-1);
      aligned[i] = [...fallback[i]]; reverted.add(i);
      // Resetting the previous vertex invalidates its incoming check too.
      // Each vertex can revert only once, bounding this backtracking pass.
      if(changed)i=Math.max(0,i-2);
    }
  }
  return aligned;
}
