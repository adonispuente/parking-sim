import test from 'node:test';
import assert from 'node:assert/strict';
import { lotABuilding, replaceLotA, LOT_A_MASSES } from '../src/lotA.js';
import { initialLayout, validateLayout } from '../src/model.js';

test('Lot A has three separate finite roof masses and serializes', () => {
  const layout = initialLayout();
  assert.equal(lotABuilding().masses.length, 4);
  const roofs = LOT_A_MASSES.filter(m=>m.surface !== 'parking');
  assert.equal(new Set(roofs.map(m=>m.color)).size, 1);
  const triangle = LOT_A_MASSES.find(m=>m.surface === 'parking');
  assert.equal(triangle.points.length, 4);
  // Both endpoints of the east roof edge belong to the pavement polygon.
  for (const edge of [[360,165],[285,295]]) {
    assert.ok(triangle.points.some(p => p[0] === edge[0] && p[1] === edge[1]));
  }
  assert.equal(triangle.height, .1);
  assert.notEqual(triangle.color, roofs[0].color);
  assert.deepEqual(validateLayout(layout), layout);
  for (const m of LOT_A_MASSES) {
    assert.ok(m.points.length >= 3);
    assert.ok(m.points.every(p=>p.every(Number.isFinite)));
  }
});
test('applying Lot A preserves every other object and project name', () => {
  const layout = initialLayout();
  layout.items.find(i=>i.id==='church').x = 1;
  const next = replaceLotA(layout);
  assert.equal(next.name, layout.name);
  assert.deepEqual(next.items.filter(i=>i.id!=='church'), layout.items.filter(i=>i.id!=='church'));
  assert.notEqual(next.items.find(i=>i.id==='church').x, 1);
  assert.equal(layout.items.find(i=>i.id==='church').x, 1);
});
test('malformed mass coordinates and heights are rejected', () => {
  for (const value of [Infinity, -1, 100]) {
    const layout = initialLayout();
    layout.items.find(i=>i.id==='church').masses[0].height = value;
    assert.throws(()=>validateLayout(layout));
  }
});

test('saved-layout update clears current positions only once and preserves other items', async () => {
  const { upgradeLotADraft } = await import('../src/lotA.js');
  const { makeItem } = await import('../src/model.js');
  const old = initialLayout();
  delete old.lotADraftRevision;
  old.items.push(makeItem('position', 40, 30));
  const church = old.items.find(i=>i.id==='church');
  church.modelRevision = 'lot-a-roofs-1';
  const next = upgradeLotADraft(old);
  assert.equal(next.items.some(i=>i.type==='position'), false);
  assert.equal(next.items.find(i=>i.id==='church').modelRevision, 'lot-a-roofs-3');
  assert.deepEqual(next.items.filter(i=>i.id!=='church'), old.items.filter(i=>i.type!=='position' && i.id!=='church'));
  next.items.push(makeItem('position', 42, 32));
  const restored = validateLayout(JSON.parse(JSON.stringify(next)));
  assert.equal(upgradeLotADraft(restored).items.filter(i=>i.type==='position').length, 1);
});
