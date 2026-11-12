// CLAUDYBEAR read-only probe: does the F1 feederOffset change bWest departure
// geometry OFF Feeder (e.g. inside Lot B where shuttles share the aisle)?
// Builds each bWest departure as lane() does with feederOffset null vs
// FEEDER_MIDDLE_OUTBOUND_PX, densifies both, and reports for every sample of
// the middle-lane path that is NOT on Feeder its distance to the old path.
// Usage: node research/claudy-feeder-offlane-diff-probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { keepRight, KEEP_RIGHT_PX, FEEDER_MIDDLE_OUTBOUND_PX } from '../src/traffic.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { zoneDepartureRoute } from '../src/parkingRoutes.js';
import { inPolygon } from '../src/pavementRouting.js';
import { shapeAt } from '../src/clearImageSource.js';

const out = process.argv[2] ?? 'research/claudy-feeder-offlane-diff-probe.json';
const feeder = shapeAt(54).points, onFeeder = p => inPolygon(p, feeder), r1 = v => Math.round(v * 10) / 10;
const dense = (pts, step = 1) => { const o = [pts[0]]; for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return o; };
const res = {};
for (const z of ['bSouth', 'bBanana', 'bNorth', 'bPocket']) {
  let raw; try { raw = zoneDepartureRoute('bWest', z).map(vectorToTrace); } catch (e) { res[z] = String(e); continue; }
  const oldK = keepRight(raw, KEEP_RIGHT_PX, null), midK = keepRight(raw, KEEP_RIGHT_PX, FEEDER_MIDDLE_OUTBOUND_PX);
  const oldD = dense(oldK), midD = dense(midK);
  let maxOff = 0, at = null, offSamples = 0, moved = 0;
  for (const p of midD) {
    if (onFeeder(p)) continue; offSamples++;
    let m = Infinity; for (const q of oldD) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < m) m = d; }
    if (m > .5) moved++; if (m > maxOff) { maxOff = m; at = p.map(r1); }
  }
  res[z] = { vertices: [oldK.length, midK.length], offFeederSamples: offSamples, movedOver0_5px: moved, maxOffFeederShiftPx: r1(maxOff), at,
    sameVertexCount: oldK.length === midK.length, firstDiffVertex: oldK.findIndex((p, i) => !midK[i] || Math.hypot(p[0] - midK[i][0], p[1] - midK[i][1]) > 1e-9) };
}
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
