import test from 'node:test';
import assert from 'node:assert/strict';
import { zoneArrivalRoute, C_ENTRANCE_INTERIOR } from '../src/parkingRoutes.js';
import { pointAt, WORLD_SCALE, fromWorld } from '../src/clearImageSource.js';
import { clearSegment, distance } from '../src/sourceRouting.js';
import { createCampusTraffic } from '../src/traffic.js';

for (const key of ['cWest', 'eCWest', 'e2CWest']) for (const zone of ['cFirstNorth', 'cFirstSouth', 'cNorth', 'cSouth'])
  test(`${key}/${zone} enters through #63 and never detours to northeast after admission`, () => {
    const points = zoneArrivalRoute(key, zone), k = points.findIndex(p => distance(p, pointAt(63)) < .001);
    assert.ok(k >= 0); assert.deepEqual(points[k + 1], C_ENTRANCE_INTERIOR);
    const inside = points.slice(k);
    assert.ok(inside.every(p => p[0] < 1050), JSON.stringify(inside));
    for (let i = 1; i < inside.length; i++) assert.ok(clearSegment(inside[i - 1], inside[i]));
  });
test('actual built C lanes from all origins stay at staffed mouth, not northeast exit', () => {
  const s = createCampusTraffic({ arrivalPriority: ['c'], shuttles: { activeCount: 0 } });
  for (let i = 0; i < 100; i++) s.step(.05, [90, 90, 90]);
  const lanes = s.lanes.filter(lane => /^Arrival .*cFirstNorth/.test(lane.name));
  assert.ok(lanes.length >= 3, lanes.map(l => l.name).join('\n'));
  for (const lane of lanes) {
    let best = Infinity, admission = 0;
    for (let d = 0; d <= lane.length; d += .03) {
      const p = lane.path.getPointAt(d / lane.length), pixel = fromWorld([p.x, p.z]);
      const gap = distance(pixel, pointAt(63));
      if (gap < best) { best = gap; admission = d; }
    }
    assert.ok(best * WORLD_SCALE < 1.5);
    for (let d = admission; d <= lane.length; d += .03) {
      const p = lane.path.getPointAt(d / lane.length), pixel = fromWorld([p.x, p.z]);
      assert.ok(pixel[0] < 1050, `${lane.name}: ${pixel}`);
    }
  }
  assert.deepEqual(s.routingIssues, []);
});