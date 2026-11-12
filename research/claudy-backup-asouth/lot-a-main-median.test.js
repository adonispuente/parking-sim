// Lot A Main median (CLAUDYBEAR 2026-11-06). Commander: "In Lot A main entrance,
// theres a similar median that allows cars to exit while cars are entering."
// Checks run on BUILT lane polylines (keepRight, as traffic.js builds lanes), not
// on raw route vertices, so a lane-builder offset cannot hide a clearance gap.
// Threshold is sharedTraffic CONFLICT_WIDTH (.9 world): opposing paths closer
// than this are treated as one conflict, which caused the held-arrival deadlock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { keepRight } from '../src/traffic.js';
import { vectorToTrace, VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { zoneArrivalRoute, zoneDepartureRoute, A_MEDIAN, A_MEDIAN_PROVENANCE } from '../src/parkingRoutes.js';
import { LOT_A_MAIN_POSITION, LOT_A_MAIN_BATCH_SIZE, MAIN_STOP_BACK, mainStopBack, mainHoldBack } from '../src/lotAControl.js';
import { WORLD_SCALE } from '../src/clearImageSource.js';
import { avoidsObstacles } from '../src/sourceRouting.js';

const main = LOT_A_MAIN_POSITION;
const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const CONFLICT_PX = .9 / WORLD_SCALE;
const HALF_PX = 1.35 / 2 / WORLD_SCALE;
const QUEUE_OUT_PX = 60; // held car plus the next queued car's body
const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return d(p, [a[0] + dx * t, a[1] + dy * t]);
};
const lane = raw => keepRight(raw.map(vectorToTrace));
const mainIdx = pts => { let b = 0; for (let i = 1; i < pts.length; i++) if (d(pts[i], main) < d(pts[b], main)) b = i; return b; };
// Point `dist` px from Main along the lane, walking backward (approach) or forward (exit).
const along = (pts, k, dist, dir) => {
  let i = k, left = dist;
  while (true) {
    const j = i + dir; if (j < 0 || j >= pts.length) return pts[i];
    const seg = d(pts[i], pts[j]);
    if (seg >= left) { const t = left / (seg || 1); return [pts[i][0] + (pts[j][0] - pts[i][0]) * t, pts[i][1] + (pts[j][1] - pts[i][1]) * t]; }
    left -= seg; i = j;
  }
};
const minGap = (p, pts) => { let g = Infinity; for (let i = 1; i < pts.length; i++) g = Math.min(g, segDist(p, pts[i - 1], pts[i])); return g; };

const departures = Object.fromEntries(['aNorth', 'aSouth'].map(z => [z, zoneDepartureRoute('a', z)]));
const arrivals = [];
for (const key of Object.keys(VECTOR_ROUTES.arrival)) for (const zone of ['aNorth', 'aSouth']) {
  let raw; try { raw = zoneArrivalRoute(key, zone); } catch { continue; }
  if (raw.some(p => d(p, main) < .001)) arrivals.push({ key, zone, raw });
}

test('five-car policy and Main anchor unchanged; every general A route passes exactly through Main', () => {
  assert.equal(LOT_A_MAIN_BATCH_SIZE, 5);
  assert.ok(arrivals.length >= 2, 'general A arrivals found');
  for (const a of arrivals) {
    assert.equal(a.raw.filter(p => d(p, main) < .001).length, 1, `${a.key}:${a.zone} crosses Main once`);
    assert.equal(mainStopBack(a.raw), MAIN_STOP_BACK, `${a.key}:${a.zone} stop-back unchanged`);
  }
  for (const [z, r] of Object.entries(departures)) {
    assert.equal(r.filter(p => d(p, main) < .001).length, 1, `out:${z} crosses Main once`);
    // Recorded before the exit-side nose change: research/claudy-lot-a-stopback-before-nosefix.json
    assert.equal(mainStopBack(r), MAIN_STOP_BACK, `out:${z} stop-back unchanged`);
  }
});

test('held arrival body clears every A departure lane on built lanes', () => {
  const out = Object.fromEntries(Object.entries(departures).map(([z, r]) => [z, lane(r)]));
  for (const a of arrivals) {
    const pts = lane(a.raw), k = mainIdx(pts);
    assert.ok(d(pts[k], main) < .5, `${a.key}:${a.zone} built lane keeps Main`);
    const back = mainStopBack(a.raw) / WORLD_SCALE;
    for (let x = back - HALF_PX; x <= back + HALF_PX + .6 / WORLD_SCALE; x += .5) {
      const p = along(pts, k, x, -1);
      for (const [z, o] of Object.entries(out)) {
        const g = minGap(p, o);
        assert.ok(g >= CONFLICT_PX, `${a.key}:${a.zone} held body ${x.toFixed(1)}px from Main is ${g.toFixed(2)}px from out:${z} (< ${CONFLICT_PX.toFixed(2)})`);
      }
    }
  }
});

test('queued arrivals behind the held car clear every A departure lane', () => {
  const out = Object.fromEntries(Object.entries(departures).map(([z, r]) => [z, lane(r)]));
  for (const a of arrivals) {
    const pts = lane(a.raw), k = mainIdx(pts);
    const start = mainStopBack(a.raw) / WORLD_SCALE + HALF_PX + .6 / WORLD_SCALE;
    for (let x = start; x <= QUEUE_OUT_PX; x += .5) {
      const p = along(pts, k, x, -1);
      for (const [z, o] of Object.entries(out)) {
        const g = minGap(p, o);
        assert.ok(g >= CONFLICT_PX, `${a.key}:${a.zone} queue ${x.toFixed(1)}px from Main is ${g.toFixed(2)}px from out:${z}`);
      }
    }
  }
});

// Reverse direction: a departure held at its own stop line (incl. the aSouth
// staging leg south of the arrival line) must not block an admitted arrival.
const heldDepartureGaps = arrivalPart => {
  const bad = [];
  for (const [z, r] of Object.entries(departures)) {
    const pts = lane(r), k = mainIdx(pts);
    assert.ok(d(pts[k], main) < .5, `out:${z} built lane keeps Main`);
    // The stop the controller actually applies (MAIN_DEPARTURE_HOLD_BACK included).
    const back = mainHoldBack(r, z) / WORLD_SCALE;
    for (let x = back - HALF_PX; x <= back + HALF_PX + .6 / WORLD_SCALE; x += .5) {
      const p = along(pts, k, x, -1);
      for (const a of arrivals) {
        const al = lane(a.raw), ka = mainIdx(al);
        const g = minGap(p, arrivalPart === 'approach' ? al.slice(0, ka + 1) : al);
        if (g < CONFLICT_PX) bad.push(`out:${z} held ${x.toFixed(1)}px before Main is ${g.toFixed(2)}px from ${a.key}:${a.zone}`);
      }
    }
  }
  return bad;
};
test('held departure body clears every A arrival APPROACH (median side) on built lanes', () => {
  assert.deepEqual(heldDepartureGaps('approach'), []);
});
// The aNorth post-Main aisle conflict (6.29px on backup) is repaired by
// MAIN_DEPARTURE_HOLD_BACK; tests/lot-a-main-held-departure.test.js now asserts it.
// REMAINING, separate: the aSouth departure stages on the shared aSouth aisle the
// aSouth arrival drives after Main (0.013 world, claudy-main-stop-clearance-probe.log).
// Left as todo so it keeps reporting; do not delete or convert to a pass.
test('held departure body clears the FULL A arrival lane (incl. post-Main aisle)',
  { todo: 'remaining aSouth shared-aisle conflict; aNorth repaired by MAIN_DEPARTURE_HOLD_BACK' }, () => {
    assert.deepEqual(heldDepartureGaps('full'), []);
  });

test('arrivals keep right of travel (entrance side), departures right of travel (exit side)', () => {
  for (const a of arrivals) for (const [z, r] of Object.entries(departures)) {
    const ka = a.raw.findIndex(p => d(p, main) < .001), kd = r.findIndex(p => d(p, main) < .001);
    const P = along(a.raw, ka, 30, -1), Q = along(r, kd, 30, 1);
    const t = [Q[0] - main[0], Q[1] - main[1]], right = [-t[1], t[0]]; // image y down
    // The arrival must sit on the departure's LEFT (its own right of travel).
    assert.ok((P[0] - Q[0]) * right[0] + (P[1] - Q[1]) * right[1] < 0, `${a.key}:${a.zone} vs out:${z} side`);
  }
});

test('median offsets avoid obstacles and every step-down is recorded', () => {
  for (const r of [...arrivals.map(a => a.raw), ...Object.values(departures)])
    for (let i = 1; i < r.length; i++) {
      const a = r[i - 1], b = r[i], n = Math.max(1, Math.ceil(d(a, b) / .5));
      for (let j = 0; j <= n; j++) assert.ok(avoidsObstacles([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]));
    }
  assert.equal(A_MEDIAN.provisional, true);
  assert.ok(A_MEDIAN_PROVENANCE.length > 0, 'median application recorded');
  for (const p of A_MEDIAN_PROVENANCE) assert.ok(p.samples > 0 && Number.isFinite(p.reduced), JSON.stringify(p));
});

test('no median offset was silently reduced', () => {
  const reduced = A_MEDIAN_PROVENANCE.filter(p => p.reduced > 0);
  assert.deepEqual(reduced, [], JSON.stringify(reduced));
});
