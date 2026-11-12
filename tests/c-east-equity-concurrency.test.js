// Commander 2026-11-09: the Equity/Corporate four-way (#64) is wide enough for
// cars turning in from Equity to move WHILE Lot C cars exit. Only a genuine
// physical crossing, or a releasing C shuttle, should stop either flow.
// Production path: 11AM, C300, .05 step, badge 5%, demand dispatch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';
import { pointAt, WORLD_SCALE } from '../src/clearImageSource.js';

test('Equity arrivals and C exits flow concurrently at #64 (C300, .05 step)', () => {
  const dt = .05, config = serviceOptions('eleven', { earlyPercent: 0 });
  const state = createCampusTraffic({ initialOccupancy: { ...config.initialOccupancy, c: 300 }, badgePercent: 5,
    service: { enabled: true, ...config },
    shuttles: { dispatchMode: 'demand', randomDwell: true, bFullPercent: 100, dwellSeconds: 45, cDirection: 'auto', bStop: 'circuit' } });
  const [jx, jz] = pointAt(64).map(v => v * WORLD_SCALE);
  const pos = c => { const l = state.lanes[c.lane]; return l.path.getPointAt(Math.min(1, c.distance / l.length)); };
  let both = 0, bothMoving = 0, crossNoBus = 0, minGap = Infinity;
  const allowed = new Set(['clear-occupied-conflict', 'departure-priority', 'arrival-priority', 'safe-following']);
  for (let t = 1; t <= Math.round(3900 / dt); t++) {
    const before = new Map(state.cars.map(c => [c.id, c.distance]));
    state.step(dt);
    const near = state.cars.filter(c => { const p = pos(c); return Math.hypot(p.x - jx, p.z - jz) <= 9; });
    const arr = near.filter(c => !c.fleetBus && c.phase !== 'departing');
    const ex = near.filter(c => !c.fleetBus && c.phase === 'departing' && c.target === 'c');
    if (!arr.length || !ex.length) continue;
    both++;
    const moved = c => c.distance - (before.get(c.id) ?? c.distance) > 1e-4;
    const am = arr.filter(moved), em = ex.filter(moved);
    if (am.length && em.length) {
      bothMoving++;
      for (const a of am) for (const e of em) minGap = Math.min(minGap, pos(a).distanceTo(pos(e)));
    }
    const exIds = new Set(ex.map(c => c.id)), arIds = new Set(arr.map(c => c.id));
    const bus = state.northernRadio.releaseBuses.length > 0;
    for (const c of [...arr.filter(a => exIds.has(a.yieldingTo)), ...ex.filter(e => arIds.has(e.yieldingTo))]) {
      assert.ok(allowed.has(c.yieldReason), `unexpected cross-flow yield ${c.yieldReason}`);
      if (!bus) crossNoBus++;
      assert.notEqual(c.holdForNorthern && !bus, true, 'radio held a car with no releasing C shuttle');
    }
  }
  assert.equal(state.departed.c, 300, 'every C car exits');
  assert.equal(state.routingIssues.length, 0);
  assert.ok(both > 200, `flows overlapped at #64 for ${both} ticks`);
  assert.ok(bothMoving / both >= .6, `both flows moving together ${bothMoving}/${both}`);
  assert.ok(crossNoBus / both <= .1, `cross-flow yields ${crossNoBus}/${both} ticks`);
  assert.ok(minGap > .8, `moving cross-flow cars stay ${minGap.toFixed(2)} apart`);
});
