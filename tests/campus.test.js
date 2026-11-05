import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLayout, validateLayout, WORLD } from '../src/model.js';
import { IMAGE_SIZE } from '../src/campus.js';

test('latest map preserves satellite aspect and has three polygon roofs', () => {
  const layout = validateLayout(initialLayout());
  assert.equal(WORLD.width / WORLD.height, IMAGE_SIZE.width / IMAGE_SIZE.height);
  assert.equal(layout.items.filter(i => i.type === 'building' && i.points.length >= 3).length, 3);
});
test('curved spine joins both frontage streets in image coordinates', () => {
  const roads = initialLayout().items.filter(i => i.type === 'road');
  const spine = roads.find(i => i.id === 'road-spine');
  const absolute = spine.points.map(([x,z]) => [x + spine.x,z + spine.z]);
  assert.ok(Math.abs(absolute[0][0] / WORLD.width - .04) < .00001);
  assert.ok(Math.abs(absolute.at(-1)[0] / WORLD.width - .983) < .00001);
  assert.ok(spine.points.length > 15);
});
test('invalid trace coordinates and widths are rejected', () => {
  const layout = initialLayout();
  layout.items.find(i => i.id === 'church').points[0][0] = NaN;
  assert.throws(() => validateLayout(layout));
  const next = initialLayout();
  next.items.find(i => i.id === 'road-spine').roadWidth = -1;
  assert.throws(() => validateLayout(next));
});
