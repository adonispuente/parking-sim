import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLayout, validateLayout, upgradeLotAParking } from '../src/model.js';
import { LOT_A_MASSES } from '../src/lotA.js';

test('parking trace renders serializable surfaces and all three parking banks', () => {
  const layout = initialLayout();
  assert.deepEqual(validateLayout(layout), layout);
  assert.equal(layout.items.find(i=>i.id==='lot-a').capacity,411);
  assert.equal(layout.items.filter(i=>i.type==='lot').reduce((n,i)=>n+i.capacity,0),1584);
  assert.ok(layout.items.some(i=>i.id==='a-pavement' && i.type==='surface'));
  for (const id of ['a-row-north-2','a-row-west-outer','a-row-court-east']) assert.ok(layout.items.some(i=>i.id===id));
  assert.equal(new Set(layout.items.map(i=>i.id)).size,layout.items.length);
  assert.deepEqual(upgradeLotAParking(validateLayout(layout)),layout);
});

test('migration preserves non-A geometry and only applies once', () => {
  const old = initialLayout(); delete old.lotAParkingRevision;
  const others=old.items.filter(i=>i.id==='row-b'||i.id==='row-c');
  const next=upgradeLotAParking(old);
  assert.deepEqual(next.items.filter(i=>i.id==='row-b'||i.id==='row-c'),others);
  next.items.find(i=>i.id==='row-a').count=5;
  assert.equal(upgradeLotAParking(validateLayout(next)).items.find(i=>i.id==='row-a').count,5);
});

test('east apron shares the entire main hall east boundary', () => {
  const roof=LOT_A_MASSES.find(i=>i.name==='Main hall roof');
  const apron=LOT_A_MASSES.find(i=>i.surface==='parking');
  assert.deepEqual(apron.points[0],roof.points[1]);
  assert.deepEqual(apron.points.at(-1),roof.points[2]);
});

test('surface imports reject malformed elevations, colors, and missing polygons', () => {
  for(const patch of [{elevation:10},{color:'invalid'},{points:undefined}]) {
    const layout=initialLayout(); Object.assign(layout.items.find(i=>i.type==='surface'),patch);
    assert.throws(()=>validateLayout(layout));
  }
});
