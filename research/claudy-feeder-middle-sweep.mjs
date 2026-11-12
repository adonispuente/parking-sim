// CLAUDYBEAR read-only probe: Feeder middle outbound lane, old vs new.
// Builds Lot B west departures (old single keep-right vs FEEDER_MIDDLE_OUTBOUND_PX)
// and Alpha arrivals exactly as src/traffic.js lane() builds them, then:
//  1) geometry: departure-to-arrival separation on Feeder after the turn north;
//  2) production: PUBLIC advanceSharedTraffic with a stationary arrival queued at
//     each sampled Feeder position and the departure driven through its exit.
// Changes nothing in src/. Usage: node research/claudy-feeder-middle-sweep.mjs [out.json]
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { keepRight, KEEP_RIGHT_PX, FEEDER_MIDDLE_OUTBOUND_PX, onFeederStreet } from '../src/traffic.js';
import { traceWorldPoint } from '../src/tracedMap.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { indexLanePath } from '../src/lanePath.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { onStreet } from '../src/pavementRouting.js';
import { avoidsObstacles } from '../src/sourceRouting.js';
import { advanceSharedTraffic } from '../src/sharedTraffic.js';
import { fromWorld, WORLD_SCALE } from '../src/clearImageSource.js';

const out = process.argv[2] ?? 'research/claudy-feeder-middle-sweep.json';
const r2 = v => Math.round(v * 100) / 100;
const build = (raw, feederOffset) => {
  const trace = keepRight(raw.map(vectorToTrace), KEEP_RIGHT_PX, feederOffset);
  const pts = trace.map(p => { const [x, z] = traceWorldPoint(p); return new THREE.Vector3(x, .6, z); });
  const path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > .00001) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  indexLanePath(path);
  return { trace, lane: { path, length: path.getLength() } };
};
const at = (lane, d) => { const p = lane.path.getPointAt(Math.min(1, Math.max(0, d / lane.length))); return fromWorld([p.x, p.z]); };
const arrivals = ['aNorth', 'aSouth'].map(z => ({ name: `a·${z}`, ...build(zoneArrivalRoute('a', z), null) }));
const zones = ['bSouth', 'bBanana', 'bNorth', 'bPocket'];
const result = { pxPerWorld: r2(1 / WORLD_SCALE), offsetPx: FEEDER_MIDDLE_OUTBOUND_PX, geometry: {}, production: {} };
// Arrival positions queued on Feeder near the B exit (trace y 470..530).
const queueStops = arrivals.map(a => {
  const stops = [];
  for (let d = 0; d <= a.lane.length; d += .25) { const [x, y] = at(a.lane, d); if (onFeederStreet([x, y]) && y >= 470 && y <= 530) stops.push(r2(d)); }
  return { ...a, stops };
});
for (const variant of ['old', 'middle']) {
  for (const z of zones) {
    const raw = zoneDepartureRoute('bWest', z);
    const dep = build(raw, variant === 'old' ? null : FEEDER_MIDDLE_OUTBOUND_PX);
    // Geometry after the turn north: dense samples on Feeder whose heading is northbound.
    let minSep = Infinity, minSepAt = null, offStreet = 0, obstacle = 0, samples = 0;
    for (let d = 0; d < dep.lane.length - .05; d += .05) {
      const p = at(dep.lane, d), q = at(dep.lane, d + .05);
      if (!onFeederStreet(p)) continue;
      if (!onStreet(p)) offStreet++;
      if (!avoidsObstacles(p)) obstacle++;
      if (!(q[1] - p[1] < -Math.abs(q[0] - p[0]))) continue; // northbound only
      samples++;
      for (const a of arrivals) for (let e = 0; e <= a.lane.length; e += .05) {
        const s = at(a.lane, e), sep = Math.hypot(s[0] - p[0], s[1] - p[1]) * WORLD_SCALE;
        if (sep < minSep) { minSep = sep; minSepAt = { dep: p.map(r2), arr: s.map(r2) }; }
      }
    }
    result.geometry[`${variant}:${z}`] = { northboundFeederSamples: samples, minSepWorld: r2(minSep), minSepAt, offStreet, obstacle, end: at(dep.lane, dep.lane.length).map(r2) };
    // Production sweep: stationary arrival, departure driven from 10 world before its end.
    const res = { samples: 0, blocked: 0, slowed: 0, blockedHeldY: [] };
    for (const a of queueStops) for (const stop of a.stops) {
      for (let d = Math.max(0, dep.lane.length - 10); d <= dep.lane.length; d += .2) {
        const car = { id: 'dep', lane: 0, distance: d, speed: 2.8, bodyLength: 1.35, phase: 'departing' };
        const held = { id: 'arr', lane: 1, distance: stop, speed: 0, bodyLength: 1.35, phase: 'arrival', holdForBatch: true, controlStopDistance: stop };
        advanceSharedTraffic({ cars: [car, held], lanes: [dep.lane, a.lane] }, .1);
        res.samples++;
        if (car.yieldingTo === 'arr') { res.blocked++; const y = r2(at(a.lane, stop)[1]); if (!res.blockedHeldY.includes(y) && res.blockedHeldY.length < 60) res.blockedHeldY.push(y); }
        if (car.distance < Math.min(dep.lane.length, d + .28) - 1e-8) res.slowed++;
      }
    }
    res.blockedHeldY.sort((x, y) => x - y);
    result.production[`${variant}:${z}`] = res;
  }
}
writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1).slice(0, 6000));
