// Focused runtime checks for the unified-source migration: opposing street
// lanes, Main Position clearance, pavement-first connectors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { keepRight, KEEP_RIGHT_PX } from '../src/traffic.js';
import { onStreet } from '../src/pavementRouting.js';
import { zoneDepartureRoute, zoneArrivalRoute, B7_ROW_SWEEP } from '../src/parkingRoutes.js';
import { pointAt, routeAt, WORLD_SCALE } from '../src/clearImageSource.js';
import { CONNECTOR_PROVENANCE, NONPAVEMENT_CONNECTOR_MODES, onDrivable } from '../src/sourceRouting.js';
import { createCampusTraffic } from '../src/traffic.js';
import { mainStopBack } from '../src/lotAControl.js';

const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const main = pointAt(57);

test('opposing directions on Corporate get separate right-hand lanes', () => {
  // Corporate south bend from source #17 (258.6,544.9 -> 26.7,531.6).
  const west = [[250, 544], [180, 540], [120, 537]];
  assert.ok(west.every(onStreet), 'fixture is on traced Corporate');
  const east = [...west].reverse();
  const w = keepRight(west), e = keepRight(east).reverse();
  for (let i = 0; i < w.length; i++) {
    assert.ok(d(w[i], e[i]) >= .9 / WORLD_SCALE, `gap ${d(w[i], e[i]).toFixed(1)}px at ${i}`);
    assert.ok(onStreet(w[i]) && onStreet(e[i]));
  }
});

test('same direction on a street stays one physical queue', () => {
  const a = keepRight([[250, 544], [120, 537]]), b = keepRight([[248, 546], [118, 535]]);
  assert.ok(d(a[0], b[0]) < KEEP_RIGHT_PX, 'normalized to one lane');
});

test('lot points (Main Position) are never offset', () => {
  if (onStreet(main)) return; // only meaningful when Main is inside a lot
  assert.deepEqual(keepRight([main, [main[0] + 20, main[1]]])[0], main);
});

// The admitted Main car must not sweep into the opposing approach hold point,
// located at the stop distance the controller actually applies to that route.
const holdPoint = route => {
  const k = route.findIndex(p => d(p, main) < .001);
  let need = mainStopBack(route) / WORLD_SCALE;
  for (let i = k; i > 0; i--) {
    const seg = d(route[i], route[i - 1]);
    if (seg >= need) { const t = need / seg; return [route[i][0] + (route[i - 1][0] - route[i][0]) * t, route[i][1] + (route[i - 1][1] - route[i][1]) * t]; }
    need -= seg;
  }
  return route[0];
};
const afterMain = route => route.slice(route.findIndex(p => d(p, main) < .001));
const minGap = (path, p) => {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) for (let j = 0; j <= 20; j++) {
    const a = path[i - 1], b = path[i];
    best = Math.min(best, d(p, [a[0] + (b[0] - a[0]) * j / 20, a[1] + (b[1] - a[1]) * j / 20]));
  }
  return best;
};

test('A departures through Main do not double back into the opposing held queue', () => {
  const north = zoneDepartureRoute('a', 'aNorth'), south = zoneDepartureRoute('a', 'aSouth');
  for (const r of [north, south]) assert.ok(r.some(p => d(p, main) < .001), 'traverses Main');
  const clearance = (.325 * 2 + .15) / WORLD_SCALE;
  assert.ok(minGap(afterMain(south), holdPoint(north)) > clearance, 'south exit clears held north car');
  assert.ok(minGap(afterMain(north), holdPoint(south)) > clearance, 'north exit clears held south car');
});

test('connectors prefer traced pavement; fallbacks are flagged', () => {
  for (const zone of ['aNorth', 'aSouth', 'bSouth', 'bNorth', 'cNorth', 'cSouth']) zoneArrivalRoute(zone[0] === 'a' ? 'a' : zone[0] === 'b' ? 'bWest' : 'cWest', zone);
  for (const c of CONNECTOR_PROVENANCE) {
    // nonpavement iff the mode is a registered, disclosed off-pavement fallback.
    assert.equal(c.nonpavement, NONPAVEMENT_CONNECTOR_MODES.includes(c.mode), c.context);
    if (c.nonpavement) assert.match(c.source, /not a traced aisle/, c.context);
    if (c.mode === 'straight-on-pavement' && d(c.start, c.end) > 1) assert.ok(onDrivable(c.start) && onDrivable(c.end), c.context);
  }
  const throat = CONNECTOR_PROVENANCE.filter(c => c.context === 'C staffed entrance #63 to #8 interior');
  assert.equal(throat.length, 1, 'C #63 throat recorded once');
  assert.equal(throat[0].mode, 'staffed-entrance-throat');
  assert.equal(throat[0].nonpavement, true, 'untraced #63 join stays flagged');
});

test('mixed A departure drains both North and South through Main', () => {
  // Explicit split: a:24 alone fills aNorth first (24 <= its capacity), which
  // never exercised the South approach or the five-car handoff.
  const s = createCampusTraffic({ initialOccupancy: { a: 24, b: 0, c: 0 },
    initialZoneOccupancy: { aNorth: 12, aSouth: 12, aBadge: 0 }, service: { enabled: false } });
  assert.equal(s.zoneOccupancy.aNorth, 12); assert.equal(s.zoneOccupancy.aSouth, 12);
  s.setPhase('departure');
  for (let i = 0; i < 6000; i++) s.step(.1);
  assert.equal(s.departed.a, 24, JSON.stringify({ departed: s.departed, issues: s.routingIssues }));
  assert.ok(s.aMainControl.totalPassed.aNorth >= 12 && s.aMainControl.totalPassed.aSouth >= 12, JSON.stringify(s.aMainControl.totalPassed));
  // Five-car handoff: while both queues hold cars (first 20 passes), no side runs past five.
  const sides = s.aMainControl.history.slice(0, 20).map(e => e.side);
  let run = 0, maxRun = 0;
  sides.forEach((side, i) => { run = i && side === sides[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run); });
  assert.ok(new Set(sides).size >= 2 && maxRun <= 5, sides.join(','));
});

// Eleven/final smoke: a B departure that reversed its arrival aisle met
// arrivals and shuttles head-on (px 549,408). Inside B, no departure sample
// within 3px of a traced B arrival/shuttle line may travel against that line.
test('B departures never run against traced B arrival or shuttle circulation', () => {
  const lines = [4, 5, 6, 7, 25].map(routeAt);
  const seg = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  };
  for (const access of ['bWest', 'bNorth']) for (const zone of ['bSouth', 'bBanana', 'bPocket', 'bNorth']) {
    const route = zoneDepartureRoute(access, zone);
    // Perimeter only: no departure may tour the B North row sweep of source #7.
    for (const p of route) for (const q of B7_ROW_SWEEP)
      assert.ok(d(p, q) > 4, `${access}/${zone} departure enters #7 row sweep at ${q.map(v => v.toFixed(1))}`);
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i], n = d(a, b);
      if (n < 1) continue;
      const u = [(b[0] - a[0]) / n, (b[1] - a[1]) / n], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (mid[0] < 520 || mid[1] < 140) continue; // inside B only; streets use keepRight lanes
      for (const line of lines) for (let j = 1; j < line.length; j++) {
        const p = line[j - 1], q = line[j], m = d(p, q);
        if (m < 1 || seg(mid, p, q) > 3) continue;
        const dot = u[0] * (q[0] - p[0]) / m + u[1] * (q[1] - p[1]) / m;
        assert.ok(dot > -.5, `${access}/${zone} runs against source line near ${mid.map(v => v.toFixed(1))}`);
      }
    }
  }
});

// Lead trace (demand 300): A arrival passed Main, went to #1's [230,99], then
// grid-looped back beside Main; the gate held car 953 at px 221.8,94.66.
// Every A arrival must visit Main exactly once and never return near it.
test('A arrivals cross Lot A Main exactly once', () => {
  for (const key of ['a', 'eA']) for (const zone of ['aNorth', 'aSouth']) {
    const route = zoneArrivalRoute(key, zone);
    const hits = route.map((p, i) => [i, d(p, main)]).filter(([, v]) => v < .001);
    assert.equal(hits.length, 1, `${key}/${zone} visits Main ${hits.length} times`);
    const k = hits[0][0];
    // Sample segments after Main: once the car is 10px past, it never comes back within 8px.
    let left = false;
    for (let i = k + 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i], n = Math.max(1, Math.ceil(d(a, b) / .5));
      for (let j = 0; j <= n; j++) {
        const p = [a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n], r = d(p, main);
        if (r > 10) left = true;
        else if (left) assert.ok(r >= 8, `${key}/${zone} returns to Main at ${p.map(v => v.toFixed(1))}`);
      }
    }
  }
});
