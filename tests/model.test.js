import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLayout, validateLayout, makeItem, stats, deleteItem, previewRoutes } from '../src/model.js';

test('starter layout round-trips and has three provisional lots', () => {
  const layout = initialLayout();
  const restored = validateLayout(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(restored, layout);
  assert.notEqual(restored, layout);
  assert.equal(stats(layout).lots, 3);
  assert.equal(stats(layout).capacity, 898); // A411 + B487; C starts closed.
  assert.equal(stats(layout).marked, 159); // Approximate trace, not capacity.
});

test('closing a lot reduces capacity and removes its demonstration route', () => {
  const layout = initialLayout();
  layout.items.find(i => i.id === 'lot-a').open = false;
  assert.equal(stats(layout).capacity, 487);
  assert.deepEqual(previewRoutes(layout).map(r=>r.lotId), ['lot-b']);
  layout.items.find(i=>i.id==='lot-b').capacity=0;
  assert.equal(previewRoutes(layout).length, 0);
});

test('all placement tools create valid serializable objects', () => {
  for (const type of ['lot','spaces','position','barricade','road','building']) {
    const layout = initialLayout();
    const object = makeItem(type, 40, 30, 'lot-a');
    layout.items.push(object);
    assert.doesNotThrow(()=>validateLayout(layout));
    assert.equal(object.type,type);
  }
});

test('deleting a lot unassigns its parking rows rather than leaving dangling references', () => {
  const layout = deleteItem(initialLayout(),'lot-a');
  assert.equal(layout.items.some(i=>i.id==='lot-a'),false);
  assert.equal(layout.items.find(i=>i.id==='row-a').lotId,'');
  assert.doesNotThrow(()=>validateLayout(layout));
});

test('invalid imports are rejected without mutating input', () => {
  const bad = [
    null, {}, {version: 2, name: 'bad', items: []},
    {...initialLayout(), items: Array(401).fill({})},
  ];
  const cases = [
    i=>i.x=-1, i=>i.z=200, i=>i.width=0, i=>i.rotation=Infinity,
    i=>i.capacity=-1, i=>i.capacity=1.5, i=>i.color='red', i=>i.open='true',
    i=>i.type='script', i=>i.name='x'.repeat(201),
  ];
  for (const change of cases) {
    const layout=initialLayout(); change(layout.items[0]); bad.push(layout);
  }
  const duplicate=initialLayout(); duplicate.items[1].id=duplicate.items[0].id; bad.push(duplicate);
  const dangling=initialLayout(); dangling.items.find(i=>i.type==='spaces').lotId='missing'; bad.push(dangling);
  const excessive=initialLayout(); excessive.items.find(i=>i.type==='spaces').count=100; bad.push(excessive);
  const role=initialLayout();
  role.items.push({...makeItem('position', 40, 30), notes:'a'.repeat(2001)});
  bad.push(role);
  for(const layout of bad) assert.throws(()=>validateLayout(layout),/Invalid layout/);
});

test('roles, assignees, geometry and notes survive export/import', () => {
  const layout=initialLayout();
  const position=makeItem('position', 40, 30);
  layout.items.push(position);
  Object.assign(position,{role:'Team lead',assignee:'Volunteer One',notes:'Keep pedestrians clear.',x:38.2,rotation:45});
  const imported=validateLayout(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(imported.items.find(i=>i.id===position.id),position);
});
