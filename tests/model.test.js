import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLayout, validateLayout, makeItem } from '../src/model.js';

test('all placement tools create valid serializable objects', () => {
  for (const type of ['lot','spaces','position','barricade','road','building']) {
    const layout = initialLayout();
    const object = makeItem(type, 40, 30, 'lot-a');
    layout.items.push(object);
    assert.doesNotThrow(()=>validateLayout(layout));
    assert.equal(object.type,type);
  }
});

test('roles, assignees, geometry and notes survive export/import', () => {
  const layout=initialLayout();
  const position=makeItem('position', 40, 30);
  layout.items.push(position);
  Object.assign(position,{role:'Team lead',assignee:'Volunteer One',notes:'Keep pedestrians clear.',x:38.2,rotation:45});
  const imported=validateLayout(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(imported.items.find(i=>i.id===position.id),position);
});
