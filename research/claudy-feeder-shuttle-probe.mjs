// CLAUDYBEAR read-only probe: does the F1 Feeder middle outbound lane crowd
// shuttles? Builds lanes exactly as src/traffic.js lane() does:
// keepRight(coords.map(vectorToTrace), KEEP_RIGHT_PX, feederOffset).
// Measures, on Feeder (shape 54), min separation between each bWest departure
// (old lane: feederOffset null; middle lane: FEEDER_MIDDLE_OUTBOUND_PX) and
// every shuttle leg. Changes nothing in src/.
// Usage: node research/claudy-feeder-shuttle-probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { keepRight, KEEP_RIGHT_PX, FEEDER_MIDDLE_OUTBOUND_PX } from '../src/traffic.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { zoneDepartureRoute } from '../src/parkingRoutes.js';
import { buildShuttleCircuits } from '../src/shuttleRoutes.js';
import { inPolygon } from '../src/pavementRouting.js';
import { shapeAt, WORLD_SCALE } from '../src/clearImageSource.js';

const out = process.argv[2] ?? 'research/claudy-feeder-shuttle-probe.json';
const feeder = shapeAt(54).points, onFeeder = p => inPolygon(p, feeder);
const CONFLICT_PX = 0.9 / WORLD_SCALE, r2 = v => Math.round(v * 100) / 100;
const dense = (pts, step = 1) => { const o = [pts[0]]; for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return o; };
const build = (pts, f) => dense(keepRight(pts.map(vectorToTrace), KEEP_RIGHT_PX, f));
const shuttles = {};
for (const [circuit, legs] of Object.entries(buildShuttleCircuits())) legs.forEach((leg, i) => {
  const pts = build(leg.points, null).filter(onFeeder);
  if (pts.length) shuttles[`Shuttle · ${circuit} · leg ${i + 1} → ${leg.stop}`] = pts;
});
const res = { conflictPx: r2(CONFLICT_PX), pxPerWorld: r2(1 / WORLD_SCALE), shuttleLegsOnFeeder: Object.fromEntries(Object.entries(shuttles).map(([k, v]) => [k, v.length])), pairs: [] };
for (const z of ['bSouth', 'bBanana', 'bNorth', 'bPocket']) {
  let raw; try { raw = zoneDepartureRoute('bWest', z); } catch (e) { res.pairs.push({ zone: z, error: String(e) }); continue; }
  for (const [mode, f] of [['old', null], ['middle', FEEDER_MIDDLE_OUTBOUND_PX]]) {
    const dep = build(raw, f).filter(onFeeder);
    for (const [name, sp] of Object.entries(shuttles)) {
      let best = Infinity, at = null, close = 0;
      for (const p of dep) { let m = Infinity; for (const q of sp) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < m) m = d; } if (m < best) { best = m; at = p; } if (m < CONFLICT_PX) close++; }
      res.pairs.push({ zone: z, mode, shuttle: name, minSepPx: r2(best), minSepWorld: r2(best * WORLD_SCALE), at: at && at.map(r2), depSamplesUnderConflict: close, depSamplesOnFeeder: dep.length });
    }
  }
}
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ out, conflictPx: res.conflictPx, shuttleLegsOnFeeder: res.shuttleLegsOnFeeder, pairs: res.pairs.map(p => p.error ? p : `${p.zone} ${p.mode} vs ${p.shuttle}: ${p.minSepWorld}w, ${p.depSamplesUnderConflict}/${p.depSamplesOnFeeder} under`) }, null, 1));
