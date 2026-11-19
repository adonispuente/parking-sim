import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AREA_LABELS,
  areaLabelAnchors,
  declutter,
  labelPoint,
  pointInPolygon,
} from '../src/areaLabels.js';
import { tracedFeatures, traceWorldPoint } from '../src/tracedMap.js';
import { C_ZONE_PIECES } from '../src/cParkingGeometry.js';

test('every named parking area resolves to an anchor inside its own region', () => {
  const anchors = areaLabelAnchors(tracedFeatures, C_ZONE_PIECES, traceWorldPoint);
  assert.deepEqual(
    anchors.map((a) => a.name),
    AREA_LABELS.map((a) => a.name),
  );
  for (const anchor of anchors) {
    const rings = anchor.pieces
      ? C_ZONE_PIECES[anchor.pieces].map((ring) => ring.map(traceWorldPoint))
      : [tracedFeatures.find((f) => f.label.toLowerCase() === anchor.source.toLowerCase()).points];
    assert.ok(
      rings.some((ring) => pointInPolygon(anchor.point, ring)),
      `${anchor.name} label falls outside its area`,
    );
  }
});

test('labelPoint stays inside a concave (banana / L-shaped) region', () => {
  // An L shape whose centroid (≈ [3.9, 3.9]) lies outside the polygon.
  const ring = [
    [0, 0],
    [10, 0],
    [10, 2],
    [2, 2],
    [2, 10],
    [0, 10],
  ];
  assert.ok(pointInPolygon(labelPoint(ring), ring));
});

test('declutter keeps higher-priority labels and hides overlapping ones', () => {
  const visible = declutter([
    { x: 100, y: 100, w: 80, h: 20 },
    { x: 120, y: 105, w: 80, h: 20 }, // overlaps the first
    { x: 300, y: 100, w: 80, h: 20 },
    null, // off-screen / not projected
  ]);
  assert.deepEqual(visible, [true, false, true, false]);
});

test('Lot C North sits top-centre of Lot C and no "First Half" label is shown', () => {
  const anchors = areaLabelAnchors(tracedFeatures, C_ZONE_PIECES, traceWorldPoint);
  assert.ok(!anchors.some((a) => /first half/i.test(a.name)));
  const north = anchors.find((a) => a.name === 'Lot C North');
  const lotC = tracedFeatures
    .filter((f) => /^Lot C (North|South)$/i.test(f.label))
    .flatMap((f) => f.points);
  const xs = lotC.map((p) => p[0]),
    zs = lotC.map((p) => p[1]);
  const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const width = Math.max(...xs) - Math.min(...xs);
  assert.ok(
    Math.abs(north.point[0] - centreX) < width * 0.1,
    'Lot C North is horizontally centred',
  );
  const building = tracedFeatures.find((f) => f.label === 'Lot C Building').points;
  assert.ok(
    north.point[1] < Math.min(...building.map((p) => p[1])),
    'Lot C North sits above (north of) the C building',
  );
  assert.ok(north.point[1] < (Math.min(...zs) + Math.max(...zs)) / 2, 'in the top half of Lot C');
});

test('every shuttle pickup gets a friendly name, ranked after the main lot areas', async () => {
  const { SHUTTLE_STOPS } = await import('../src/routes/shuttleRoutes.js');
  const { mapLabelEntries, SHUTTLE_PICKUP_NAMES } = await import('../src/areaLabels.js');
  const entries = mapLabelEntries(tracedFeatures, C_ZONE_PIECES, traceWorldPoint, SHUTTLE_STOPS);
  const pickups = entries.filter((e) => e.kind === 'shuttle');
  assert.deepEqual(pickups.map((p) => p.id).sort(), SHUTTLE_STOPS.map((s) => s.id).sort());
  assert.ok(pickups.every((p) => p.name === SHUTTLE_PICKUP_NAMES[p.id]));
  const firstPickup = entries.findIndex((e) => e.kind === 'shuttle');
  assert.deepEqual(
    entries.slice(0, firstPickup).map((e) => e.name),
    ['Lot A North', 'Lot A South', 'Lot B North', 'Lot C North', 'Lot C South'],
  );
});
