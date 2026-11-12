// Bidirectional aisle graph derived from the new drawing. Source lines stay
// unchanged; the two travel lanes and short aisle joins are explicit estimates.
import { C_HUBS, C_HUB_EXIT_TRACES, C_HUB_SHUTTLE_TRACE, cHubById } from './cHubSource.js';
import { routeAt } from './clearImageSource.js';
import { distance, join, clearSegment, avoidsObstacles, drivableAllowed } from './sourceRouting.js';

// C's broad aisles carry a bus through the middle and cars on either side.
// 14px per side clears the unchanged shuttle centerlines, including pickup spurs.
export const C_AISLE_HALF_GAP_PX = 14;
export const C_HUB_ROUTE_PROVENANCE = [];
const entry = C_HUB_SHUTTLE_TRACE[4];
const terminals = { cWest: routeAt(13)[0], cEast: routeAt(15)[0] };
const nodes = [], edges = [], byPoint = new Map();
function node(point) {
  const key = point.map(v => v.toFixed(6)).join(',');
  if (!byPoint.has(key)) { byPoint.set(key, nodes.length); nodes.push(point); edges.push([]); }
  return byPoint.get(key);
}
function edge(a, b, source) {
  if (a === b) return;
  const length = distance(nodes[a], nodes[b]);
  edges[a].push({ to: b, length, source }); edges[b].push({ to: a, length, source });
}
const project = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  const point = [a[0] + dx * t, a[1] + dy * t];
  return { point, t, gap: distance(p, point) };
};
const segments = [...C_HUB_EXIT_TRACES, { sourceIndex: 50, points: C_HUB_SHUTTLE_TRACE }].flatMap(trace =>
  trace.points.slice(1).map((b, i) => ({ a: trace.points[i], b, source: trace.sourceIndex, cuts: [0, 1] })));
const joins = [];
// Join nearby observations of the same aisle/intersection. Long connectors
// across parking rows are never a graph fallback.
function attach(point, segment, maxGap) {
  const p = project(point, segment.a, segment.b);
  if (p.gap > maxGap || !clearSegment(point, p.point)) return false;
  segment.cuts.push(p.t); joins.push([point, p.point]); return true;
}
for (const a of segments) for (const b of segments) {
  if (a === b) continue;
  attach(a.a, b, 8); attach(a.b, b, 8);
  const ux = a.b[0] - a.a[0], uy = a.b[1] - a.a[1], vx = b.b[0] - b.a[0], vy = b.b[1] - b.a[1];
  const cross = ux * vy - uy * vx;
  if (Math.abs(cross) < 1e-9) continue;
  const dx = b.a[0] - a.a[0], dy = b.a[1] - a.a[1];
  const t = (dx * vy - dy * vx) / cross, u = (dx * uy - dy * ux) / cross;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { a.cuts.push(t); b.cuts.push(u); }
}
for (const point of [entry, ...Object.values(terminals), ...C_HUBS.map(h => h.point)]) {
  const isHub = C_HUBS.some(h => h.point === point);
  const closest = segments.map(segment => ({ segment, ...project(point, segment.a, segment.b) })).sort((a, b) => a.gap - b.gap);
  // Hubs may have short access spurs on both sides of their nearby aisle. This
  // lets arrivals park from the interior road and departures use the exit row.
  const candidates = closest.filter(p => p.gap <= (isHub ? 40 : 12));
  if (!candidates.some(p => attach(point, p.segment, isHub ? 40 : 12))) throw new Error(`Lot C anchor disconnected: ${point}`);
  if (isHub) for (const p of candidates) attach(point, p.segment, 40);
}
for (const s of segments) {
  const cuts = [...new Set(s.cuts)].sort((a, b) => a - b);
  const points = cuts.map(t => [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t]);
  for (let i = 1; i < points.length; i++) edge(node(points[i - 1]), node(points[i]), s.source);
}
for (const [a, b] of joins) edge(node(a), node(b), 'short aisle join');

function walk(start, end, arrival = false) {
  const from = node(start), to = node(end), costs = new Map([[from, 0]]), previous = new Map(), open = new Set([from]);
  while (open.size) {
    let best;
    for (const id of open) if (best === undefined || costs.get(id) < costs.get(best)) best = id;
    open.delete(best); if (best === to) break;
    for (const e of edges[best]) {
      // After entering the four-way, arrivals stay inside C rather than turning
      // back up an exit throat to reach a northern parking row.
      const p = nodes[e.to];
      if (arrival && p[0] > 950 && p[0] < 1020 && p[1] < 155) continue;
      const cost = costs.get(best) + e.length;
      if (cost >= (costs.get(e.to) ?? Infinity)) continue;
      costs.set(e.to, cost); previous.set(e.to, { from: best, source: e.source }); open.add(e.to);
    }
  }
  if (!costs.has(to)) throw new Error(`No Lot C aisle route from ${start} to ${end}`);
  const points = [], sources = []; let id = to;
  while (id !== undefined) { points.push(nodes[id]); const p = previous.get(id); if (p) sources.push(p.source); id = p?.from; }
  return { points: points.reverse(), sources: [...new Set(sources.reverse())] };
}

// Use the right side of each aisle even off public street polygons. Endpoints
// taper to the exact hub: a parked car returns from the same anchor it reached.
function splitLane(raw, provenance) {
  provenance.reducedSamples = 0; provenance.sourceBoundarySamples = 0;
  const points = [raw[0]], arcs = [0];
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1], b = raw[i], n = Math.max(1, Math.ceil(distance(a, b) / 2));
    for (let k = 1; k <= n; k++) {
      const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n];
      const gap = distance(points.at(-1), p); if (gap < 1e-6) continue;
      arcs.push(arcs.at(-1) + gap); points.push(p);
    }
  }
  const shifted = points.map((p, i) => {
    const a = points[Math.max(0, i - 2)], b = points[Math.min(points.length - 1, i + 2)], length = distance(a, b) || 1;
    const offset = C_AISLE_HALF_GAP_PX * Math.min(1, arcs[i] / 16, (arcs.at(-1) - arcs[i]) / 16);
    const shifted = amount => [p[0] - (b[1] - a[1]) / length * amount, p[1] + (b[0] - a[0]) / length * amount];
    // Narrow boundaries keep the lane on mapped ground. Broad C aisles retain
    // the full split; a source-road point never expands the drivable footprint.
    for (const factor of [1, .85, .7, .55, .4, .2, 0]) {
      const q = shifted(offset * factor);
      if (drivableAllowed(q) && clearSegment(p, q)) {
        if (factor < 1) provenance.reducedSamples++;
        return q;
      }
    }
    provenance.sourceBoundarySamples++;
    return p;
  });
  for (let i = 1; i < shifted.length; i++) if (!clearSegment(shifted[i - 1], shifted[i], avoidsObstacles))
    throw new Error(`Lot C split aisle touches a roof at ${shifted[i]}`);
  return shifted;
}
const cache = new Map();
export function cHubArrival(hubId) {
  const key = `in:${hubId}`;
  if (!cache.has(key)) {
    const hub = cHubById(hubId), path = walk(entry, hub.point, true);
    // Source #8 interior and #50 approach preserve the median-separated mouth.
    const raw = join([routeAt(8).at(-1)], C_HUB_SHUTTLE_TRACE.slice(3, 5), path.points);
    const provenance = { hub: hubId, phase: 'arrival', sources: path.sources, halfGapPx: C_AISLE_HALF_GAP_PX, provisional: true };
    cache.set(key, splitLane(raw, provenance)); C_HUB_ROUTE_PROVENANCE.push(provenance);
  }
  return cache.get(key);
}
export function cHubDeparture(hubId, access) {
  const key = `out:${hubId}:${access}`;
  if (!cache.has(key)) {
    const path = walk(cHubById(hubId).point, terminals[access]);
    const provenance = { hub: hubId, phase: 'departure', access, sources: path.sources, halfGapPx: C_AISLE_HALF_GAP_PX, provisional: true };
    cache.set(key, splitLane(path.points, provenance)); C_HUB_ROUTE_PROVENANCE.push(provenance);
  }
  return cache.get(key);
}
