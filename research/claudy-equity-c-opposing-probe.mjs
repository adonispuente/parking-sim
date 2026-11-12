// CLAUDYBEAR read-only probe: Equity/C head-on lock (887/1207/599, 700/1029/750).
// Builds the Equity entrance/exit 2 -> C arrival and the bNorth / cWest / cEast
// departures as src/traffic.js lane() does (keepRight(coords.map(vectorToTrace))
// with the production feederOffset rule), then in the box around the lock
// reports per arrival sample: nearest opposing departure distance (px, world),
// tangent alignment, and paved width across travel. Changes nothing in src/.
// Usage: node research/claudy-equity-c-opposing-probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { keepRight, KEEP_RIGHT_PX, FEEDER_MIDDLE_OUTBOUND_PX, usesFeederMiddleLane } from '../src/traffic.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { onStreet } from '../src/pavementRouting.js';
import { WORLD_SCALE } from '../src/clearImageSource.js';

const out = process.argv[2] ?? 'research/claudy-equity-c-opposing-probe.json';
const BOX = { x0: 960, x1: 1080, y0: 1000, y1: 1140 }, inBox = p => p[0] >= BOX.x0 && p[0] <= BOX.x1 && p[1] >= BOX.y0 && p[1] <= BOX.y1;
const CONFLICT_PX = 0.9 / WORLD_SCALE, r2 = v => Math.round(v * 100) / 100;
const dense = (pts, step = 1) => { const o = [pts[0]]; for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return o; };
const build = (raw, name) => dense(keepRight(raw.map(vectorToTrace), KEEP_RIGHT_PX, usesFeederMiddleLane(name) ? FEEDER_MIDDLE_OUTBOUND_PX : null));
const tan = (pts, i) => { const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)], m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / m, (b[1] - a[1]) / m]; };
const width = (p, t) => { const n = [-t[1], t[0]], edge = s => { for (let k = 1; k <= 80; k++) if (!onStreet([p[0] + n[0] * k * s, p[1] + n[1] * k * s])) return k - .5; return null; }; const l = edge(1), r = edge(-1); return { l, r, total: l != null && r != null ? l + r : null }; };
const lanes = {}, errors = {};
const tryAdd = (name, fn) => { try { lanes[name] = build(fn(), name); } catch (e) { errors[name] = String(e); } };
for (const z of ['cFirstSouth', 'cFirstNorth']) tryAdd(`Arrival · e2CWest · ${z}`, () => zoneArrivalRoute('e2CWest', z));
for (const [o, z] of [['bNorth', 'bNorth'], ['bNorth', 'bPocket'], ['cWest', 'cFirstNorth'], ['cEast', 'cFirstSouth']]) tryAdd(`Departure · ${o} · ${z}`, () => zoneDepartureRoute(o, z));
const arrivals = Object.keys(lanes).filter(k => k.startsWith('Arrival')), deps = Object.keys(lanes).filter(k => k.startsWith('Departure'));
const res = { conflictPx: r2(CONFLICT_PX), pxPerWorld: r2(1 / WORLD_SCALE), box: BOX, errors, lanesInBox: Object.fromEntries(Object.entries(lanes).map(([k, v]) => [k, v.filter(inBox).length])), pairs: {} };
for (const an of arrivals) for (const dn of deps) {
  const A = lanes[an], D = lanes[dn], rows = [];
  for (let i = 0; i < A.length; i += 3) {
    if (!inBox(A[i])) continue;
    let best = Infinity, j = -1; for (let k = 0; k < D.length; k++) { const d = Math.hypot(A[i][0] - D[k][0], A[i][1] - D[k][1]); if (d < best) { best = d; j = k; } }
    const ta = tan(A, i), td = tan(D, j);
    rows.push({ p: A[i].map(r2), sepPx: r2(best), sepWorld: r2(best * WORLD_SCALE), align: r2(ta[0] * td[0] + ta[1] * td[1]), width: width(A[i], ta) });
  }
  const under = rows.filter(r => r.sepPx < CONFLICT_PX);
  res.pairs[`${an} vs ${dn}`] = { samples: rows.length, underConflict: under.length, minSepWorld: rows.length ? Math.min(...rows.map(r => r.sepWorld)) : null,
    underSpan: under.length ? [under[0].p, under.at(-1).p] : null, underAlign: under.length ? [Math.min(...under.map(r => r.align)), Math.max(...under.map(r => r.align))] : null,
    minWidthPxUnder: under.filter(r => r.width.total).length ? Math.min(...under.filter(r => r.width.total).map(r => r.width.total)) : null, rows: under.length ? under : rows.slice(0, 8) };
}
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, pairs: Object.fromEntries(Object.entries(res.pairs).map(([k, v]) => [k, { samples: v.samples, underConflict: v.underConflict, minSepWorld: v.minSepWorld, underSpan: v.underSpan, underAlign: v.underAlign, minWidthPxUnder: v.minWidthPxUnder }])) }, null, 1));
