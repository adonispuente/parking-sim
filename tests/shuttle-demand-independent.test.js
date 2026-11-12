// QWEN M2 independent gate — demand-responsive shuttles (SPARTAN run 5516).
//
// Bounded: this file ONLY exercises the public demand API
//   createShuttleDemand(state, tripSeconds) -> { update, register, choose,
//   reserve, pickup, publish }
// and the bus state machine wired by attachShuttles (prepareShuttles /
// completeShuttle). No existing source or test file is touched, and no full
// suite / build / server is run.
//
// Every assertion below maps to a contract in research/runs/m2-demand-5516/plan.md.
// "Estimates" are labeled rider units, NOT simulated people or boardings.
//
// Fixture conventions (mirrors tests/shuttle-staggering.test.js):
//  - The controlled fake-state finish removes the bus car, then calls
//    state.completeShuttle(car); the clock is advanced explicitly.
//  - Buses launch through launch(), which is gated by a 15s HOME headway and
//    each bus's own readyAt; fixtures advance the clock past both before
//    expecting a launch, or clear state.cars when other buses are irrelevant.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createShuttleDemand } from '../src/shuttleDemand.js';
import { attachShuttles } from '../src/shuttles.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';

// ---- shared fakes -------------------------------------------------------

const makeLane = points => {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(
    new THREE.Vector3(points[i - 1][0], 0, points[i - 1][1]),
    new THREE.Vector3(points[i][0], 0, points[i][1])));
  return { path, length: path.getLength() };
};
const live = () => [{ id: 'b', open: true, capacity: 487 }];
const TRIP = { b: 300, cNorth: 300, cSouth: 300 };
const DEMAND = { b: { toHome: 0, toLot: 0 }, cNorth: { toHome: 0, toLot: 0 }, cSouth: { toHome: 0, toLot: 0 } };

// Minimal state for the ledger in isolation.
const ledgerState = (extra = {}) => ({
  clock: 0, cars: [], lanes: [], occupancy: { b: 0 }, zoneOccupancy: {},
  phase: 'arrival', shuttleConfig: {}, shuttles: [], parkedVehicles: [], ...extra,
});
// Full fake state that attachShuttles can drive (mirrors shuttle-staggering).
const busState = (options = {}) => {
  const state = { cars: [], lanes: [], clock: 0, occupancy: { b: 0 }, zoneOccupancy: {}, phase: 'arrival' };
  attachShuttles(state, makeLane, options);
  return state;
};
// Finish the bus currently in motion (mirrors shuttle-staggering.test.js).
const finish = (state, bus) => {
  const car = state.cars.find(item => item.id === bus.id);
  assert.ok(car, `${bus.id} must be in motion before it can complete a leg`);
  state.cars.splice(state.cars.indexOf(car), 1);
  state.completeShuttle(car);
};
// Relaunch the bus after its dwell: advance the clock past readyAt AND the
// 15s HOME headway, then prepare. Returns true once the bus is in motion.
const relaunch = (state, bus, extraSeconds = 16) => {
  state.clock = Math.max(state.clock + 1, bus.readyAt + extraSeconds);
  state.prepareShuttles(live());
  return state.cars.some(car => car.id === bus.id);
};

// ---- 1. waiting demand is NOT parked occupancy --------------------------

test('a full-but-not-ready lot generates zero pickup demand; only readiness does', () => {
  // 487 cars physically parked in Lot B, none freshly arrived, none ready.
  // 486 cars are never "ready"; one (b-0) becomes ready at t=10s. The source
  // auto-registers every parkedVehicles car at construction, so the readiness
  // must exist BEFORE createShuttleDemand (a later re-register is a no-op via
  // the "known" set). Readiness — not the parking itself — is what makes demand.
  const parked = Array.from({ length: 487 }, (_, i) => ({ id: `b-${i}`, target: 'b', zone: 'bSouth' }));
  parked[0].readyAt = 10; // ready 10s in, so NOT yet ready at t=0
  const state = ledgerState({ parkedVehicles: parked, occupancy: { b: 487 } });
  const demand = createShuttleDemand(state, TRIP);
  demand.update(); // t=0: the t=10 readiness event has not fired yet

  // Lot is at 100% occupancy, yet no car is ready to be picked up.
  assert.equal(state.occupancy.b, 487);
  let row = demand.choose();
  assert.equal(row.area, null, 'parked-but-not-ready occupancy must not dispatch a bus');
  assert.equal(row.reason, 'No uncommitted pickup demand');

  // The t=10 readiness event fires: THAT readiness (not the parking) produces demand.
  state.clock = 11;
  demand.update();
  row = demand.choose();
  assert.equal(row.area, 'b');
  assert.ok(row.reason.includes('demand'), row.reason);
  demand.publish();
  assert.ok(state.shuttleDemand.areas.b.waiting.toLot > 0, 'readiness creates toLot demand');
});

// ---- 2. zero demand holds ------------------------------------------------

test('zero demand holds the bus at home (demand-hold, no launch)', () => {
  const state = busState({ dispatchMode: 'demand', activeCount: 1 });
  state.shuttleConfig.demandOverride = undefined; // no demand at all
  state.prepareShuttles(live());
  const bus = state.shuttles[0];
  assert.equal(state.cars.some(car => car.id === bus.id), false, 'no bus launches with zero demand');
  assert.equal(bus.phase, 'demand-hold');
  assert.ok(bus.circuit == null, 'no circuit is assigned with zero demand');
  // Still zero demand later: it must STILL hold, not launch on a timer.
  state.clock = 300; state.prepareShuttles(live());
  assert.equal(state.cars.some(car => car.id === bus.id), false, 'a bus never launches on its own while demand is zero');
  assert.equal(bus.phase, 'demand-hold');
});

// ---- 3. commitments avoid overassignment --------------------------------

test('a reservation is capacity-capped and a fully-met area stops attracting buses', () => {
  const state = ledgerState();
  state.shuttleConfig.demandOverride = { b: { toHome: 20, toLot: 0 }, cNorth: { toHome: 0, toLot: 0 }, cSouth: { toHome: 0, toLot: 0 } };
  const demand = createShuttleDemand(state, TRIP);
  demand.update(); // one-shot reset -> b.waiting.toHome = 20; capacity is 20 by default

  // committed() only counts buses in state.shuttles — a real bus must be there.
  state.shuttles.push({ number: 1 });
  const bus1 = state.shuttles[0];
  demand.reserve(bus1, demand.choose());
  // A single bus commits AT MOST its trip capacity (20), never more.
  assert.equal(bus1.demandAssignment.area, 'b');
  assert.equal(bus1.demandAssignment.toHome, 20, 'assignment is capped at trip capacity');

  // With exactly capacity of demand, the area is now fully committed -> a
  // second bus must NOT be re-assigned to it.
  const again = demand.choose();
  assert.equal(again.area, null, 'a fully-met area is no longer eligible');

  // Over-demand stays bounded per bus, and the residual is still eligible.
  const state2 = ledgerState();
  state2.shuttleConfig.demandOverride = { b: { toHome: 100, toLot: 0 }, cNorth: { toHome: 0, toLot: 0 }, cSouth: { toHome: 0, toLot: 0 } };
  const demand2 = createShuttleDemand(state2, TRIP);
  demand2.update();
  const b2 = { number: 1 };
  demand2.reserve(b2, demand2.choose());
  assert.equal(b2.demandAssignment.toHome, 20, 'one bus takes at most capacity, not all 100');
  assert.equal(demand2.choose().area, 'b', 'the unmet 80 still attracts another bus');
});

// ---- 4. quiet-area priority after the 240s safeguard --------------------

test('an area waiting past maxWait outranks a busier area (quiet-area safeguard)', () => {
  const mk = () => {
    const state = ledgerState();
    state.shuttleConfig.estimatedPeoplePerCar = 8;
    state.shuttleConfig.estimatedRideShare = 1;   // -> 8 * 1 = 8 units/car
    const demand = createShuttleDemand(state, TRIP);
    // Old, quiet cNorth demand seeded at clock 0 via a fresh arrival.
    state.clock = 0;
    demand.register({ id: 'c-quiet', target: 'c', zone: 'cNorth' }, true); // cNorth.toHome = 8, since = 0
    return { state, demand };
  };

  // (a) At 200s: cNorth has been waiting 200s (< 240), a busier b is seeded
  //     at 200s. Neither is overdue -> the busier area wins on score.
  {
    const { state, demand } = mk();
    state.clock = 200;
    // NO demandOverride here: it is a one-shot reset that would wipe the
    // seeded cNorth. Fresh arrivals register into the event ledger instead.
    for (let i = 0; i < 10; i++) demand.register({ id: `b-${i}`, target: 'b' }, true); // 80 fresh units
    demand.update();
    const row = demand.choose();
    assert.equal(row.area, 'b', 'below the wait threshold, greatest uncommitted demand wins');
    assert.ok(row.reason.includes('demand'), row.reason);
  }

  // (b) Advance past 240s of quiet cNorth waiting. The busy b was assigned at
  //     200, so cNorth becomes the only overdue area and wins the safeguard.
  {
    const { state, demand } = mk();
    state.clock = 200;
    for (let i = 0; i < 10; i++) demand.register({ id: `b-${i}`, target: 'b' }, true);
    demand.update();
    demand.reserve({ number: 99 }, demand.choose()); // b is assigned at 200 (age resets)
    state.clock = 260; // cNorth age = 260 >= 240 (overdue); b age = 60 (recent)
    demand.update();
    const row = demand.choose();
    assert.equal(row.area, 'cNorth', 'an overdue quiet area must be served first');
    assert.equal(row.reason, 'Quiet-area wait safeguard');
  }
});

// ---- 5. C branch switches only at the roundabout ------------------------

test('the C branch switches at the roundabout when demand requires it', () => {
  const state = busState({ dispatchMode: 'demand', activeCount: 1, dwellSeconds: 10 });
  state.shuttleConfig.demandOverride = { ...DEMAND, cNorth: { toHome: 60, toLot: 0 } };
  state.prepareShuttles(live());
  const bus = state.shuttles[0];
  assert.equal(bus.circuit, 'cNorth');
  assert.equal(bus.leg, 0); // shared cOut leg ends at cRoundabout
  // At the roundabout, cSouth becomes the only uncovered demand.
  state.shuttleConfig.demandOverride = { ...DEMAND, cSouth: { toHome: 60, toLot: 0 } };
  state.prepareShuttles(live()); // demand.update() applies the new override
  state.clock = bus.readyAt; state.prepareShuttles(live());
  assert.ok(state.cars.some(car => car.id === bus.id), 'bus reaches the roundabout');
  finish(state, bus);            // completes the cRoundabout leg -> re-branch
  assert.equal(bus.circuit, 'cSouth', 'branch switches at the roundabout when demand demands it');
});

test('a demand change on a non-roundabout C leg does not re-branch the bus', () => {
  const state = busState({ dispatchMode: 'demand', activeCount: 1, dwellSeconds: 10 });
  state.shuttleConfig.demandOverride = { ...DEMAND, cNorth: { toHome: 60, toLot: 0 } };
  state.prepareShuttles(live());
  const bus = state.shuttles[0];
  assert.equal(bus.circuit, 'cNorth');
  state.clock = bus.readyAt; state.prepareShuttles(live());
  finish(state, bus); // at roundabout, cNorth still the demand -> keep cNorth, leg -> 1
  assert.equal(bus.circuit, 'cNorth');
  assert.equal(bus.leg, 1); // now on the cNorth pickup leg (stop = cNorth, not roundabout)
  // Demand flips, but this leg is NOT the roundabout: no re-branch.
  state.shuttleConfig.demandOverride = { ...DEMAND, cSouth: { toHome: 60, toLot: 0 } };
  state.prepareShuttles(live());
  assert.ok(relaunch(state, bus), 'bus relaunches its cNorth pickup leg');
  finish(state, bus); // completes the cNorth PICKUP leg -> NOT a roundabout
  assert.equal(bus.circuit, 'cNorth', 'a non-roundabout leg must not re-branch');
});

// ---- 6. retiring / disabled complete remote legs, clear pending at home --

test('a retiring bus finishes its remote legs then clears pending demand at home', () => {
  const state = busState({ dispatchMode: 'demand', activeCount: 5, dwellSeconds: 10 });
  state.shuttleConfig.demandOverride = { ...DEMAND, b: { toHome: 500, toLot: 0 } };
  state.prepareShuttles(live());
  const bus = state.shuttles[1]; // becomes "retiring" when the fleet drops to 1
  // Bus 2 is staggered (readyAt ~20-26s) and home launches are 15s-headwayed,
  // so at t=0 it legitimately holds and claims nothing; the 500 units of b
  // demand stay unmet until it actually launches.

  // Advance past its readyAt and the 15s home headway -> first remote leg.
  assert.ok(relaunch(state, bus, 40), 'bus 2 launches its b circuit');
  assert.equal(bus.circuit, 'b');
  assert.equal(bus.leg, 0, 'bus is at home launching leg 0 (bSouth)');
  finish(state, bus); // bSouth done -> leg 1 (bNorth pickup)
  assert.equal(bus.leg, 1, 'bus is now on a remote leg');
  state.shuttleConfig.activeCount = 1; // bus 2..5 are now retiring

  // Retiring + leg>0 must still launch the remote leg (finish it, no teleport).
  assert.ok(relaunch(state, bus, 40), 'a retiring bus completes its remote leg');
  finish(state, bus); // bNorth done -> leg 2 (home return)
  state.shuttleConfig.activeCount = 1;
  assert.ok(relaunch(state, bus, 40), 'a retiring bus launches its final home leg');
  finish(state, bus); // home leg done -> circuit null, pending cleared, home-dwell

  // At home and retired: no pending demand, no relaunch.
  state.clock += 60; state.cars = []; state.prepareShuttles(live());
  assert.equal(state.cars.some(car => car.id === bus.id), false, 'a retired bus at home does not relaunch');
  assert.equal(bus.demandAssignment, null, 'pending demand assignment is cleared at home');
  assert.equal(bus.circuit, null);
});

test('a disabled bus at home clears pending demand and holds (no remote legs left)', () => {
  const state = busState({ dispatchMode: 'demand', activeCount: 1, dwellSeconds: 10 });
  state.shuttleConfig.demandOverride = { ...DEMAND, cSouth: { toHome: 60, toLot: 0 } };
  state.prepareShuttles(live());
  const bus = state.shuttles[0];
  // Bus is at home with a pending cSouth assignment (no remote legs left).
  assert.equal(bus.demandAssignment?.area, 'cSouth');
  state.shuttleConfig.enabled = false;
  state.clock = 15; state.cars = []; state.prepareShuttles(live());
  assert.equal(state.cars.some(car => car.id === bus.id), false, 'disabled bus stays parked');
  assert.equal(bus.demandAssignment, null, 'pending demand is cleared when disabled at home');
  assert.equal(bus.circuit, null);
  assert.ok(['home', 'service-break'].includes(bus.phase), `unexpected phase ${bus.phase}`);
});

// ---- 7. deterministic repeated sequence ---------------------------------

test('an identical scripted drive reproduces the exact same dispatch sequence twice', () => {
  const drive = (state) => {
    const trace = [];
    for (let t = 0; t <= 120; t += 5) {
      state.clock = t;
      // Demand profile rotates so buses actually move between areas.
      const phase = Math.floor(t / 30);
      state.shuttleConfig.demandOverride = {
        b: { toHome: phase % 2 ? 40 : 120, toLot: 0 },
        cNorth: { toHome: phase % 2 ? 120 : 20, toLot: 0 },
        cSouth: { toHome: 0, toLot: 0 },
      };
      state.prepareShuttles(live());
      // Deterministically finish every bus that is currently in motion.
      for (const car of [...state.cars].filter(car => car.fleetBus)) {
        state.cars.splice(state.cars.indexOf(car), 1);
        state.completeShuttle(car);
      }
      trace.push(JSON.stringify({
        d: state.shuttleDemand,
        buses: state.shuttles.map(b => ({ n: b.number, p: b.phase, c: b.circuit, l: b.leg, s: b.stop, r: b.readyAt })),
      }));
    }
    return trace;
  };
  const run = () => {
    const state = busState({ dispatchMode: 'demand', activeCount: 5, dwellSeconds: 10 });
    state.shuttleConfig.demandOverride = { ...DEMAND, b: { toHome: 120, toLot: 0 }, cNorth: { toHome: 20, toLot: 0 } };
    return drive(state);
  };
  const first = run();
  const second = run();
  assert.equal(first.length, second.length);
  for (let i = 0; i < first.length; i++) {
    assert.equal(second[i], first[i], `dispatch diverged at step ${i}`);
  }
});

// ---- 8. frame captures demand -------------------------------------------

test('a captured traffic frame includes the demand ledger as a detached clone', () => {
  const state = busState({ dispatchMode: 'demand', activeCount: 1, dwellSeconds: 10 });
  state.shuttleConfig.demandOverride = { ...DEMAND, b: { toHome: 50, toLot: 10 } };
  state.prepareShuttles(live()); // publishes state.shuttleDemand
  const frame = captureTrafficFrame(state);

  assert.ok('shuttleDemand' in frame, 'frame must carry the demand ledger');
  assert.equal(frame.shuttleDispatchMode, 'demand-responsive');
  const areas = frame.shuttleDemand.areas;
  assert.ok(areas.b && areas.cNorth && areas.cSouth, 'all three areas are present');
  assert.equal(typeof frame.shuttleDemand.source, 'string');
  assert.ok(frame.shuttleDemand.assumptions, 'assumptions are recorded with the frame');
  assert.ok(frame.shuttleDemand.lastDecision, 'the last decision is recorded with the frame');

  // The frame is a clone: mutating it must not touch live state.
  frame.shuttleDemand.areas.b.waiting.toHome = 999999;
  assert.notEqual(state.shuttleDemand.areas.b.waiting.toHome, 999999);
});

// ---- 9. controlled-input one-shot balance reset --------------------------

test('demandOverride is a one-shot reset on a CHANGED json; a pickup drains it', () => {
  const state = ledgerState();
  const demand = createShuttleDemand(state, TRIP);

  state.shuttleConfig.demandOverride = { ...DEMAND, b: { toHome: 100, toLot: 0 } };
  demand.update(); // one-shot reset -> b.waiting.toHome = 100
  assert.equal(demand.choose().area, 'b');

  // One bus picks up: drains waiting by its assignment (20).
  demand.pickup({ number: 1, demandAssignment: { area: 'b', toHome: 20, toLot: 0 } }, 'bSouth');

  // Re-running update with an UNCHANGED override must NOT restore the balance.
  // Inspect via a throwaway reservation: unmet = 100 - 20 drained = 80.
  demand.update();
  const probe = { number: 7 };
  demand.reserve(probe, demand.choose());
  probe.demandAssignment = null; // do not leave a fake bus counted as committed
  // Re-verify with a second probe: the 80 unmet must still be visible.
  const probe2 = { number: 8 };
  demand.reserve(probe2, demand.choose());
  assert.equal(probe2.demandAssignment.toHome, 20, 'waiting was drained to 80, not reset to 100');

  // A CHANGED override json re-applies a fresh balance once.
  state.shuttleConfig.demandOverride = { ...DEMAND, b: { toHome: 30, toLot: 0 } };
  demand.update();
  const probe3 = { number: 9 };
  demand.reserve(probe3, demand.choose());
  assert.equal(probe3.demandAssignment.toHome, 20, 'fresh 30 waiting -> capped 20, not the old 100 or drained 80');
});
