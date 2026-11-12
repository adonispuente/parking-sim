// CLAUDYBEAR 2026-11-07 — Lot A South 299/1150 lock probe. READ-ONLY, zero steps.
// Builds the aSouth arrival/departure lanes as campusSimulation getLane does
// and reproduces sharedTraffic routeWindow for the logged eleven stall:
// arrival 1150 at d=101.22 held by batch; departure 299 at d=3.99 yielding to it.
// Usage: node research/claudy-asouth-lock-probe.mjs [d1150] [d299]
import * as THREE from 'three';
import { keepRight } from '../src/traffic.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { indexLanePath } from '../src/lanePath.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { attachMainPositionToLane, LOT_A_MAIN_POSITION } from '../src/lotAControl.js';
import { fromWorld } from '../src/clearImageSource.js';

const point = ([x, y]) => { const [wx, wz] = traceWorldPoint([x, y]); return new THREE.Vector3(wx, .6, wz); };
const makeLane = (coords, name) => {
  const pts = keepRight(coords.map(vectorToTrace)).map(point), path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > .00001) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  indexLanePath(path);
  return { path, length: path.getLength(), name };
};
const HALF = 1.35 / 2, LOOKAHEAD = 6, CW = .9;
const at = (l, d) => l.path.getPointAt(Math.max(0, Math.min(1, d / l.length)));
const px = p => fromWorld([p.x, p.z]).map(v => +v.toFixed(1));
const windowOf = (lane, distance, stop) => {
  const start = Math.max(0, distance - HALF - .6);
  const capped = Number.isFinite(stop) ? Math.max(distance, stop) + HALF : Infinity;
  const end = Math.min(lane.length, distance + LOOKAHEAD, capped);
  const count = Math.max(1, Math.ceil((end - start) / 1.5));
  return Array.from({ length: count + 1 }, (_, i) => { const d = start + (end - start) * i / count; return { d, rel: d - distance, p: at(lane, d) }; });
};
const segGap = (a, b, c, d) => {
  let g = Infinity, ta = 0, tb = 0;
  for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
    const p = a.clone().lerp(b, i / 20), q = c.clone().lerp(d, j / 20), dd = Math.hypot(p.x - q.x, p.z - q.z);
    if (dd < g) { g = dd; ta = i / 20; tb = j / 20; }
  }
  return { g, ta, tb };
};
const conflicts = (A, B) => {
  const out = [];
  for (let i = 1; i < A.length; i++) for (let j = 1; j < B.length; j++) {
    const h = segGap(A[i - 1].p, A[i].p, B[j - 1].p, B[j].p);
    if (h.g < CW) out.push({ gap: +h.g.toFixed(3),
      aRel: +(A[i - 1].rel + (A[i].rel - A[i - 1].rel) * h.ta).toFixed(2),
      bRel: +(B[j - 1].rel + (B[j].rel - B[j - 1].rel) * h.tb).toFixed(2),
      aPx: px(A[i - 1].p.clone().lerp(A[i].p, h.ta)), bPx: px(B[j - 1].p.clone().lerp(B[j].p, h.tb)) });
  }
  return out.sort((x, y) => (Math.max(0, x.aRel) + Math.max(0, x.bRel)) - (Math.max(0, y.aRel) + Math.max(0, y.bRel)));
};
const arrPts = zoneArrivalRoute('a', 'aSouth'), depPts = zoneDepartureRoute('a', 'aSouth');
const arr = makeLane(arrPts, 'Arrival · a · aSouth'), dep = makeLane(depPts, 'Departure · a · aSouth');
attachMainPositionToLane(arr, arrPts, 'aMain'); attachMainPositionToLane(dep, depPts, 'aSouth');
const d1150 = +(process.argv[2] ?? 101.22), d299 = +(process.argv[3] ?? 3.99);
const report = {
  main: LOT_A_MAIN_POSITION,
  arrival: { length: +arr.length.toFixed(2), aControl: arr.aControl, stopPx: px(at(arr, arr.aControl.stopDistance)), mergePx: px(at(arr, arr.aControl.mergeDistance)) },
  departure: { length: +dep.length.toFixed(2), aControl: dep.aControl, stopPx: px(at(dep, dep.aControl.stopDistance)), mergePx: px(at(dep, dep.aControl.mergeDistance)), rawPts: depPts.map(p => p.map(v => +v.toFixed(1))) },
  car1150: { d: d1150, px: px(at(arr, d1150)), beyondStop: +(d1150 - arr.aControl.stopDistance).toFixed(2) },
  car299: { d: d299, px: px(at(dep, d299)) },
};
const w1150 = windowOf(arr, d1150, arr.aControl.stopDistance);
const w299 = windowOf(dep, d299, d299 >= dep.aControl.stopDistance - 1e-6 ? dep.aControl.stopDistance : Infinity);
report.window1150 = w1150.map(s => ({ rel: +s.rel.toFixed(2), px: px(s.p) }));
report.window299 = w299.map(s => ({ rel: +s.rel.toFixed(2), px: px(s.p) }));
report.conflicts = conflicts(w299, w1150).slice(0, 6);
let best = { gap: Infinity };
for (let d = Math.max(0, d1150 - HALF); d <= d1150 + HALF; d += .05) for (let e = 0; e <= dep.length; e += .05) {
  const g = at(arr, d).distanceTo(at(dep, e)); if (g < best.gap) best = { gap: +g.toFixed(3), arrD: +d.toFixed(2), depD: +e.toFixed(2), arrPx: px(at(arr, d)), depPx: px(at(dep, e)) };
}
report.body1150VsDepartureLane = best;
report.arrivalStopBackSweep = [1.7, 2.2, 2.7, 3.2, 3.7, 4.2].map(back => {
  const stop = arr.aControl.mergeDistance - back; let g = Infinity;
  for (let d = stop - HALF; d <= stop + HALF; d += .05) for (let e = 0; e <= dep.length; e += .05) g = Math.min(g, at(arr, d).distanceTo(at(dep, e)));
  return { back, stopPx: px(at(arr, stop)), gapToDepartureLane: +g.toFixed(3) };
});
console.log(JSON.stringify(report, null, 1));
