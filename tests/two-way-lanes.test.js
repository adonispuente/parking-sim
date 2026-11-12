import test from 'node:test';
import assert from 'node:assert/strict';
import { keepRight, KEEP_RIGHT_PX, TWO_WAY_KEEP_RIGHT_PX, onTwoWayStreet } from '../src/traffic.js';
import { shapeAt, WORLD_SCALE } from '../src/clearImageSource.js';
import { inPolygon, onStreet } from '../src/pavementRouting.js';
import { CORPORATE_LANE_OFFSET_PX } from '../src/corporateLanes.js';

// Commander 2026-11-06: "corporate drive is a two way street, as is equity".
// Opposing lanes on those streets must clear bus/bus body width (1.03 world,
// sharedTraffic.js) with margin wherever the pavement has room.
const BUS_BUS_PX = (.44 + .44 + .15) / WORLD_SCALE;
const minGap = (a, b) => {
  let best = Infinity;
  for (const p of a.slice(2, -2)) for (const q of b) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
  return best;
};
const dense = pts => { const out = []; for (let i = 1; i < pts.length; i++) for (let k = 0; k < 20; k++) out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k / 20, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k / 20]); out.push(pts.at(-1)); return out; };
const halfWidth = (p, nx, ny) => { let s = 0; while (s < 60 && onStreet([p[0] + nx * s, p[1] + ny * s])) s += .5; return s; };
// First straight horizontal segment fully inside `poly` (and not the other
// listed polygons) with at least `room` px of pavement either side.
function findSegment(poly, exclude, room) {
  for (let y = 0; y < 1118; y += 4) for (let x = 20; x < 1340; x += 4) {
    const seg = [[x, y], [x + 10, y], [x + 20, y], [x + 30, y]];
    if (!seg.every(p => inPolygon(p, poly) && !exclude.some(e => inPolygon(p, e)))) continue;
    if (seg.every(p => halfWidth(p, 0, 1) >= room && halfWidth(p, 0, -1) >= room)) return seg;
  }
  return null;
}

test('Corporate Drive west stretch: opposing lanes clear bus/bus width', () => {
  const sw = [[455, 420], [437, 451], [419, 482], [405, 493]];
  assert.ok(sw.every(onTwoWayStreet));
  const gap = minGap(dense(keepRight(sw)), dense(keepRight([...sw].reverse())));
  assert.ok(gap > BUS_BUS_PX + 3, `gap ${gap.toFixed(1)} px vs bus/bus ${BUS_BUS_PX.toFixed(1)} px`);
  assert.ok(gap <= 2 * CORPORATE_LANE_OFFSET_PX + 1);
});

test('Equity Drive: opposing lanes clear bus/bus width where paved room allows', () => {
  const seg = findSegment(shapeAt(55).points, [shapeAt(54).points, shapeAt(56).points], 16);
  assert.ok(seg, 'found an Equity-only segment with room for two directions');
  const gap = minGap(dense(keepRight(seg)), dense(keepRight([...seg].reverse())));
  assert.ok(gap > BUS_BUS_PX + 3, `gap ${gap.toFixed(1)} px at ${seg[0]}`);
});

test('Feeder Road keeps the original 6 px offset', () => {
  const seg = findSegment(shapeAt(54).points, [shapeAt(55).points, shapeAt(56).points], 10);
  assert.ok(seg, 'found a Feeder-only segment');
  assert.ok(!seg.some(onTwoWayStreet));
  const gap = minGap(dense(keepRight(seg)), dense(keepRight([...seg].reverse())));
  assert.ok(Math.abs(gap - 2 * KEEP_RIGHT_PX) < 1.5, `gap ${gap.toFixed(1)} px`);
});
