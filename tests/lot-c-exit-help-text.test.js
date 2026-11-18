import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';

for (const [policy, expected] of [
  ['west', ['cWest', 'cWest']],
  ['east', ['cEast', 'cEast']],
  ['bogus', ['cEast', 'cWest']],
])
  test(`production C departures under policy '${policy}' use ${[...new Set(expected)].join(' + ')}`, () => {
    const state = createCampusTraffic({
      phase: 'departure',
      initialZoneOccupancy: { cNorth: 1, cSouth: 1 },
      departurePolicy: { c: policy },
    });
    state.step(0.05);
    assert.deepEqual(
      state.cars
        .filter((car) => car.phase === 'departing')
        .map((car) => car.access)
        .sort(),
      expected,
    );
    assert.deepEqual(state.routingIssues, []);
  });
