import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic, onFeederStreet } from '../src/traffic.js';
import { overflowRoute } from '../src/routes/overflowRoutes.js';
import { clearSegment } from '../src/routes/sourceRouting.js';
import { WORLD_SCALE } from '../src/clearImageSource.js';
import { serviceOptions } from '../src/sundayServices.js';
import { createSeekablePlayback } from '../src/playback.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';

const full = { a: 411, b: 487, c: 686 };
const advance = (state, seconds) => {
  for (let i = 0; i < Math.round(seconds * 20); i++) state.step(0.05);
};

test('all three overflow origins have clear routes ending north on Feeder', () => {
  for (const source of [0, 1, 2]) {
    const points = overflowRoute(source);
    assert.ok(onFeederStreet(points.at(-1)));
    assert.ok(points.at(-1)[1] < 5);
    for (let i = 1; i < points.length; i++) {
      assert.ok(clearSegment(points[i - 1], points[i]), `${source}: roof clearance`);
      if (onFeederStreet(points[i - 1]) && onFeederStreet(points[i]))
        assert.ok(points[i][1] <= points[i - 1][1], 'Feeder remains northbound');
    }
  }
});

test('full-campus Feeder and Equity cars remain visible and complete their road exit without parking', () => {
  const state = createCampusTraffic({ initialOccupancy: full });
  state.waiting = [2, 2, 2];
  state.step(0.05);
  assert.equal(state.sentAway, 6);
  assert.ok(state.cars.length > 0);
  assert.ok(state.cars.every((car) => car.phase === 'through' && car.target === null));
  assert.deepEqual(state.reserved, { a: 0, b: 0, c: 0 });
  const seen = new Set();
  for (let i = 0; i < 8000; i++) {
    state.step(0.05);
    for (const car of state.cars) {
      seen.add(car.source);
      const end = state.lanes[car.lane].path.getPointAt(1);
      assert.ok(onFeederStreet([end.x / WORLD_SCALE, end.z / WORLD_SCALE]));
    }
  }
  assert.deepEqual(seen, new Set([0, 1, 2]));
  assert.deepEqual(state.throughEntered, [2, 2, 2]);
  assert.deepEqual(state.throughExited, [2, 2, 2]);
  assert.deepEqual(state.overflowWaiting, [0, 0, 0]);
  assert.equal(state.cars.length, 0);
  assert.deepEqual(state.occupancy, full);
  assert.deepEqual(state.departed, { a: 0, b: 0, c: 0 });
  assert.equal(state.routeHistory.length, 0);
  assert.deepEqual(state.routingIssues, []);
});

test('service demand counts overflow once while its cars are queued, driving and gone', () => {
  const state = createCampusTraffic({
    initialOccupancy: full,
    service: { enabled: true, ...serviceOptions('nine', { demand: 30, beginMinute: 600 }) },
  });
  for (const car of state.parkedVehicles) car.readyAt = Infinity;
  for (let i = 0; i < 8000; i++) {
    state.step(0.05);
    const totals = state.serviceTraffic.nine;
    assert.equal(
      totals.scheduled + totals.waiting + totals.onRoad + totals.reachedParking + totals.turnedAway,
      30,
    );
    assert.equal(
      totals.waitingToPass + totals.passingThrough + totals.passedThrough,
      totals.turnedAway,
    );
  }
  assert.equal(state.serviceTraffic.nine.turnedAway, 30);
  assert.equal(state.serviceTraffic.nine.passedThrough, 30);
  assert.equal(state.serviceTraffic.nine.entered, 0);
  assert.deepEqual(state.occupancy, full);
});

test('pass-through queues and vehicle poses reconstruct deterministically on seek', async () => {
  const factory = () =>
    createCampusTraffic({
      initialOccupancy: full,
      service: { enabled: true, ...serviceOptions('nine', { demand: 20, beginMinute: 600 }) },
    });
  const p = createSeekablePlayback(
    factory,
    {},
    { captureFrame: captureTrafficFrame, yieldWork: async () => {} },
  );
  await p.seek(10);
  const expected = captureTrafficFrame(p.simulation);
  await p.seek(2);
  await p.seek(10);
  assert.deepEqual(captureTrafficFrame(p.simulation), expected);
  assert.ok(p.simulation.cars.some((car) => car.phase === 'through'));
});
