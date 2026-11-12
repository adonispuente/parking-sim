// CLAUDYBEAR read-only probe: three-lane Feeder middle outbound slice.
// Builds B-west departure and Lot A arrival paths exactly as src/traffic.js lane()
// does (keepRight(coords.map(vectorToTrace))), then measures, on Feeder Road
// (shape 54): separation between each departure and the nearest arrival path,
// and paved width across the departure's travel normal. Changes nothing in src/.
// Usage: node research/claudy-feeder-lanes-probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { keepRight } from '../src/traffic.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { onStreet, inPolygon } from '../src/pavementRouting.js';
import { shapeAt, WORLD_SCALE } from '../src/clearImageSource.js';

const out = process.argv[2] ?? 'research/claudy-feeder-lanes-probe.json';
const feeder = shapeAt(54).points;
const onFeeder = p => inPolygon(p, feeder);
const CONFLICT_PX = 0.9 / WORLD_SCALE;
const build = pts => keepRight(pts.map(vectorToTrace));
const r1 = v => Math.round(v * 10) / 10;
const dense = (pts, step = 1) => {
  const o = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return o;
};
const width = (p, q) => {
  const dx = q[0] - p[0], dy = q[1] - p[1], m = Math.hypot(dx, dy); if (m < 1e-9) return null;
  const nx = -dy / m, ny = dx / m, edge = s => { for (let k = 1; k <= 80; k++) if (!onStreet([p[0] + nx * k * s, p[1] + ny * k * s])) return k - .5; return null; };
  const right = edge(1), left = edge(-1);
  return { right, left, total: right != null && left != null ? right + left : null };
};
const arrivals = {}, departures = {};
for (const z of ['aNorth', 'aSouth']) try { arrivals[`a·${z}`] = dense(build(zoneArrivalRoute('a', z))); } catch (e) { arrivals[`a·${z}`] = String(e); }
for (const z of ['bSouth', 'bBanana', 'bNorth', 'bPocket']) try { departures[`bWest·${z}`] = dense(build(zoneDepartureRoute('bWest', z))); } catch (e) { departures[`bWest·${z}`] = String(e); }
const arrPts = Object.values(arrivals).filter(Array.isArray).flat();
const nearest = p => { let best = Infinity; for (const q of arrPts) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < best) best = d; } return best; };
const result = { conflictPx: r1(CONFLICT_PX), pxPerWorld: r1(1 / WORLD_SCALE), departures: {} };
for (const [name, pts] of Object.entries(departures)) {
  if (!Array.isArray(pts)) { result.departures[name] = pts; continue; }
  const rows = [];
  for (let i = 0; i < pts.length - 1; i += 4) {
    if (!onFeeder(pts[i])) continue;
    rows.push({ i, p: pts[i].map(r1), sep: r1(nearest(pts[i])), width: width(pts[i], pts[i + 1]) });
  }
  const conflicted = rows.filter(r => r.sep < CONFLICT_PX);
  result.departures[name] = { feederSamples: rows.length, conflictedSamples: conflicted.length,
    firstConflict: conflicted[0] ?? null, minSep: rows.length ? r1(Math.min(...rows.map(r => r.sep))) : null,
    minWidth: rows.filter(r => r.width?.total).length ? Math.min(...rows.filter(r => r.width?.total).map(r => r.width.total)) : null,
    start: pts[0].map(r1), end: pts.at(-1).map(r1), rows };
}
result.arrivalsOnFeeder = Object.fromEntries(Object.entries(arrivals).map(([k, v]) => [k, Array.isArray(v) ? v.filter(onFeeder).filter((_, i) => i % 20 === 0).map(p => p.map(r1)) : v]));
writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ out, conflictPx: result.conflictPx, summary: Object.fromEntries(Object.entries(result.departures).map(([k, v]) => [k, typeof v === 'string' ? v : { feederSamples: v.feederSamples, conflicted: v.conflictedSamples, minSep: v.minSep, minWidth: v.minWidth, firstConflict: v.firstConflict, end: v.end }])) }, null, 1));
