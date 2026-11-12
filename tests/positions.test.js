import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { STAFF_POSITIONS, POSITION_ALIASES, pointAt } from '../src/clearImageSource.js';
import { POSITIONS, CONTROL_POINTS, positionById, positionByIndex, RESOLVED_A_MAIN_POSITION, FEEDER_OFFICER_POSITION, MAIN_POSITION_RESOLUTION } from '../src/positions/index.js';

test('every staffed map position has exactly one definition, and no staff are invented', () => {
  assert.deepEqual(POSITIONS.map(p => p.id), STAFF_POSITIONS.map(p => p.id));
  assert.deepEqual(POSITIONS.map(p => p.index), [57, 58, 59, 60, 61, 62, 63, 64]);
  assert.ok(CONTROL_POINTS.every(p => p.staffed === false && p.index === null));
});

test('each definition says what the person does, what is modeled, and where', () => {
  for (const p of [...POSITIONS, ...CONTROL_POINTS]) {
    assert.ok(typeof p.title === 'string' && p.title.length > 3, `${p.id}.title`);
    for (const k of ['duty', 'implemented']) assert.ok(typeof p[k] === 'string' && p[k].length > 20, `${p.id}.${k}`);
    for (const k of ['intended', 'provisional']) assert.ok(Array.isArray(p[k]), `${p.id}.${k}`);
    assert.ok(p.controllers.length, `${p.id} has controllers`);
    for (const f of p.controllers) assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), `${p.id}: ${f} exists`);
    assert.equal(p.point.length, 2);
  }
});

test('aliases resolve to their canonical position', () => {
  for (const [alias, canonical] of Object.entries(POSITION_ALIASES)) {
    assert.equal(positionByIndex(Number(alias)).index, canonical);
    assert.ok(positionByIndex(canonical).aliases.includes(Number(alias)));
  }
  assert.equal(positionById('equityClayStop').title, 'Equity / Clay three-way stop');
});

test('point bindings moved from trafficPositions.js are unchanged', () => {
  assert.deepEqual([...RESOLVED_A_MAIN_POSITION], [...pointAt(57)]);
  assert.deepEqual([...FEEDER_OFFICER_POSITION], [...pointAt(58)]);
  assert.equal(MAIN_POSITION_RESOLUTION.point, RESOLVED_A_MAIN_POSITION);
  assert.equal(MAIN_POSITION_RESOLUTION.provisional, false);
});
