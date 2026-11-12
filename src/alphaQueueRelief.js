// #59 offers Bravo when Alpha backs up. Thresholds are provisional, not surveyed.
import { pointAt, shapeAt } from './clearImageSource.js';
import { inPolygon } from './sourceRouting.js';
export const ALPHA_RELIEF_DECISION = Object.freeze([...pointAt(59)]);
export const beforeAlphaDecision = p => inPolygon(p, shapeAt(54).points) && p[1] > ALPHA_RELIEF_DECISION[1] + 12;
export function attachAlphaQueueRelief(state, options = {}) {
  const high = Math.max(2, Math.floor(Number(options.high) || 6));
  const low = Math.max(0, Math.min(high - 1, Math.floor(Number(options.low ?? 2) || 0)));
  const gate = state.alphaQueueRelief = {
    operatorIndex: 59, enabled: options.enabled ?? true, high, low, active: false,
    queued: 0, redirected: 0, assigned: 0, transitions: [], provisional: true,
  };
  state.prepareAlphaQueueRelief = () => {
    gate.queued = state.cars.filter(car => {
      if (car.phase !== 'arrival' || car.target !== 'a' || car.badgePool || car.fleetBus) return false;
      const c = state.lanes[car.lane]?.aControl;
      return c && !car.aMergePassed && car.distance <= c.mergeDistance && c.mergeDistance - car.distance <= 12;
    }).length;
    const was = gate.active;
    if (!gate.enabled) gate.active = false;
    else if (gate.queued >= high) gate.active = true;
    else if (gate.queued <= low) gate.active = false;
    gate.reason = gate.active ? 'Alpha backed up: offer Bravo' : 'Alpha queue clear';
    if (was !== gate.active) {
      gate.transitions.push({ clock: state.clock, active: gate.active, queued: gate.queued });
      if (gate.transitions.length > 100) gate.transitions.shift();
    }
  };
}