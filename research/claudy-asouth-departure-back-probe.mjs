// CLAUDYBEAR 2026-11-07 — aSouth departure hold-back x Main-inbound arrival stop sweep.
// READ-ONLY, zero steps. Reuses claudy-asouth-stop-sweep-probe.mjs rules by import-free copy
// via dynamic evaluation of that file's helpers is avoided; helpers duplicated below.
// For arrival stop-back A and aSouth departure hold-back D (aNorth departure held 3.0):
//  fwd: held arrivals (all 26) vs admitted departures sliding [their stop, release+2]
//  rev: held departures vs admitted arrivals sliding [their stop, release+4]
// Reports the minimum chord gap among hits the HELD car wins (<0.9 = lock).
import * as THREE from 'three';
import { keepRight } from '../src/traffic.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { vectorToTrace, VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { indexLanePath } from '../src/lanePath.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { attachMainPositionToLane } from '../src/lotAControl.js';
const point = ([x, y]) => { const [wx, wz] = traceWorldPoint([x, y]); return new THREE.Vector3(wx, .6, wz); };
const makeLane = (coords, name) => {
  const pts = keepRight(coords.map(vectorToTrace)).map(point), path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > .00001) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  indexLanePath(path); return { path, length: path.getLength(), name };
};
const HALF = 1.35 / 2, LOOKAHEAD = 6;
const at = (l, d) => l.path.getPointAt(Math.max(0, Math.min(1, d / l.length)));
const windowOf = (lane, distance, stop) => {
  const start = Math.max(0, distance - HALF - .6);
  const capped = Number.isFinite(stop) ? Math.max(distance, stop) + HALF : Infinity;
  const end = Math.min(lane.length, distance + LOOKAHEAD, capped);
  const count = Math.max(1, Math.ceil((end - start) / 1.5));
  return Array.from({ length: count + 1 }, (_, i) => { const d = start + (end - start) * i / count; return { rel: d - distance, point: at(lane, d) }; });
};
const clamp = v => Math.max(0, Math.min(1, v));
function nearestSegments(a, b, c, d) {
  const ux = b.x - a.x, uz = b.z - a.z, vx = d.x - c.x, vz = d.z - c.z, cross = ux * vz - uz * vx;
  if (Math.abs(cross) > 1e-9) { const dx = c.x - a.x, dz = c.z - a.z, t = (dx * vz - dz * vx) / cross, u = (dx * uz - dz * ux) / cross;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { t, u, gap: 0 }; }
  const uu = ux * ux + uz * uz, vv = vx * vx + vz * vz;
  let t = 0, u = clamp(((a.x - c.x) * vx + (a.z - c.z) * vz) / (vv || 1)), dx = a.x - c.x - vx * u, dz = a.z - c.z - vz * u, best = dx * dx + dz * dz;
  let n = clamp(((b.x - c.x) * vx + (b.z - c.z) * vz) / (vv || 1)); dx = b.x - c.x - vx * n; dz = b.z - c.z - vz * n; let s = dx * dx + dz * dz; if (s < best) { best = s; t = 1; u = n; }
  n = clamp(((c.x - a.x) * ux + (c.z - a.z) * uz) / (uu || 1)); dx = a.x + ux * n - c.x; dz = a.z + uz * n - c.z; s = dx * dx + dz * dz; if (s < best) { best = s; t = n; u = 0; }
  n = clamp(((d.x - a.x) * ux + (d.z - a.z) * uz) / (uu || 1)); dx = a.x + ux * n - d.x; dz = a.z + uz * n - d.z; s = dx * dx + dz * dz; if (s < best) { best = s; t = n; u = 1; }
  return { t, u, gap: Math.sqrt(best) };
}
const blocking = (adm, held) => { let w = Infinity;
  for (let i = 1; i < adm.length; i++) for (let j = 1; j < held.length; j++) { const h = nearestSegments(adm[i - 1].point, adm[i].point, held[j - 1].point, held[j].point);
    const db = held[j - 1].rel + (held[j].rel - held[j - 1].rel) * h.u; if (db <= HALF + .6 && h.gap < w) w = h.gap; } return w; };
const arrivals = [];
for (const key of Object.keys(VECTOR_ROUTES.arrival)) for (const zone of ['aNorth', 'aSouth']) {
  let pts; try { pts = zoneArrivalRoute(key, zone); } catch { continue; }
  const lane = makeLane(pts, `${key}:${zone}`); if (attachMainPositionToLane(lane, pts, 'aMain')) arrivals.push(lane);
}
const deps = Object.fromEntries(['aNorth', 'aSouth'].map(z => { const pts = zoneDepartureRoute('a', z), l = makeLane(pts, `out:${z}`); attachMainPositionToLane(l, pts, z); return [z, l]; }));
const stopOf = (lane, back) => Math.max(0, lane.aControl.mergeDistance - back);
const out = [];
const aBacks = (process.argv[2] ?? '1.7,2.2').split(',').map(Number), dBacks = (process.argv[3] ?? '1.7,2.2,2.7,3.0,3.2,3.5,3.7,4.0,4.5').split(',').map(Number);
for (const A of aBacks) for (const D of dBacks) {
  const back = { aNorth: 3.0, aSouth: D };
  let fwd = Infinity, rev = Infinity, fwdWho = '', revWho = '';
  for (const arr of arrivals) for (const [z, dep] of Object.entries(deps)) {
    const ha = windowOf(arr, stopOf(arr, A), stopOf(arr, A));
    for (let d = stopOf(dep, back[z]); d <= Math.min(dep.length, dep.aControl.releaseDistance + 2); d += .03) {
      const g = blocking(windowOf(dep, d, Infinity), ha); if (g < fwd) { fwd = g; fwdWho = `${arr.name} held, ${dep.name}@${d.toFixed(2)}`; } }
    const hd = windowOf(dep, stopOf(dep, back[z]), stopOf(dep, back[z]));
    for (let d = stopOf(arr, A); d <= Math.min(arr.length, arr.aControl.releaseDistance + 4); d += .03) {
      const g = blocking(windowOf(arr, d, Infinity), hd); if (g < rev) { rev = g; revWho = `${dep.name} held, ${arr.name}@${d.toFixed(2)}`; } }
  }
  out.push({ arrivalBack: A, aSouthDepartureBack: D, aSouthDepartureStop: +stopOf(deps.aSouth, D).toFixed(2), fwdMin: +fwd.toFixed(3), fwdWho, revMin: +rev.toFixed(3), revWho });
}
console.log(JSON.stringify(out, null, 1));
