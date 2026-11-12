// M1 gate contract tests — dismissal timing and the Lot A closure latch.
//
// Contract (SPARTAN, 2026-11-09; research/spartan-milestone-roadmap-2026-11-09.md M1):
//   - serviceTimeline(config) -> { startMinute, beginMinute, dismissalMinute = start + 75,
//     previousDismissalMinute (nine:null, eleven:615, final:735) }.
//   - createServiceController / serviceOptions accept a config.beginMinute override so a
//     pre-roll fixture can be run (e.g. the 11:00 service beginning at 10:05).
//   - A lot that starts a transition with >180 general parked/inbound cars (or that is
//     full, or is manually closed) is latched.
//   - While latched, A reopens only when the relevant dismissal has passed AND
//     general occupancy + (reserved.a - badgeReserved) <= 180 (half of 360).
//     Badge spaces and badge reservations are never counted as general.
//   - The INITIAL transition latch is released by the OUTGOING cohort's dismissal.
//     Any LATER filling or manual closure after reopening is released by the
//     CURRENT cohort's dismissal.
//   - Reserved arrivals admitted before the latch are never demanded to reroute.
//   - B and C have NO special service gate, even when full or manually closed.
//   - serviceStatus publishes dismissalMinute, previousDismissalMinute,
//     gates.a { closed, reason, releaseMinute, ... } with reason keys
//     until-dismissal | waiting-for-half | manual-closure | open, and keeps
//     serviceStatus.gated.
//
// Dismissals: nine 9:00 -> 10:15 (615); eleven 11:00 -> 12:15 (735);
// final 1:15 -> 2:30 (870).
//
// Controller clocks are seconds since the service BEGAN, so the helper `at`
// converts a wall-clock minute to the controller clock for a given beginMinute.

import test from 'node:test';
import assert from 'node:assert/strict';
import { blankZones, distributeInitialOccupancy } from '../src/parkingZones.js';
import { createServiceController, serviceTimeline } from '../src/sundayServices.js';

const NINE_BEGIN = 495;   // 8:15
const NINE_DISMISSAL = 615;   // 10:15
const ELEVEN_BEGIN = 605; // 10:05 (pre-roll begin override)
const ELEVEN_DISMISSAL = 735; // 12:15
const FINAL_BEGIN = 775;  // 12:55 (pre-roll begin override)
const FINAL_DISMISSAL = 870; // 2:30

// Seconds since the service began for a given wall-clock minute.
const at = (minute, begin) => (minute - begin) * 60;

// Fresh state shape per the contract.
const makeState = (lots = {}, clock = 0) => ({
  clock,
  zoneOccupancy: distributeInitialOccupancy(lots),
  reserved: { a: 0, b: 0, c: 0 },
  badgeReserved: 0,
  waiting: [0, 0, 0],
});

const controller = (id, initial = {}, overrides = {}) =>
  createServiceController(
    { id, beginMinute: overrides.beginMinute, demand: 0 },
    distributeInitialOccupancy(initial),
  );

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

test('timeline: all three services start, begin, dismissal = start + 75, previousDismissalMinute', () => {
  const nine = serviceTimeline({ id: 'nine' });
  assert.deepEqual(nine, { startMinute: 540, beginMinute: 495, dismissalMinute: 615, previousDismissalMinute: null });
  const eleven = serviceTimeline({ id: 'eleven' });
  assert.deepEqual(eleven, { startMinute: 660, beginMinute: 605, dismissalMinute: 735, previousDismissalMinute: 615 });
  const final = serviceTimeline({ id: 'final' });
  assert.deepEqual(final, { startMinute: 795, beginMinute: 725, dismissalMinute: 870, previousDismissalMinute: 735 });
  for (const t of [nine, eleven, final]) {
    assert.equal(t.dismissalMinute, t.startMinute + 75);
  }
});

test('timeline: config.beginMinute override feeds the timeline (pre-roll fixture)', () => {
  assert.equal(serviceTimeline({ id: 'eleven', beginMinute: 605 }).beginMinute, 605);
  // Dismissal is anchored to the actual service start, never to the moved begin.
  assert.equal(serviceTimeline({ id: 'eleven', beginMinute: 605 }).dismissalMinute, 735);
});

// ---------------------------------------------------------------------------
// Initial transition latch (outgoing dismissal)
// ---------------------------------------------------------------------------

test('eleven begin 605, full A: initial transition latches at the outgoing dismissal (10:15)', () => {
  const c = controller('eleven', { a: 411, b: 487, c: 686 }, { beginMinute: ELEVEN_BEGIN });
  const st = makeState({ a: 411, b: 487, c: 686 });
  st.zoneOccupancy.aNorth = 30; // 30 + 150 = 180 general, exactly half
  st.clock = at(610, ELEVEN_BEGIN); // 10:10, five minutes before the outgoing cohort dismisses
  c.tick(st);
  assert.equal(c.gated.a, true);
  assert.equal(st.serviceStatus.gates.a.releaseMinute, NINE_DISMISSAL, 'initial latch must wait on the outgoing cohort dismissal');
  assert.equal(st.serviceStatus.previousDismissalMinute, 615);
  assert.equal(st.serviceStatus.dismissalMinute, 735);
  assert.equal(st.serviceStatus.gates.a.reason, 'until-dismissal');
  assert.equal(st.serviceStatus.gated.a, true);
  assert.equal(st.serviceStatus.gates.a.closed, true);
});

test('eleven begin 605: early vacancy (180) does NOT clear the latch before dismissal', () => {
  const c = controller('eleven', { a: 411, b: 487, c: 686 }, { beginMinute: ELEVEN_BEGIN });
  const st = makeState({ a: 411, b: 487, c: 686 });
  st.zoneOccupancy.aNorth = 30; // early departures took A from 360 to 180
  st.clock = at(610, ELEVEN_BEGIN); // 10:10 < 10:15 dismissal
  c.tick(st);
  assert.equal(st.serviceStatus.gates.a.generalUsed, 180);
  assert.equal(c.gated.a, true, 'a below-half occupancy before dismissal must keep A closed');
  assert.equal(st.serviceStatus.gates.a.reason, 'until-dismissal');
  assert.equal(st.serviceStatus.gated.a, true);
});

test('eleven begin 605: A reopens exactly at the outgoing dismissal 10:15 when <= 180', () => {
  const c = controller('eleven', { a: 411, b: 487, c: 686 }, { beginMinute: ELEVEN_BEGIN });
  const st = makeState({ a: 411, b: 487, c: 686 });
  st.zoneOccupancy.aNorth = 30;
  st.clock = at(610, ELEVEN_BEGIN);
  c.tick(st);
  assert.equal(c.gated.a, true);
  st.clock = at(615, ELEVEN_BEGIN); // 10:15 = outgoing dismissal
  c.tick(st);
  assert.equal(c.gated.a, false, 'dismissal reached and exactly 180 (half) must release A');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  assert.equal(st.serviceStatus.gated.a, false);
  assert.equal(st.serviceStatus.reopenedAt.a, st.clock);
});

test('A above half at dismissal stays closed with waiting-for-half, then opens at the 180 boundary', () => {
  const c = controller('eleven', { a: 181, b: 0, c: 0 }, { beginMinute: ELEVEN_BEGIN });
  const st = makeState({ a: 181, b: 0, c: 0 });
  st.zoneOccupancy = { ...blankZones(), aSouth: 181 }; // 181 > 180: one car over half
  st.clock = at(615, ELEVEN_BEGIN); // 10:15, dismissal passed
  c.tick(st);
  assert.equal(c.gated.a, true, '181 at dismissal must not open A');
  assert.equal(st.serviceStatus.gates.a.reason, 'waiting-for-half');
  st.zoneOccupancy.aSouth = 180;
  c.tick(st);
  assert.equal(c.gated.a, false, '180 at dismissal must open A');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
});

// ---------------------------------------------------------------------------
// Badge exclusion
// ---------------------------------------------------------------------------

test('badge spaces never count as general: a fully-reserved badge row releases A at the 180 boundary', () => {
  // 130 general (aNorth) + 51 badge parked + 51 badge reservations.
  const c = controller('eleven', { a: 181, b: 0, c: 0 }, { beginMinute: ELEVEN_BEGIN });
  const st = makeState({ a: 181, b: 0, c: 0 });
  st.zoneOccupancy = { ...blankZones(), aNorth: 130, aBadge: 51 };
  st.reserved.a = 51;
  st.badgeReserved = 51; // all 51 reservations are badge holders
  st.clock = at(615, ELEVEN_BEGIN); // 10:15, dismissal passed
  c.tick(st);
  assert.equal(st.serviceStatus.gates.a.generalUsed, 130, 'badge occupancy and badge reservations are excluded from the general threshold');
  assert.equal(c.gated.a, false, '130 general at dismissal must open A');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
});

test('badge reservations are subtracted only up to the badge row: general = parked + max(0, reserved - badge)', () => {
  const c = controller('eleven', { a: 181, b: 0, c: 0 }, { beginMinute: ELEVEN_BEGIN });
  const st = makeState({ a: 181, b: 0, c: 0 });
  st.zoneOccupancy = { ...blankZones(), aNorth: 130, aBadge: 51 };
  st.reserved.a = 51;
  st.badgeReserved = 50; // one reservation is a general car -> general = 130 + 1 = 131
  st.clock = at(615, ELEVEN_BEGIN);
  c.tick(st);
  assert.equal(st.serviceStatus.gates.a.generalUsed, 131);
  assert.equal(c.gated.a, false, '131 general is below half');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
});

// ---------------------------------------------------------------------------
// B / C have no special service gate
// ---------------------------------------------------------------------------

test('B and C never inherit A latch: full B/C (and manual B/C closures) stay ungated by service', () => {
  // Full B and C from the start of the 11:00 transition, A below the gate.
  let c = controller('eleven', { a: 0, b: 487, c: 686 }, { beginMinute: ELEVEN_BEGIN });
  let st = makeState({ a: 0, b: 487, c: 686 });
  c.tick(st);
  assert.deepEqual(st.serviceStatus.gated, { a: false, b: false, c: false });
  assert.equal(st.serviceStatus.gates.b.closed, false);
  assert.equal(st.serviceStatus.gates.c.closed, false);
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  // Manual closures of B/C while A is latched must not latch B/C either.
  c = controller('eleven', { a: 411, b: 487, c: 686 }, { beginMinute: ELEVEN_BEGIN });
  st = makeState({ a: 411, b: 487, c: 686 });
  st.zoneOccupancy.aNorth = 30; // A at half -> latch at 10:15
  st.clock = at(610, ELEVEN_BEGIN);
  c.tick(st, [{ id: 'b', open: false }, { id: 'c', open: false }]);
  assert.equal(c.gated.a, true);
  assert.equal(st.serviceStatus.gates.b.closed, false, 'B has no special service gate even manual-closed');
  assert.equal(st.serviceStatus.gates.c.closed, false, 'C has no special service gate even manual-closed');
});

// ---------------------------------------------------------------------------
// Nine: filling to full latches at its own dismissal 10:15
// ---------------------------------------------------------------------------

test('nine: A filling to full latches at its own dismissal 10:15, stays above half, reopens at the 180 boundary', () => {
  const c = controller('nine', { a: 360, b: 487, c: 686 });
  const st = makeState({ a: 360, b: 487, c: 686 });
  st.zoneOccupancy = { ...blankZones(), aNorth: 181, aSouth: 179, aBadge: 51 }; // 360 general + 51 badge = full
  st.clock = at(612, NINE_BEGIN); // 10:12, before dismissal
  c.tick(st);
  assert.equal(c.gated.a, true, 'A full must latch');
  assert.equal(st.serviceStatus.gates.a.releaseMinute, NINE_DISMISSAL);
  st.zoneOccupancy = { ...blankZones(), aSouth: 181, aBadge: 51 }; // 181 > half
  st.clock = at(615, NINE_BEGIN); // 10:15 = dismissal, still above half
  c.tick(st);
  assert.equal(c.gated.a, true, '181 at dismissal is above half: stays closed');
  assert.equal(st.serviceStatus.gates.a.reason, 'waiting-for-half');
  st.zoneOccupancy = { ...blankZones(), aSouth: 180, aBadge: 51 }; // 180, exactly half
  st.clock = at(620, NINE_BEGIN); // 10:20
  c.tick(st);
  assert.equal(c.gated.a, false, '180 general after dismissal must open A');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  st.zoneOccupancy = { ...blankZones(), aNorth: 181, aSouth: 179, aBadge: 51 }; // 360 = full again
  st.clock = at(630, NINE_BEGIN); // 10:30
  c.tick(st);
  assert.equal(c.gated.a, true, 'refilling A to full re-latches it');
  assert.equal(st.serviceStatus.gates.a.releaseMinute, NINE_DISMISSAL);
  assert.equal(st.serviceStatus.gates.a.reason, 'waiting-for-half');
  st.zoneOccupancy = { ...blankZones(), aSouth: 180, aBadge: 51 }; // 180
  st.clock = at(645, NINE_BEGIN); // 10:45
  c.tick(st);
  assert.equal(c.gated.a, false, '180 after dismissal must open A again');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  // An open lot drifting to 181 does NOT re-latch: re-closure requires full or manual.
  st.zoneOccupancy = { ...blankZones(), aSouth: 181, aBadge: 51 };
  st.clock = at(650, NINE_BEGIN); // 10:50
  c.tick(st);
  assert.equal(c.gated.a, false, '181 in an already-open lot stays open (re-closure is full-or-manual)');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
});

// ---------------------------------------------------------------------------
// Final: latch released by the outgoing dismissal; later re-fill uses 2:30
// ---------------------------------------------------------------------------

test('final: initial latch (181 > half) waits, reopens at the 180 boundary, and a later full re-fill uses the 2:30 dismissal', () => {
  // begin 12:55 so the whole story sits inside the controller window.
  const c = controller('final', { a: 181, b: 0, c: 0 }, { beginMinute: FINAL_BEGIN });
  const st = makeState({ a: 181, b: 0, c: 0 });
  st.zoneOccupancy = { ...blankZones(), aSouth: 181 };
  st.clock = at(785, FINAL_BEGIN); // 13:05
  c.tick(st);
  assert.equal(c.gated.a, true, '181 > half must latch from the transition start');
  st.zoneOccupancy = { ...blankZones(), aSouth: 180 };
  st.clock = at(790, FINAL_BEGIN); // 13:10
  c.tick(st);
  assert.equal(c.gated.a, false, '180 must release the initial latch once the relevant dismissal has passed');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  // A refills to full at 13:20: a later fill releases at the CURRENT 2:30 dismissal.
  st.zoneOccupancy = { ...blankZones(), aNorth: 210, aSouth: 150 }; // 360 = full
  st.clock = at(800, FINAL_BEGIN); // 13:20, before the 2:30 dismissal
  c.tick(st);
  assert.equal(c.gated.a, true);
  assert.equal(st.serviceStatus.gates.a.releaseMinute, FINAL_DISMISSAL, 'a later fill waits on the current 1:15 cohort dismissal');
  assert.equal(st.serviceStatus.gates.a.reason, 'until-dismissal');
  st.zoneOccupancy = { ...blankZones(), aSouth: 181 }; // 181
  st.clock = at(875, FINAL_BEGIN); // 2:35, after dismissal
  c.tick(st);
  assert.equal(c.gated.a, true, '181 after the final dismissal must not open A');
  assert.equal(st.serviceStatus.gates.a.reason, 'waiting-for-half');
  st.zoneOccupancy = { ...blankZones(), aSouth: 180 };
  st.clock = at(885, FINAL_BEGIN); // 2:45
  c.tick(st);
  assert.equal(c.gated.a, false, '180 after the final dismissal must open A');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  assert.equal(st.serviceStatus.reopenedAt.a, st.clock);
});

// ---------------------------------------------------------------------------
// Fresh manual close (general <= 180) -> released at the current dismissal
// ---------------------------------------------------------------------------

test('fresh manual close of A with general <= 180 reopens once the manual closure is lifted after dismissal', () => {
  // A at 180 (below gate) on the 9:00 service; the team closes it by hand at 10:12,
  // then reopens it at 10:20. The 9:00 dismissal was 10:15, so lifting the closure
  // after 10:15 with 180 <= 180 opens A again.
  const c = controller('nine', { a: 181, b: 0, c: 0 });
  const st = makeState({ a: 181, b: 0, c: 0 });
  st.zoneOccupancy = { ...blankZones(), aSouth: 180 }; // 180 <= 180
  st.clock = at(612, NINE_BEGIN); // 10:12, before dismissal
  c.tick(st, [{ id: 'a', open: false }]);
  assert.equal(c.gated.a, true);
  assert.equal(st.serviceStatus.gates.a.reason, 'manual-closure');
  assert.equal(st.serviceStatus.gates.a.releaseMinute, NINE_DISMISSAL);
  st.clock = at(620, NINE_BEGIN); // 10:20, after dismissal, closure lifted
  c.tick(st, []);
  assert.equal(c.gated.a, false, 'closure lifted, dismissal passed, at half: release');
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  assert.equal(st.serviceStatus.reopenedAt.a, st.clock);
});

// ---------------------------------------------------------------------------
// Re-fill after reopen -> latched at the CURRENT dismissal (12:15)
// ---------------------------------------------------------------------------

test('eleven: re-fill after reopen latches at the current cohort dismissal 12:15, never the outgoing one', () => {
  const c = controller('eleven', { a: 411, b: 487, c: 686 }, { beginMinute: ELEVEN_BEGIN });
  const st = makeState({ a: 411, b: 487, c: 686 });
  st.zoneOccupancy.aNorth = 30; // 180 general
  st.clock = at(615, ELEVEN_BEGIN); // 10:15, outgoing dismissal -> opens
  c.tick(st);
  assert.equal(c.gated.a, false);
  assert.equal(st.serviceStatus.gates.a.releaseMinute, NINE_DISMISSAL);
  // A refills to full exactly at the 12:15 current dismissal.
  st.zoneOccupancy = { ...blankZones(), aNorth: 210, aSouth: 150 }; // 360 = full
  st.clock = at(735, ELEVEN_BEGIN); // 12:15
  c.tick(st);
  assert.equal(c.gated.a, true);
  assert.equal(st.serviceStatus.gates.a.releaseMinute, ELEVEN_DISMISSAL, 'a later fill waits on the current 11:00 cohort dismissal');
  st.zoneOccupancy.aNorth = 30; // 180 general
  st.clock = at(750, ELEVEN_BEGIN); // 12:30
  c.tick(st);
  assert.equal(c.gated.a, false);
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  assert.equal(st.serviceStatus.reopenedAt.a, st.clock);
});

// ---------------------------------------------------------------------------
// Manual close during an active (latched) state must keep the relevant dismissal
// ---------------------------------------------------------------------------

test('manual close while A is latched keeps the relevant dismissal; post-reopen re-close uses the current one', () => {
  const c = controller('eleven', { a: 411, b: 487, c: 686 }, { beginMinute: ELEVEN_BEGIN });
  const st = makeState({ a: 411, b: 487, c: 686 });
  st.zoneOccupancy.aNorth = 30; // 180 general
  st.clock = at(610, ELEVEN_BEGIN); // 10:10, before any dismissal
  c.tick(st, [{ id: 'a', open: false }]); // fresh close while the outgoing latch is pending
  assert.equal(c.gated.a, true);
  assert.equal(st.serviceStatus.gates.a.reason, 'manual-closure');
  assert.equal(st.serviceStatus.gates.a.releaseMinute, NINE_DISMISSAL,
    'the pending initial latch must keep the OUTGOING 10:15 dismissal');
  // Reopen the hand-closure before dismissal; the latch re-asserts.
  st.clock = at(612, ELEVEN_BEGIN); // 10:12
  c.tick(st, []);
  assert.equal(c.gated.a, true);
  assert.equal(st.serviceStatus.gates.a.reason, 'until-dismissal');
  assert.equal(st.serviceStatus.gates.a.releaseMinute, NINE_DISMISSAL);
  // At 10:15 with 180 -> opens.
  st.clock = at(615, ELEVEN_BEGIN);
  c.tick(st, []);
  assert.equal(c.gated.a, false);
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  // Team re-closes A by hand at 12:30 (after the 12:15 current dismissal) while full.
  st.zoneOccupancy = { ...blankZones(), aNorth: 210, aSouth: 150 };
  st.clock = at(750, ELEVEN_BEGIN); // 12:30
  c.tick(st, [{ id: 'a', open: false }]);
  assert.equal(c.gated.a, true);
  assert.equal(st.serviceStatus.gates.a.reason, 'manual-closure');
  assert.equal(st.serviceStatus.gates.a.releaseMinute, ELEVEN_DISMISSAL, 'a manual closure issued after reopening releases at the current dismissal (already passed)');
  // Lifting the closure at 180 releases A at the current dismissal.
  st.zoneOccupancy.aNorth = 30; // 180 general
  st.clock = at(765, ELEVEN_BEGIN); // 12:45
  c.tick(st, []);
  assert.equal(c.gated.a, false);
  assert.equal(st.serviceStatus.gates.a.reason, 'open');
  assert.equal(st.serviceStatus.reopenedAt.a, st.clock);
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test('controller traces are deterministic across identically configured controllers', () => {
  const runTrace = () => {
    const c = createServiceController(
      { id: 'eleven', beginMinute: 605, demand: 10 },
      distributeInitialOccupancy({ a: 411, b: 487, c: 686 }),
    );
    const st = makeState({ a: 411, b: 487, c: 686 });
    st.zoneOccupancy.aNorth = 30;
    const trace = [];
    for (let t = 0; t <= 3600; t += 180) {
      st.clock = t;
      c.tick(st);
      trace.push({
        clock: st.clock,
        reason: st.serviceStatus.gates.a.reason,
        gated: { ...st.serviceStatus.gated },
        releasedAt: st.serviceStatus.reopenedAt.a,
        issued: st.serviceStatus.issued,
      });
    }
    return trace;
  };
  assert.deepEqual(runTrace(), runTrace());
});
