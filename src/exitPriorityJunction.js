// Local feeder/Corporate officer. Road geometry and sharedTraffic still enforce
// clearance; this controller supplies admission order only at conflicting paths.
import { WORLD_SCALE, pointAt } from './clearImageSource.js';
import { trafficClass, compareTrafficPriority } from './trafficPriority.js';
import { CONFLICT_WIDTH } from './sharedTraffic.js';

export const EXIT_JUNCTION_DEFAULTS = Object.freeze({ enabled: true, exitBatch: 10, entryBatch: 5,
  radius: 3.5, stopAhead: 3.4, clearAfter: 3.4, lookahead: 12 });
const half = car => (car.bodyLength ?? 1.35) / 2;
export function attachExitPriorityJunction(state, options = {}) {
  const config = { ...EXIT_JUNCTION_DEFAULTS, ...options };
  const position = pointAt(59), station = { x: position[0] * WORLD_SCALE, z: position[1] * WORLD_SCALE };
  const cache = new WeakMap(), passed = new WeakMap();
  let admitted = null, admittedLane = null;
  const gate = state.corporateExitJunction = { enabled: config.enabled, position, name: 'Feeder / Corporate officer',
    exitBatch: config.exitBatch, entryBatch: config.entryBatch, turn: 'departure', clearedInBatch: 0,
    waitingExit: 0, waitingEntry: 0, passedExit: 0, passedEntry: 0, admittedId: null, reason: 'idle' };
  const control = car => {
    const lane = state.lanes[car.lane];
    if (!lane) return null;
    if (!cache.has(lane)) {
      let best = Infinity, distance = 0;
      const n = Math.max(1, Math.ceil(lane.length / .3));
      for (let i = 0; i <= n; i++) {
        const p = lane.path.getPointAt(i / n), d = Math.hypot(p.x - station.x, p.z - station.z);
        if (d < best) { best = d; distance = lane.length * i / n; }
      }
      cache.set(lane, best <= config.radius ? { merge: distance, stop: Math.max(0, distance - config.stopAhead),
        release: Math.min(lane.length, distance + config.clearAfter) } : null);
    }
    return cache.get(lane);
  };
  const role = car => trafficClass(car);
  const inZone = car => {
    const c = control(car);
    return c && car.distance + half(car) > c.merge - 1.7 && car.distance - half(car) < c.release;
  };
  const cleared = car => {
    const c = control(car), lane = state.lanes[car.lane];
    return c && (car.distance >= lane.length || car.distance - half(car) >= c.release);
  };
  // Opposite classifications need not conflict: median-separated movements can
  // continue together. Compare the actual local lane segments, not an entire road.
  const conflictCache = new WeakMap();
  const conflicts = (a, b) => {
    const la = state.lanes[a.lane], lb = state.lanes[b.lane];
    if (la === lb) return true;
    if (!conflictCache.has(la)) conflictCache.set(la, new WeakMap());
    const records = conflictCache.get(la);
    if (!records.has(lb)) {
      const sample = (lane, c) => {
        const from = Math.max(0, c.merge - 2), to = c.release;
        const n = Math.max(1, Math.ceil((to - from) / .2));
        return Array.from({ length: n + 1 }, (_, i) => lane.path.getPointAt((from + (to - from) * i / n) / lane.length));
      };
      const pa = sample(la, control(a)), pb = sample(lb, control(b));
      records.set(lb, pa.some(p => pb.some(q => Math.hypot(p.x - q.x, p.z - q.z) < CONFLICT_WIDTH)));
    }
    return records.get(lb);
  };
  state.prepareCorporateExitJunction = () => {
    for (const car of state.cars) { delete car.corporateJunctionStopDistance; car.holdForCorporateJunction = false; }
    if (!config.enabled) return;
    if (admitted && (!state.cars.includes(admitted) || admitted.lane !== admittedLane)) {
      admitted = null; gate.admittedId = null;
    }
    const candidates = state.cars.filter(car => control(car) && passed.get(car) !== car.lane && !cleared(car));
    const ready = candidates.filter(car => !car.holdForGate && car.distance >= control(car).stop - .25 && !inZone(car));
    const exits = ready.filter(car => role(car) === 'departure'), entries = ready.filter(car => role(car) === 'arrival');
    gate.waitingExit = exits.length; gate.waitingEntry = entries.length;
    const buses = candidates.filter(car => role(car) === 'shuttle' && control(car).merge - car.distance < config.lookahead);
    const occupants = candidates.filter(inZone);
    const limit = gate.turn === 'departure' ? config.exitBatch : config.entryBatch;
    const mine = gate.turn === 'departure' ? exits : entries, other = gate.turn === 'departure' ? entries : exits;
    if (!admitted && ((gate.clearedInBatch >= limit && other.length) || (!mine.length && other.length))) {
      gate.turn = gate.turn === 'departure' ? 'arrival' : 'departure'; gate.clearedInBatch = 0;
    }
    const selected = (gate.turn === 'departure' ? exits : entries).sort((a,b) =>
      (control(a).stop-a.distance)-(control(b).stop-b.distance)||compareTrafficPriority(a,b))[0];
    if (!admitted && selected && !occupants.some(car => conflicts(car, selected)) &&
        !buses.some(car => conflicts(car, selected))) {
      admitted = selected; admittedLane = selected.lane; gate.admittedId = selected.id;
    }
    gate.reason = buses.length ? 'shuttle priority' : occupants.length ? 'clear occupied junction' :
      admitted ? `${gate.turn} release · ${gate.clearedInBatch}/${gate.turn === 'departure' ? config.exitBatch : config.entryBatch}` : 'free flow';
    for (const car of candidates) {
      if (car === admitted || inZone(car) || role(car) === 'shuttle') continue;
      // Without a competing ready movement there is no quota wait. The shared
      // movement engine still stops a car for an actual occupied body/crossing.
      const rivals = role(car) === 'departure' ? entries : exits;
      const busConflict = buses.some(bus => bus.lane !== car.lane && conflicts(car, bus));
      const contested = rivals.some(rival => conflicts(car, rival));
      const admittedConflict = admitted && role(admitted) !== role(car) && conflicts(car, admitted);
      const occupiedConflict = occupants.some(other => other !== car && other.lane !== car.lane && role(other) !== role(car) && conflicts(car, other));
      if (!busConflict && !contested && !admittedConflict && !occupiedConflict) continue;
      // Let the physical leader ahead of a bus clear rather than trapping it.
      const leadsBus = buses.some(bus => bus.lane === car.lane && car.distance > bus.distance);
      if (leadsBus) continue;
      car.corporateJunctionStopDistance = control(car).stop;
      car.holdForCorporateJunction = car.distance >= control(car).stop - .01;
    }
  };
  state.observeCorporateExitJunction = () => {
    if (!config.enabled) return;
    for (const car of state.cars) {
      if (passed.get(car) === car.lane || !cleared(car)) continue;
      passed.set(car,car.lane);
      if (role(car) === 'departure') gate.passedExit++;
      if (role(car) === 'arrival') gate.passedEntry++;
      if (role(car) === gate.turn) gate.clearedInBatch++;
      if (car === admitted) { admitted = null; gate.admittedId = null; }
    }
  };
}
