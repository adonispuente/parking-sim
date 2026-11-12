import test from 'node:test';
import assert from 'node:assert/strict';
import { C_SHUTTLE_TRACE } from '../src/exitPathSource.js';
import { C_LOOP_STOPS, C_SHUTTLE_JOINS, C_STOP_CURB_PX } from '../src/cShuttleLoop.js';
import { buildShuttleCircuits, SHUTTLE_STOPS } from '../src/shuttleRoutes.js';
import { clearSegment, join, distance, drivableAllowed, avoidsObstacles } from '../src/sourceRouting.js';
import { createCampusTraffic } from '../src/traffic.js';
import { WORLD_SCALE, pointAt } from '../src/clearImageSource.js';

// Commander 2026-11-11: no shuttle stop moves; #50 is only the driving path.
test('C pickups stay exactly at their original source points', () => {
  for (const [id, index] of [['cRoundabout', 47], ['cSouth', 48], ['cNorth', 49]]) {
    assert.deepEqual(SHUTTLE_STOPS.find(s => s.id === id).point, pointAt(index), id);
    assert.deepEqual(C_LOOP_STOPS[id].point, pointAt(index), id);
  }
});

test('both C circuits drive every #50 loop vertex in drawn order and leave by its drawn exit', () => {
  const trace = C_SHUTTLE_TRACE.points;
  for (const id of ['cNorth', 'cSouth']) {
    const legs = buildShuttleCircuits()[id];
    assert.deepEqual(legs.map(l => l.stop), ['cRoundabout', id, 'home']);
    const route = join(...legs.map(l => l.points));
    let after = -1;
    for (const p of trace) {
      const i = route.findIndex((q, k) => k > after && distance(q, p) < 1e-8);
      assert.ok(i > after, `${id}: missing or reversed vertex ${p}`); after = i;
    }
    assert.deepEqual(legs[0].points.at(-1), legs[1].points[0]);
    assert.deepEqual(legs[1].points.at(-1), legs[2].points[0]);
    assert.deepEqual(legs[1].points.at(-1), pointAt(id === 'cNorth' ? 49 : 48));
    for (const leg of legs) for (let i = 1; i < leg.points.length; i++)
      assert.ok(clearSegment(leg.points[i - 1], leg.points[i]), `${id} touches obstacle`);
  }
});

test('every new C join is on drivable ground except a disclosed curb margin at an exact pickup', () => {
  buildShuttleCircuits();
  const stops = [47, 48, 49].map(pointAt);
  assert.ok(C_SHUTTLE_JOINS.length >= 10);
  for (const j of C_SHUTTLE_JOINS) {
    const n = Math.max(1, Math.ceil(distance(j.start, j.end)));
    for (let k = 0; k <= n; k++) {
      const p = [j.start[0] + (j.end[0] - j.start[0]) * k / n, j.start[1] + (j.end[1] - j.start[1]) * k / n];
      if (drivableAllowed(p)) continue;
      assert.ok(avoidsObstacles(p) && stops.some(s => distance(p, s) <= C_STOP_CURB_PX), `${j.label} leaves ground at ${p}`);
    }
  }
});

test('built C leg changes and forced branch changes have no pose teleport', () => {
  const s = createCampusTraffic({ service: { enabled: false }, shuttles: { activeCount: 5 } });
  for (const id of ['cNorth', 'cSouth']) {
    const ids = s.shuttleLaneIds[id];
    for (let i = 1; i < ids.length; i++) {
      const a = s.lanes[ids[i - 1]].path.getPointAt(1), b = s.lanes[ids[i]].path.getPointAt(0);
      assert.ok(a.distanceTo(b) < .001 * WORLD_SCALE, `${id} leg${i} jumps ${a.distanceTo(b) / WORLD_SCALE}px`);
    }
  }
});
