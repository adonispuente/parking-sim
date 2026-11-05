import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';

// Identical population, dt and operating rules for before/after comparisons.
const seconds = Number(process.env.PROFILE_SECONDS ?? 300);
const delta = .05;
const config = serviceOptions('eleven');
const initStart = performance.now();
const state = createCampusTraffic({ initialOccupancy: config.initialOccupancy,
  service: { enabled: true, ...config }, shuttles: { activeCount: 5, dwellSeconds: 12 } });
const initializationMs = performance.now() - initStart;
const samples = [], blocks = [];
let peakCars = 0, blockStart = performance.now();
for (let i = 0; i < Math.round(seconds / delta); i++) {
  const start = performance.now();
  state.step(delta);
  samples.push(performance.now() - start);
  peakCars = Math.max(peakCars, state.cars.length);
  if ((i + 1) % 600 === 0) {
    blocks.push({ simulatedSecond: Math.round((i + 1) * delta), ms: performance.now() - blockStart, cars: state.cars.length });
    blockStart = performance.now();
  }
}
const digest = createHash('sha256').update(JSON.stringify({clock: state.clock,
  cars: state.cars.map(car => [car.id,car.lane,car.distance,car.phase,car.yieldReason]),
  occupancy: state.zoneOccupancy, reserved: state.zoneReserved, waiting: state.waiting,
  departed: state.departed, entered: state.entered,
  parked: state.parkedVehicles.map(car => car.id), shuttles: state.shuttles })).digest('hex');
samples.sort((a,b) => a-b);
const report = { seconds, delta, steps: samples.length, initializationMs,
  totalStepMs: samples.reduce((a,b)=>a+b,0), medianStepMs: samples[Math.floor(samples.length*.5)],
  p95StepMs: samples[Math.floor(samples.length*.95)], p99StepMs: samples[Math.floor(samples.length*.99)],
  maxStepMs: samples.at(-1), peakCars, blocks, departed: state.departed, entered: state.entered,
  parked: state.occupancy, issues: state.routingIssues, busTrips: state.shuttles.map(bus=>bus.trips), digest };
console.log(JSON.stringify(report,null,2));
if (process.env.PROFILE_OUTPUT) writeFileSync(process.env.PROFILE_OUTPUT,JSON.stringify(report,null,2)+'\n');
