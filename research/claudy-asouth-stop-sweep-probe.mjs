// CLAUDYBEAR 2026-11-07 — Main-inbound held-arrival stop sweep. READ-ONLY, zero steps.
// For every arrival lane through Lot A Main (approach aMain) HELD at stop-back b,
// and every A departure (aNorth/aSouth) ADMITTED (uncapped window), slide the
// departure along its admitted path [its stop, release + 2] and apply the
// sharedTraffic routeWindow/firstConflict rules: chord windows, CONFLICT_WIDTH 0.9,
// and the held winner rule (held car wins only if hit <= half + 0.6 on its window).
// A blocking hit means the admitted departure yields to a batch-held arrival = lock.
// Also reports the reverse (held departure vs admitted arrival) at current stops.
import * as THREE from 'three';
import { keepRight } from '../src/traffic.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { vectorToTrace, VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { indexLanePath } from '../src/lanePath.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { attachMainPositionToLane, mainHoldBack } from '../src/lotAControl.js';
import { fromWorld } from '../src/clearImageSource.js';

const point = ([x, y]) => { const [wx, wz] = traceWorldPoint([x, y]); return new THREE.Vector3(wx, .6, wz); };
const makeLane = (coords, name) => {
  const pts = keepRight(coords.map(vectorToTrace)).map(point), path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > .00001) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  indexLanePath(path);
  return { path, length: path.getLength(), name, pts: coords };
};
const HALF = 1.35 / 2, LOOKAHEAD = 6, CW = .9;
const at = (l, d) => l.path.getPointAt(Math.max(0, Math.min(1, d / l.length)));
const px = p => fromWorld([p.x, p.z]).map(v => +v.toFixed(1));
const windowOf = (lane, distance, stop) => {
  const start = Math.max(0, distance - HALF - .6);
  const capped = Number.isFinite(stop) ? Math.max(distance, stop) + HALF : Infinity;
  const end = Math.min(lane.length, distance + LOOKAHEAD, capped);
  const count = Math.max(1, Math.ceil((end - start) / 1.5));
  return Array.from({ length: count + 1 }, (_, i) => { const d = start + (end - start) * i / count; return { rel: d - distance, point: at(lane, d) }; });
};
// sharedTraffic nearestSegments, copied.
const clamp = v => Math.max(0, Math.min(1, v));
function nearestSegments(a, b, c, d) {
  const ux = b.x - a.x, uz = b.z - a.z, vx = d.x - c.x, vz = d.z - c.z;
  const cross = ux * vz - uz * vx;
  if (Math.abs(cross) > 1e-9) {
    const dx = c.x - a.x, dz = c.z - a.z;
    const t = (dx * vz - dz * vx) / cross, u = (dx * uz - dz * ux) / cross;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { t, u, gap: 0 };
  }
  const uu = ux * ux + uz * uz, vv = vx * vx + vz * vz;
  let t = 0, u = clamp(((a.x - c.x) * vx + (a.z - c.z) * vz) / (vv || 1));
  let dx = a.x - c.x - vx * u, dz = a.z - c.z - vz * u, best = dx * dx + dz * dz;
  let next = clamp(((b.x - c.x) * vx + (b.z - c.z) * vz) / (vv || 1));
  dx = b.x - c.x - vx * next; dz = b.z - c.z - vz * next; let sq = dx * dx + dz * dz;
  if (sq < best) { best = sq; t = 1; u = next; }
  next = clamp(((c.x - a.x) * ux + (c.z - a.z) * uz) / (uu || 1));
  dx = a.x + ux * next - c.x; dz = a.z + uz * next - c.z; sq = dx * dx + dz * dz;
  if (sq < best) { best = sq; t = next; u = 0; }
  next = clamp(((d.x - a.x) * ux + (d.z - a.z) * uz) / (uu || 1));
  dx = a.x + ux * next - d.x; dz = a.z + uz * next - d.z; sq = dx * dx + dz * dz;
  if (sq < best) { best = sq; t = next; u = 1; }
  return { t, u, gap: Math.sqrt(best) };
}
// Returns min chord gap among hits where the HELD car is "occupied" (wins).
const blockingGap = (admittedW, heldW) => {
  let worst = Infinity, where = null;
  for (let i = 1; i < admittedW.length; i++) for (let j = 1; j < heldW.length; j++) {
    const h = nearestSegments(admittedW[i - 1].point, admittedW[i].point, heldW[j - 1].point, heldW[j].point);
    const db = heldW[j - 1].rel + (heldW[j].rel - heldW[j - 1].rel) * h.u;
    if (db <= HALF + .6 && h.gap < worst) { worst = h.gap; where = px(heldW[j - 1].point.clone().lerp(heldW[j].point, h.u)); }
  }
  return { worst, where };
};
const arrivals = [];
for (const key of Object.keys(VECTOR_ROUTES.arrival)) for (const zone of ['aNorth', 'aSouth']) {
  let pts; try { pts = zoneArrivalRoute(key, zone); } catch { continue; }
  const lane = makeLane(pts, `Arrival · ${key} · ${zone}`);
  if (attachMainPositionToLane(lane, pts, 'aMain')) arrivals.push(lane);
}
const departures = ['aNorth', 'aSouth'].map(zone => {
  const pts = zoneDepartureRoute('a', zone), lane = makeLane(pts, `Departure · a · ${zone}`);
  attachMainPositionToLane(lane, pts, zone); return lane;
});
const backs = [1.7, 1.9, 2.1, 2.2, 2.3, 2.5, 2.7, 3.0];
const rows = [];
for (const arr of arrivals) for (const dep of departures) {
  const row = { held: arr.name, admitted: dep.name, byBack: {} };
  for (const back of backs) {
    const stop = arr.aControl.mergeDistance - back, heldW = windowOf(arr, stop, stop);
    let worst = Infinity, at_ = null, where = null;
    for (let d = dep.aControl.stopDistance; d <= Math.min(dep.length, dep.aControl.releaseDistance + 2); d += .02) {
      const r = blockingGap(windowOf(dep, d, Infinity), heldW);
      if (r.worst < worst) { worst = r.worst; at_ = +d.toFixed(2); where = r.where; }
    }
    row.byBack[back] = { minChordGap: +worst.toFixed(3), depD: at_, heldPx: where, stopPx: px(at(arr, stop)) };
  }
  rows.push(row);
}
// Reverse direction at current applied stops: held departure vs admitted arrival.
const reverse = [];
for (const dep of departures) for (const arr of arrivals) {
  const stop = dep.aControl.stopDistance, heldW = windowOf(dep, stop, stop);
  let worst = Infinity, at_ = null;
  for (let d = arr.aControl.stopDistance; d <= Math.min(arr.length, arr.aControl.releaseDistance + 2); d += .02) {
    const r = blockingGap(windowOf(arr, d, Infinity), heldW);
    if (r.worst < worst) { worst = r.worst; at_ = +d.toFixed(2); }
  }
  reverse.push({ held: dep.name, appliedBack: +(dep.aControl.mergeDistance - stop).toFixed(2), admitted: arr.name, minChordGap: +worst.toFixed(3), arrD: at_ });
}
console.log(JSON.stringify({ arrivals: arrivals.map(a => a.name), currentArrivalBack: arrivals.map(a => +(a.aControl.mergeDistance - a.aControl.stopDistance).toFixed(2)), rows, reverse }, null, 1));
