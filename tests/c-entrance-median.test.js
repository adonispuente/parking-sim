import test from 'node:test';
import assert from 'node:assert/strict';
import { keepRight, createCampusTraffic } from '../src/traffic.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { zoneArrivalRoute, zoneDepartureRoute, ZONE_STAGING, C_MEDIAN, C_MEDIAN_PROVENANCE, inCThroat } from '../src/parkingRoutes.js';
import { WORLD_SCALE } from '../src/clearImageSource.js';

// Commander (2026-11-07): Lot C entrance = two roads split by a median; C cars use both exits ~50/50.
const CONFLICT_PX = .9 / WORLD_SCALE;
const ZONES = ['cFirstNorth', 'cFirstSouth', 'cNorth', 'cSouth'];
const lane = raw => keepRight(raw.map(vectorToTrace));
const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const dense = pts => { const o = []; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(d(a, b))); for (let j = 0; j < n; j++) o.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } o.push(pts.at(-1)); return o; };
const throat = p => p[0] > 950 && p[0] < 1020 && p[1] > 72 && p[1] < 132;

test('no C zone stages (parks/launches) inside the median throat', () => {
  for (const zone of ZONES) assert.equal(inCThroat(ZONE_STAGING[zone]), false, `${zone}: ${ZONE_STAGING[zone]}`);
});
test('entering and exiting C lanes stay a full conflict width apart through the median throat', () => {
  let worst = Infinity;
  for (const out of ['cWest', 'cEast']) for (const zo of ZONES) {
    const dep = dense(lane(zoneDepartureRoute(out, zo))).filter(throat);
    for (const key of ['cWest', 'eCWest', 'e2CWest']) for (const zi of ZONES)
      for (const p of dense(lane(zoneArrivalRoute(key, zi))).filter(throat)) for (const q of dep) worst = Math.min(worst, d(p, q));
  }
  assert.ok(worst >= CONFLICT_PX, `min gap ${worst.toFixed(2)} px < ${CONFLICT_PX.toFixed(2)}`);
});
test('C median is recorded as a provisional model parameter', () => {
  assert.equal(C_MEDIAN.provisional, true);
  assert.ok(C_MEDIAN_PROVENANCE.length >= 1 && C_MEDIAN_PROVENANCE.every(p => p.provisional === true));
});
test('C car departures split ~50/50 across both exits; west/east policies force one exit', () => {
  const run = policy => {
    const s = createCampusTraffic({ phase: 'departure', initialZoneOccupancy: { cNorth: 10, cSouth: 10 }, departurePolicy: policy, shuttles: { activeCount: 0 } });
    const seen = new Map();
    for (let i = 0; i < 4000 && seen.size < 20; i++) { s.step(.05); for (const c of s.cars) if (c.target === 'c' && c.phase === 'departing') seen.set(c.id, c.access); }
    assert.deepEqual(s.routingIssues, []);
    const v = [...seen.values()];
    return { west: v.filter(a => a === 'cWest').length, east: v.filter(a => a === 'cEast').length, total: v.length };
  };
  const split = run({}); assert.equal(split.total, 20); assert.equal(split.west, 10); assert.equal(split.east, 10);
  assert.equal(run({ c: 'west' }).east, 0);
  assert.equal(run({ c: 'east' }).west, 0);
});
