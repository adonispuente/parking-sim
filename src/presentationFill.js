// Display-only planar fill. No routing or collision module may import this file.
// Vertical decomposition preserves even-odd self-crossings without repairing the
// original rings. Each ring has its own parity; pavement rings are then unioned.
const EPSILON = 1e-9;

export function tessellatePresentationFill(rings) {
  const edges = [];
  const events = [];
  rings.forEach((ring, ringIndex) => {
    if (ring.points.length < 3 || ring.points.some(p => p.length !== 2 || !p.every(Number.isFinite))) {
      throw new Error(`Invalid presentation ring: ${ring.id}`);
    }
    ring.points.forEach((a, i) => {
      const b = ring.points[(i + 1) % ring.points.length];
      events.push(a[0]);
      if (a[0] !== b[0]) edges.push({ a, b, ringIndex, id: edges.length });
    });
  });
  // Edge order can change only at a vertex or an intersection. Include both;
  // triangulating a self-crossing ring directly with ear clipping is not valid.
  for (let i = 0; i < edges.length; i++) {
    const { a, b } = edges[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    for (let j = i + 1; j < edges.length; j++) {
      const { a: c, b: d } = edges[j];
      if (Math.max(a[0], b[0]) < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) < Math.min(a[0], b[0])) continue;
      const ex = d[0] - c[0], ey = d[1] - c[1];
      const determinant = dx * ey - dy * ex;
      if (Math.abs(determinant) < 1e-12) continue;
      const cx = c[0] - a[0], cy = c[1] - a[1];
      const t = (cx * ey - cy * ex) / determinant;
      const u = (cx * dy - cy * dx) / determinant;
      if (t > 0 && t < 1 && u > 0 && u < 1) events.push(a[0] + t * dx);
    }
  }
  events.sort((a, b) => a - b);
  const xs = events.filter((x, i) => !i || x - events[i - 1] > EPSILON);
  const batches = new Map();
  const yAt = (edge, x) => edge.a[1] + (x - edge.a[0]) * (edge.b[1] - edge.a[1]) / (edge.b[0] - edge.a[0]);
  const regions = [];
  let previousRegions = new Map();
  let area = 0, triangles = 0;
  for (let slab = 0; slab < xs.length - 1; slab++) {
    const left = xs[slab], right = xs[slab + 1], middle = (left + right) / 2;
    if (right - left <= EPSILON) continue;
    const active = edges.filter(e => Math.min(e.a[0], e.b[0]) < middle && Math.max(e.a[0], e.b[0]) > middle)
      .map(edge => ({ edge, y: yAt(edge, middle) })).sort((a, b) => a.y - b.y);
    const inside = new Set();
    const bands = [];
    for (let i = 0; i < active.length - 1; i++) {
      const lower = active[i], upper = active[i + 1];
      const index = lower.edge.ringIndex;
      if (inside.has(index)) inside.delete(index); else inside.add(index);
      if (upper.y - lower.y <= EPSILON) continue;
      let paved = false, excluded = false, material = 'neutral', priority = -Infinity;
      for (const ri of inside) {
        const ring = rings[ri];
        if (ring.kind === 'pavement') paved = true;
        if (ring.kind === 'exclude') excluded = true;
        if (ring.kind === 'material' && ring.priority > priority) {
          material = ring.id; priority = ring.priority;
        }
      }
      if (!paved || excluded) continue;
      // Source edges inside one material are not visible boundaries.
      const last = bands.at(-1);
      if (last && last.material === material && Math.abs(last.top - lower.y) <= EPSILON) {
        last.upper = upper.edge; last.top = upper.y;
      } else bands.push({ material, lower: lower.edge, upper: upper.edge, top: upper.y });
    }
    const currentRegions = new Map();
    for (const band of bands) {
      const key = `${band.material}:${band.lower.id}:${band.upper.id}`;
      const previous = previousRegions.get(key);
      if (previous && Math.abs(previous.right - left) <= EPSILON) {
        previous.right = right; currentRegions.set(key, previous);
      } else {
        const region = { ...band, left, right };
        regions.push(region); currentRegions.set(key, region);
      }
    }
    previousRegions = currentRegions;
  }
  // Consecutive slabs bounded by the same original edges form one trapezoid.
  // Remove redundant tessellation without moving or simplifying boundaries.
  for (const { material, lower, upper, left, right } of regions) {
      const a = [left, yAt(lower, left)], b = [right, yAt(lower, right)];
      const c = [right, yAt(upper, right)], d = [left, yAt(upper, left)];
      if (!batches.has(material)) batches.set(material, []);
      const vertices = batches.get(material);
      for (const triangle of [[a, b, c], [a, c, d]]) {
        const [p, q, r] = triangle;
        const triangleArea = Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])) / 2;
        if (triangleArea <= 1e-12) continue;
        vertices.push(...p, ...q, ...r);
        area += triangleArea; triangles++;
      }
  }
  return { batches: [...batches].map(([material, vertices]) => ({ material, vertices })), area, triangles, slabs: xs.length - 1 };
}
