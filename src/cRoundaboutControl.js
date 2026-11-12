// Local marshal at the drawn four-way above C's roundabout. Compatible lanes
// run together; priority applies to crossing/merging movements only.
import { C_FOUR_WAY, C_ROUNDABOUT_POSITION } from './cHubSource.js';
import { WORLD_SCALE } from './clearImageSource.js';
import { inPolygon } from './sourceRouting.js';
import { trafficClass, compareTrafficPriority } from './trafficPriority.js';
import { busesPassThrough } from './vehicleInteractions.js';

export const C_ROUNDABOUT_DEFAULTS = Object.freeze({ enabled: true, lookahead: 10, conflictWidth: .95, stopGap: 1.25 });
const half = car => (car.bodyLength ?? (car.fleetBus ? 2.9 : 1.35)) / 2;
export function attachCRoundaboutControl(state, options = {}) {
  const config = { ...C_ROUNDABOUT_DEFAULTS, ...options }, cache = new WeakMap(), pairs = new WeakMap();
  const status = state.cRoundabout = { position: C_ROUNDABOUT_POSITION, enabled: config.enabled,
    priority: ['shuttle', 'departure', 'arrival'], waiting: { shuttle: 0, departure: 0, arrival: 0 }, admitted: [], held: [], reason: 'free flow' };
  state.parkingRadio?.positions.push({ id: 'cRoundabout', index: null, sourceIndex: 48, name: 'Lot C roundabout marshal' });
  // A shuttle can cross the area twice on one leg. Track each visit separately,
  // so its later return never claims the junction while it is across the lot.
  const visits = lane => {
    if (!cache.has(lane)) {
      const count = Math.max(1, Math.ceil(lane.length / .2)), groups = []; let group;
      for (let i = 0; i <= count; i++) {
        const distance = lane.length * i / count, p = lane.path.getPointAt(i / count);
        if (inPolygon([p.x / WORLD_SCALE, p.z / WORLD_SCALE], C_FOUR_WAY)) {
          if (!group) { group = { from: distance, to: distance, points: [] }; groups.push(group); }
          group.to = distance; group.points.push(p);
        } else group = null;
      }
      cache.set(lane, groups);
    }
    return cache.get(lane);
  };
  const conflicts = (a, b) => {
    if (busesPassThrough(a.car, b.car)) return false;
    if (!pairs.has(a.visit)) pairs.set(a.visit, new WeakMap());
    const pair = pairs.get(a.visit);
    if (!pair.has(b.visit)) pair.set(b.visit, a.visit.points.some(p => b.visit.points.some(q =>
      Math.hypot(p.x - q.x, p.z - q.z) < config.conflictWidth)));
    return pair.get(b.visit);
  };
  state.prepareCRoundaboutControl = () => {
    for (const car of state.cars) { delete car.cRoundaboutStopDistance; car.holdForCRoundabout = false; }
    status.waiting = { shuttle: 0, departure: 0, arrival: 0 }; status.admitted = []; status.held = []; status.clearing = [];
    if (!config.enabled) return;
    const candidates = [];
    for (const car of state.cars) {
      const lane = state.lanes[car.lane];
      const visit = visits(lane).find(v => car.distance - half(car) <= v.to && car.distance < lane.length);
      if (!visit || visit.from - car.distance > config.lookahead) continue;
      const occupied = car.distance + half(car) >= visit.from;
      const stop = Math.max(0, visit.from - half(car) - config.stopGap);
      const kind = trafficClass(car);
      // A blocked car far upstream cannot reserve the junction. Ready exits
      // and approaching shuttles do take precedence over entering cars.
      const ready = kind === 'shuttle' || car.distance >= stop - 1;
      if (ready && !occupied) status.waiting[kind]++;
      candidates.push({ car, visit, occupied, stop, ready });
    }
    const occupants = candidates.filter(c => c.occupied);
    const granted = [...occupants];
    const pending = candidates.filter(c => !c.occupied).sort((a, b) => compareTrafficPriority(a.car, b.car) || (a.stop - a.car.distance) - (b.stop - b.car.distance));
    for (const c of pending) {
      const blockers = granted.filter(other => conflicts(c, other));
      // Cars physically ahead of a bus in the same movement must clear first.
      const leads = other => {
        const a = state.lanes[c.car.lane], b = state.lanes[other.car.lane];
        const p = a.path.getPointAt(c.car.distance / a.length), q = b.path.getPointAt(other.car.distance / b.length);
        const t = a.path.getTangentAt(c.car.distance / a.length), u = b.path.getTangentAt(other.car.distance / b.length);
        const dx = p.x - q.x, dz = p.z - q.z;
        return t.dot(u) > .7 && dx * u.x + dz * u.z > 0 && Math.abs(dx * u.z - dz * u.x) < .85;
      };
      if (blockers.some(other => !leads(other))) {
        c.car.cRoundaboutStopDistance = c.stop;
        c.car.holdForCRoundabout = c.car.distance >= c.stop - .05;
        status.held.push(c.car.id);
      } else if (c.ready) granted.push(c);
    }
    // Clear the physical blocking chain of an occupant or admitted movement.
    // Holding a priority bus's leader for that bus would trap both, even when
    // their final lanes differ. Other conflicting cars remain held.
    const byId = new Map(state.cars.map(car => [car.id, car]));
    const released = new Set();
    for (const occupant of granted) {
      const seen = new Set([occupant.car.id]);
      let next = byId.get(occupant.car.yieldingTo);
      while (next && !seen.has(next.id)) {
        seen.add(next.id);
        if (Number.isFinite(next.cRoundaboutStopDistance)) {
          delete next.cRoundaboutStopDistance; next.holdForCRoundabout = false; released.add(next.id);
        }
        next = byId.get(next.yieldingTo);
      }
    }
    status.held = status.held.filter(id => !released.has(id));
    status.clearing = [...released];
    status.admitted = granted.map(c => c.car.id);
    status.reason = occupants.length ? 'clear occupied movements; compatible lanes continue' :
      granted.some(c => trafficClass(c.car) === 'shuttle') ? 'shuttle priority; compatible lanes continue' :
      granted.some(c => trafficClass(c.car) === 'departure') ? 'exit priority; compatible lanes continue' : 'free flow';
  };
}
