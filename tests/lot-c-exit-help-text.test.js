import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCampusTraffic } from '../src/traffic.js';

// Commander rule (2026-11-07): C cars use both C exits ~50/50 by default; 'west'/'east'
// force one exit; shuttles keep their own return. The volunteer help text must match.
const controls = readFileSync(new URL('../src/SundayControls.jsx', import.meta.url), 'utf8');
const help = controls.split('\n').find(line => /Lot C departure routing/.test(line)) &&
  controls.split('\n')[controls.split('\n').findIndex(line => /Lot C departure routing/.test(line)) + 1];

test('Lot C help text matches the 50/50 car-exit rule and keeps shuttle priority', () => {
  assert.ok(help && help.includes('<small>'), 'help text sits right after the Lot C selector');
  assert.doesNotMatch(help, /reserved for shuttles/, 'stale shuttle-only claim removed');
  assert.doesNotMatch(help, /car departures use staffed access/, 'stale staffed-only departure claim removed');
  assert.match(help, /about half use the median exit/);
  assert.match(help, /northeast exit/);
  assert.match(help, /Shuttles ignore this setting/);
  assert.match(help, /holds conflicting Corporate traffic for shuttles/, 'shuttle-priority explanation preserved');
  for (const value of ['split', 'west', 'east']) assert.ok(controls.includes(`<option value="${value}">`), value);
});

for (const [policy, expected] of [['west', ['cWest', 'cWest']], ['east', ['cEast', 'cEast']], ['bogus', ['cEast', 'cWest']]])
  test(`production C departures under policy '${policy}' use ${[...new Set(expected)].join(' + ')}`, () => {
    const state = createCampusTraffic({ phase: 'departure', initialZoneOccupancy: { cNorth: 1, cSouth: 1 }, departurePolicy: { c: policy } });
    state.step(.05);
    assert.deepEqual(state.cars.filter(car => car.phase === 'departing').map(car => car.access).sort(), expected);
    assert.deepEqual(state.routingIssues, []);
  });
