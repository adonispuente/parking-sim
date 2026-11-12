// Derived lanes on the drawn A/B aisle network. Short joins and widths are estimates.
import { AB_HUBS, A_HUB_TRACES, abHubTrace, abHubById } from './abHubSource.js';
import { routeAt } from './clearImageSource.js';
import { clearSegment, distance, drivingPrefix, join, drivableAllowed } from './sourceRouting.js';

export const AB_HUB_ROUTE_PROVENANCE = [];
export const A_HUB_DEPARTURE_JOINS = {
  aNorth: drivingPrefix(1).at(-1),
  aSouth: [188, 150],
};
const entries = {
  aNorth: routeAt(1)[10],
  aSouth: drivingPrefix(0).at(-1),
};
const graphs = new Map(), cache = new Map();

function project(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1,
    ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  const point = [a[0] + dx * t, a[1] + dy * t];
  return { point, t, gap: distance(p, point) };
}

function graph(departure = false) {
  const key = departure;
  if (graphs.has(key)) return graphs.get(key);
  const traces = A_HUB_TRACES.map(index => ({
    source: `ABHubs #${index}`, points: abHubTrace(index),
  }));
  // Departures follow the drawn A exit direction. Arrivals also use the
  // existing approach traces to reach their upper-aisle branch.
  for (const index of departure ? [] : [0, 1]) traces.push({
    source: `EverythingClearImage #${index}`, points: drivingPrefix(index),
  });
  const segments = traces.flatMap(trace => trace.points.slice(1).map((b, i) => ({
    a: trace.points[i], b, source: trace.source, cuts: [0, 1],
  })));
  const joins = [];
  const attach = (p, segment, gap) => {
    const q = project(p, segment.a, segment.b);
    if (q.gap > gap || !clearSegment(p, q.point)) return false;
    segment.cuts.push(q.t);
    joins.push([p, q.point]);
    return true;
  };
  for (const a of segments) for (const b of segments) {
    if (a === b) continue;
    attach(a.a, b, 8);
    attach(a.b, b, 8);
    const ux = a.b[0] - a.a[0], uy = a.b[1] - a.a[1];
    const vx = b.b[0] - b.a[0], vy = b.b[1] - b.a[1], cross = ux * vy - uy * vx;
    if (Math.abs(cross) < 1e-9) continue;
    const dx = b.a[0] - a.a[0], dy = b.a[1] - a.a[1];
    const t = (dx * vy - dy * vx) / cross, u = (dx * uy - dy * ux) / cross;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      a.cuts.push(t);
      b.cuts.push(u);
    }
  }
  const hubs = AB_HUBS.filter(h => h.lot === 'a');
  const anchors = [...Object.values(A_HUB_DEPARTURE_JOINS), ...Object.values(entries), ...hubs.map(h => h.point)];
  for (const p of anchors) {
    const candidates = segments.map(s => ({ s, ...project(p, s.a, s.b) }))
      .sort((a, b) => a.gap - b.gap);
    // Only local hub spurs, never a straight route across an entire section.
    const limit = hubs.some(h => h.point === p) ? 40 : 25;
    if (!candidates.some(q => attach(p, q.s, limit)))
      throw new Error(`Lot A hub anchor disconnected: ${p}`);
    for (const q of candidates)
      if (q.gap <= Math.min(limit, candidates[0].gap + 8)) attach(p, q.s, limit);
  }
  const nodes = [], edges = [], byPoint = new Map();
  const node = p => {
    const key = p.map(v => v.toFixed(5)).join(',');
    if (!byPoint.has(key)) {
      byPoint.set(key, nodes.length);
      nodes.push(p);
      edges.push([]);
    }
    return byPoint.get(key);
  };
  const edge = (p, q, source, bidirectional = true) => {
    if (!clearSegment(p, q)) return;
    const a = node(p), b = node(q), length = distance(p, q);
    if (a === b) return;
    edges[a].push({ to: b, length, source });
    if (bidirectional) edges[b].push({ to: a, length, source });
  };
  for (const s of segments) {
    const points = [...new Set(s.cuts)].sort((a, b) => a - b)
      .map(t => [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t]);
    for (let i = 1; i < points.length; i++) edge(points[i - 1], points[i], s.source, !departure);
  }
  for (const [p, q] of joins) edge(p, q, 'short aisle join');
  const result = { nodes, edges, node };
  graphs.set(key, result);
  return result;
}

function walk(start, end, departure) {
  const { nodes, edges, node } = graph(departure), from = node(start), to = node(end);
  const cost = new Map([[from, 0]]), previous = new Map(), open = new Set([from]);
  while (open.size) {
    let best;
    for (const id of open) if (best === undefined || cost.get(id) < cost.get(best)) best = id;
    open.delete(best);
    if (best === to) break;
    for (const edge of edges[best]) {
      const next = cost.get(best) + edge.length;
      if (next >= (cost.get(edge.to) ?? Infinity)) continue;
      cost.set(edge.to, next);
      previous.set(edge.to, { from: best, source: edge.source });
      open.add(edge.to);
    }
  }
  if (!cost.has(to)) throw new Error(`No Lot A aisle route from ${start} to ${end}`);
  const points = [], sources = [];
  let id = to;
  while (id !== undefined) {
    points.push(nodes[id]);
    const p = previous.get(id);
    if (p) sources.push(p.source);
    id = p?.from;
  }
  return { points: points.reverse(), sources: [...new Set(sources.reverse())] };
}

function splitLane(raw) {
  const points = [raw[0]], arcs = [0];
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1], b = raw[i], count = Math.max(1, Math.ceil(distance(a, b) / 2));
    for (let k = 1; k <= count; k++) {
      const p = [a[0] + (b[0] - a[0]) * k / count, a[1] + (b[1] - a[1]) * k / count];
      const gap = distance(points.at(-1), p);
      if (gap < 1e-6) continue;
      arcs.push(arcs.at(-1) + gap);
      points.push(p);
    }
  }
  const shifted = points.map((p, i) => {
    const a = points[Math.max(0, i - 2)], b = points[Math.min(points.length - 1, i + 2)];
    const length = distance(a, b) || 1;
    const offset = 7 * Math.min(1, arcs[i] / 16, (arcs.at(-1) - arcs[i]) / 16);
    for (const factor of [1, .75, .5, .25, 0]) {
      const q = [p[0] - (b[1] - a[1]) / length * offset * factor,
        p[1] + (b[0] - a[0]) / length * offset * factor];
      if (clearSegment(p, q) && (factor === 0 || drivableAllowed(q))) return q;
    }
    return p;
  });
  for (let i = 1; i < shifted.length; i++)
    if (!clearSegment(shifted[i - 1], shifted[i])) throw new Error('A/B split hub aisle touches a roof');
  return join(shifted);
}

export function aHubRoute(hubId, access = null) {
  const key = `${hubId}:${access ?? 'arrival'}`;
  if (!cache.has(key)) {
    const hub = abHubById(hubId);
    if (hub.lot !== 'a') throw new Error(`Not a Lot A hub: ${hubId}`);
    const end = access ? A_HUB_DEPARTURE_JOINS[hub.zone] : hub.point;
    const start = access ? hub.point : entries[hub.zone];
    if (!end || access && access !== 'a') throw new Error(`Invalid hub access ${access} for ${hubId}`);
    const path = walk(start, end, !!access);
    cache.set(key, splitLane(path.points));
    AB_HUB_ROUTE_PROVENANCE.push({ hub: hubId, phase: access ? 'departure' : 'arrival',
      access, sources: path.sources, halfGapPx: 7, provisional: true });
  }
  return cache.get(key);
}
