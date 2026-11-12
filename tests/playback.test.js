import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePlayback } from '../src/playback.js';
import { createTenCarDemo } from '../src/traffic.js';

test('playback advances 1–40× time with bounded updates and forwards settings', () => {
  const rates = [18,18,0], lots = [];
  for (const speed of [1,2,3,4,5,10,20,30,40]) {
    let elapsed = 0;
    const simulation = { step(dt, actualRates, actualLots) {
      assert.ok(dt > 0 && dt <= 0.05);
      assert.equal(actualRates, rates);
      assert.equal(actualLots, lots);
      elapsed += dt;
    }};
    for (let frame = 0; frame < 60; frame++) advancePlayback(simulation, 1 / 60, speed, rates, lots);
    assert.ok(Math.abs(elapsed - speed) < 1e-10);
  }
});

test('playback bounds long frame catch-up and rejects invalid frame durations', () => {
  let elapsed = 0;
  const simulation = { step(dt) { elapsed += dt; } };
  for (const dt of [0, -1, NaN, Infinity]) advancePlayback(simulation, dt, 5);
  assert.equal(elapsed, 0);
  advancePlayback(simulation, 60, 10);
  assert.ok(Math.abs(elapsed - 1) < 1e-10);
});

test('5× playback completes the ten-car demo and preserves parking until departure', () => {
  const state = createTenCarDemo();
  const run = seconds => {
    for (let frame = 0; frame < seconds * 30; frame++) advancePlayback(state, 1 / 30, 5, [0,0,0]);
  };
  run(120);
  assert.ok(Math.abs(state.clock - 600) < 1e-7);
  assert.equal(state.parkedVehicles.length, 10);
  assert.equal(state.cars.length, 0);
  assert.equal(Object.values(state.departed).reduce((a,b)=>a+b,0), 0);
  state.setPhase('departure');
  run(120);
  assert.equal(state.parkedVehicles.length, 0);
  assert.equal(Object.values(state.departed).reduce((a,b)=>a+b,0), 10);
});