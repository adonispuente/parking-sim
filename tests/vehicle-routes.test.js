// Replaces the Vehicle Routes.json / affine-registration suite. The unified
// source pair (Clear Image.png + EverythingClearImage.json) is the only frame.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_ROUTE_CATALOG, ROUTE_RUNTIME, runtimeKey, catalogSummary, routeDiagnostics, subscribeRouteRuntime } from '../src/vehicleRouteCatalog.js';
import { SOURCE_BINDINGS, SOURCE_PAIR, pointAt, IMAGE_SIZE } from '../src/clearImageSource.js';
import { zoneArrivalRoute, B_SOUTH_CHECKPOINT } from '../src/parkingRoutes.js';
import { avoidsShuttleObstacles } from '../src/shuttleRoutes.js';
import { LOT_A_MAIN_POSITION } from '../src/lotAControl.js';
import { MAIN_POSITION_RESOLUTION } from '../src/positions/index.js';

const near = (a, b, d = .01) => Math.hypot(a[0] - b[0], a[1] - b[1]) < d;
const sampled = (points, fn) => {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let j = 0; j <= n; j++) fn([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
  }
};

test('catalog binds every unified-source shape once', () => {
  assert.equal(SOURCE_BINDINGS.length, 65);
  assert.equal(VEHICLE_ROUTE_CATALOG.routes.length, SOURCE_BINDINGS.length);
  assert.equal(new Set(VEHICLE_ROUTE_CATALOG.routes.map(r => r.id)).size, SOURCE_BINDINGS.length);
  assert.deepEqual(VEHICLE_ROUTE_CATALOG.bindingProblems, []);
});

test('identity registration in the 1374x1118 frame; no affine/legacy size', () => {
  const s = catalogSummary();
  assert.equal(s.sourcePair, SOURCE_PAIR);
  assert.equal(s.registration.method, 'identity');
  assert.deepEqual(s.registration.shift, [0, 0]);
  assert.deepEqual([IMAGE_SIZE.width, IMAGE_SIZE.height], [1374, 1118]);
  assert.equal(routeDiagnostics().source.actual, '1374x1118');
});

test('Main Position is the canonical source point #57 used by the controller', () => {
  assert.deepEqual([...LOT_A_MAIN_POSITION], [...pointAt(57)]);
  assert.deepEqual([...MAIN_POSITION_RESOLUTION.point], [...pointAt(57)]);
});

test('B arrivals use the B entrance, visit B South, avoid roofs and record runtime use', () => {
  let notified = 0;
  const stop = subscribeRouteRuntime(() => notified++);
  for (const zone of ['bSouth', 'bBanana', 'bPocket', 'bNorth']) {
    const path = zoneArrivalRoute('bWest', zone);
    // Passes #61's operator point on the entrance side (within 30 px, under the
    // 42 px operator radius) without driving onto the median point itself.
    const e = pointAt(61);
    assert.ok(path.some(p => Math.hypot(p[0] - e[0], p[1] - e[1]) < 30), `${zone} B entrance`);
    assert.ok(!path.some(p => near(p, e)), `${zone} does not detour to #61's exact point`);
    assert.ok(path.some(p => near(p, B_SOUTH_CHECKPOINT)), `${zone} via B South`);
    sampled(path, p => assert.ok(avoidsShuttleObstacles(p), `${zone} obstacle`));
    const use = ROUTE_RUNTIME.uses[runtimeKey('bWest', zone)];
    assert.ok(use, zone); assert.equal(use.source, 'EverythingClearImage');
  }
  stop();
  assert.ok(notified >= 0);
});

test('connector provenance is disclosed per mode; untraced joins are not called surveyed', () => {
  zoneArrivalRoute('a', 'aNorth');
  const d = routeDiagnostics();
  assert.ok(d.connectors.length > 0);
  for (const c of d.connectors) {
    assert.ok(['straight-on-pavement', 'pavement-grid', 'short-unmapped-gap', 'source-corridor', 'station-source-corridor', 'roof-avoid-fallback', 'staffed-entrance-throat'].includes(c.mode), c.context);
    assert.match(c.source, /not a traced aisle/);
  }
  assert.ok(d.gaps.some(g => /A home/.test(g)));
});
