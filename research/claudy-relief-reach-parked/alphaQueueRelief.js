// #59 offers Bravo when Alpha backs up. Thresholds are provisional, not surveyed.
import { pointAt, shapeAt, fromWorld } from './clearImageSource.js';
import { inPolygon } from './sourceRouting.js';
export const ALPHA_RELIEF_DEFAULTS = Object.freeze({ enabled: true, high: 6, low: 2 });
export const ALPHA_RELIEF_DECISION = Object.freeze([...pointAt(59)]);
export const beforeAlphaDecision = p => inPolygon(p, shapeAt(54).points) && p[1] > ALPHA_RELIEF_DECISION[1] + 12;
// Fallback window (world units before Main) for lanes that never cross the #59
// decision line, or fixtures without a built path. This was the only window
// before 2026-11-06; at 2.6 world car pitch it holds at most ~4-5 cars, so
// high=6 could never trip (eleven: 36 cars frozen on aNorth, queued read 4).
export const ALPHA_RELIEF_NEAR_MAIN = 12;
// One car per 2.6 world in a standing line: 1.35 body + 1.25 BODY_GAP (sharedTraffic.js:7-9).
export const ALPHA_RELIEF_CAR_PITCH = 2.6;
// "If the line into A ever got that backed up": the line must fill this share
// of the #59-to-Main stretch. Provisional modelling choice, not surveyed; never
// below options.high, so the 12-world fallback still trips at six.
export const ALPHA_RELIEF_FILL = 0.75;
// The line #59 watches: lane distance from Main back to the decision line,
// measured once on the BUILT lane path (research/claudy-relief-reach-plan-2026-11-06.md).
export function alphaReliefReach(lane) {
  const c = lane?.aControl;
  if (!c) return 0;
  if (c.reliefReach !== undefined) return c.reliefReach;
  let reach = ALPHA_RELIEF_NEAR_MAIN;
  if (lane.path && lane.length > 0) {
    for (let d = c.mergeDistance; d >= 0; d -= .1) {
      const p = lane.path.getPointAt(Math.min(1, Math.max(0, d / lane.length)));
      if (beforeAlphaDecision(fromWorld([p.x, p.z]))) { reach = Math.max(ALPHA_RELIEF_NEAR_MAIN, c.mergeDistance - d); break; }
    }
  }
  c.reliefReach = reach;
  return reach;
}
export function attachAlphaQueueRelief(state, options = {}) {
  const high = Math.max(2, Math.floor(Number(options.high) || 6));
  const low = Math.max(0, Math.min(high - 1, Math.floor(Number(options.low ?? 2) || 0)));
  const gate = state.alphaQueueRelief = {
    operatorIndex: 59, enabled: options.enabled ?? true, high, low, active: false,
    queued: 0, redirected: 0, assigned: 0, transitions: [], provisional: true,
  };
  state.prepareAlphaQueueRelief = () => {
    let longest = 0;
    gate.queued = state.cars.filter(car => {
      if (car.phase !== 'arrival' || car.target !== 'a' || car.badgePool || car.fleetBus) return false;
      const lane = state.lanes[car.lane], c = lane?.aControl;
      if (!c || car.aMergePassed || car.distance > c.mergeDistance) return false;
      const reach = alphaReliefReach(lane);longest = Math.max(longest, reach);
      return c.mergeDistance - car.distance <= reach;
    }).length;
    gate.capacity = Math.floor(longest / ALPHA_RELIEF_CAR_PITCH);
    gate.trigger = Math.max(high, Math.ceil(ALPHA_RELIEF_FILL * gate.capacity));
    const was = gate.active;
    if (!gate.enabled) gate.active = false;
    else if (gate.queued >= gate.trigger) gate.active = true;
    else if (gate.queued <= low) gate.active = false;
    gate.reason = gate.active ? 'Alpha backed up: offer Bravo' : 'Alpha queue clear';
    if (was !== gate.active) {
      gate.transitions.push({ clock: state.clock, active: gate.active, queued: gate.queued });
      if (gate.transitions.length > 100) gate.transitions.shift();
    }
  };
}