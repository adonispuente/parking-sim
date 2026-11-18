import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { blankZones } from '../src/parkingZones.js';
import {
  configuredServiceOptions,
  updateServiceInputs,
  serviceOptions,
  createServiceController,
} from '../src/sundayServices.js';
import { serviceCarryOptions } from '../src/serviceCarry.js';

const step = (state, seconds) => {
  for (let i = 0; i < Math.round(seconds * 20); i++) state.step(0.05);
};

test('per-service demand and Equity controls survive selection and manual carry with exact quotas', () => {
  let options = { service: { enabled: true, ...serviceOptions('nine', { demand: 0 }) } };
  options = updateServiceInputs(options, 'eleven', { demand: 123, equityPercent: 31 });
  options = updateServiceInputs(options, 'final', { demand: 47, equityPercent: 22 });
  assert.equal(options.service.demand, 0);
  for (const [id, demand, equity] of [
    ['eleven', 123, 39],
    ['final', 47, 11],
  ]) {
    const config = configuredServiceOptions(options, id);
    const controller = createServiceController(config, blankZones());
    assert.equal(controller.arrivals.length, demand);
    assert.equal(controller.arrivals.filter((a) => a.source > 0).length, equity);
    assert.deepEqual(
      new Set(controller.arrivals.filter((a) => a.source > 0).map((a) => a.source)),
      new Set([1, 2]),
    );
  }
  const state = createCampusTraffic(options);
  const patch = serviceCarryOptions(options, { ...state, active: 0 }, 'eleven');
  assert.equal(patch.service.demand, 123);
  assert.equal(patch.service.equityPercent, 31);
});

test('scheduled handoff preserves moving cars, queues, clock, gates and old-service readiness', () => {
  const state = createCampusTraffic({
    autoContinue: true,
    service: { enabled: true, ...serviceOptions('nine', { demand: 0, beginMinute: 604.99 }) },
    servicePlan: { eleven: { demand: 20, equityPercent: 50 }, final: { demand: 0 } },
  });
  state.waiting[0] = 2;
  state.arrivalQueues[0].push(
    ...Array.from({ length: 2 }, () => ({ serviceId: 'nine', parkingIntent: 'general' })),
  );
  state.step(0.05);
  const moving = state.cars[0],
    lanes = state.lanes;
  assert.ok(moving);
  step(state, 1);
  assert.equal(state.serviceStatus.id, 'eleven');
  assert.equal(state.serviceStatus.demand, 20);
  assert.equal(state.serviceStatus.equityCount, 10);
  assert.equal(
    state.cars.find((c) => c.id === moving.id),
    moving,
    'no reset or replacement of moving vehicles',
  );
  assert.equal(state.lanes, lanes);
  assert.equal(state.waiting[0] + state.entered[0], 2, 'queued arrivals survive or enter normally');
  assert.ok(state.serviceStatus.minute > 605 && state.serviceStatus.minute < 605.1);
  step(state, 180);
  const parked = state.parkedVehicles.filter((c) => c.serviceId === 'nine');
  assert.equal(parked.length, 2);
  assert.ok(
    parked.every((c) => c.dismissalMinute === 615),
    'cars parking after handoff still leave after 9am',
  );
  assert.ok(parked.every((c) => Math.abs(c.readyAt - (c.readinessMinute - 604.99) * 60) < 1e-8));
  assert.deepEqual(state.routingIssues, []);
});

test('automatic sequence reaches final with configured demand and keeps 11am departure metadata', () => {
  const state = createCampusTraffic({
    autoContinue: true,
    service: { enabled: true, ...serviceOptions('eleven', { demand: 0, beginMinute: 724.99 }) },
    servicePlan: { final: { demand: 37, equityPercent: 40 } },
    initialOccupancy: { a: 0, b: 1, c: 0 },
  });
  // Isolate the handoff from physical route progress of this previous-service car.
  const car = state.parkedVehicles[0],
    readiness = car.readinessMinute;
  step(state, 1);
  assert.equal(state.serviceStatus.id, 'final');
  assert.equal(state.serviceStatus.demand, 37);
  assert.equal(state.serviceStatus.equityCount, 15);
  const retained = [...state.parkedVehicles, ...state.cars].find((c) => c.id === car.id);
  assert.equal(retained.readinessMinute, readiness);
});

test('single-service mode stays on the selected service past the next start window', () => {
  const state = createCampusTraffic({
    autoContinue: false,
    service: { enabled: true, ...serviceOptions('nine', { demand: 0, beginMinute: 604.99 }) },
  });
  step(state, 1);
  assert.equal(state.serviceStatus.id, 'nine');
});

test('a continuous run clears 9am cars and parks the configured 11am traffic from both Equity approaches', () => {
  const state = createCampusTraffic({
    autoContinue: true,
    service: {
      enabled: true,
      ...serviceOptions('nine', { demand: 20, equityPercent: 20, beginMinute: 590 }),
    },
    servicePlan: { eleven: { demand: 30, equityPercent: 40 }, final: { demand: 0 } },
  });
  step(state, 130 * 60);
  assert.equal(state.serviceStatus.id, 'eleven');
  assert.equal(state.serviceStatus.remaining, 0);
  assert.equal(
    Object.values(state.departed).reduce((a, b) => a + b, 0),
    20,
  );
  assert.equal(state.parkedVehicles.length, 30);
  assert.ok(
    state.parkedVehicles.every((c) => c.serviceId === 'eleven' && c.dismissalMinute === 735),
  );
  for (const [id, total, equity] of [
    ['nine', 20, 4],
    ['eleven', 30, 12],
  ]) {
    const arrivals = state.routeHistory.filter((c) => c.serviceId === id);
    assert.equal(arrivals.length, total);
    assert.equal(arrivals.filter((c) => c.source > 0).length, equity);
    assert.equal(arrivals.filter((c) => c.source === 1).length, equity / 2);
    assert.equal(arrivals.filter((c) => c.source === 2).length, equity / 2);
  }
  assert.deepEqual(state.waiting, [0, 0, 0]);
  assert.deepEqual(state.routingIssues, []);
});
