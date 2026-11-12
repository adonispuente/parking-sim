// CLAUDYBEAR read-only probe: is the Equity/C head-on stretch inside a street
// polygon? For points along the arrival lane between the lock endpoints, report
// onStreet, onTwoWayStreet, avoidsObstacles, and which source shapes contain
// the point. Changes nothing in src/.
// Usage: node research/claudy-equity-c-pavement-probe.mjs
import { onStreet, inPolygon } from '../src/pavementRouting.js';
import { avoidsObstacles } from '../src/sourceRouting.js';
import { onMappedPavement } from '../src/vehicleRegistration.js';
import * as T from '../src/traffic.js';
import * as C from '../src/clearImageSource.js';

const pts = [[1032.6, 1105.7], [1033.5, 1098], [1035, 1090], [1037, 1083], [1040.1, 1075.3], [1045, 1068]];
const shapes = [];
for (let i = 0; i < 200; i++) { try { const s = C.shapeAt(i); if (s?.points) shapes.push([i, s]); } catch { break; } }
const two = T.onTwoWayStreet ?? null;
for (const p of pts) {
  const inside = shapes.filter(([, s]) => inPolygon(p, s.points)).map(([i, s]) => `${i}:${s.label ?? s.name ?? s.kind ?? ''}`);
  // distance to nearest street pixel in 1 px rings
  let near = null; for (let r = 1; r <= 40 && near == null; r++) for (let a = 0; a < 32; a++) { const q = [p[0] + r * Math.cos(a * Math.PI / 16), p[1] + r * Math.sin(a * Math.PI / 16)]; if (onStreet(q)) { near = r; break; } }
  console.log(JSON.stringify({ p, onStreet: onStreet(p), twoWay: two ? two(p) : 'n/a', avoidsObstacles: avoidsObstacles(p), mappedPavement: onMappedPavement(p), nearestStreetPx: onStreet(p) ? 0 : near, inside }));
}
console.log('shapes scanned', shapes.length, 'exports', Object.keys(T).filter(k => /street|two/i.test(k)));
