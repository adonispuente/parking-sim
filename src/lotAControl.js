import { trafficPriority } from './trafficPriority.js';

// Provisional staffed station, not a change to approved traced pavement.
export const LOT_A_MAIN_POSITION = Object.freeze([112, 50]);
export const LOT_A_MAIN_BATCH_SIZE = 5;
// Compatibility exports for existing integrations.
export const A_DEPARTURE_MERGE = LOT_A_MAIN_POSITION;
export const A_DEPARTURE_BATCH_SIZE = LOT_A_MAIN_BATCH_SIZE;
const approaches = ['aNorth', 'aSouth', 'aMain'];
export const LOT_A_APPROACH_LABELS = Object.freeze({
  aNorth: 'North', aSouth: 'South', aMain: 'Main inbound',
});

// All routes that actually traverse the position use the same admission gate.
// Badge/shuttle routes elsewhere in A are not silently detoured through it.
export function attachMainPositionToLane(lane, points, approach) {
  let total = 0, station = null;
  for (let i = 0; i < points.length; i++) {
    if (i) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (station === null && Math.hypot(points[i][0] - LOT_A_MAIN_POSITION[0], points[i][1] - LOT_A_MAIN_POSITION[1]) < .001)
      station = total;
  }
  if (station === null) return false;
  const mergeDistance = total ? station / total * lane.length : 0;
  lane.aControl = { approach, mergeDistance, stopDistance: Math.max(0, mergeDistance - 1.7),
    releaseDistance: Math.min(lane.length, mergeDistance + 1.7) };
  return true;
}

export function attachLotAControl(state) {
  const gate = state.aMainControl = {
    name: 'Lot A Main Position', activeSide: 'aNorth', batchSize: LOT_A_MAIN_BATCH_SIZE,
    passedInBatch: 0, totalPassed: { aNorth: 0, aSouth: 0, aMain: 0 },
    waiting: { aNorth: 0, aSouth: 0, aMain: 0 }, ready: { aNorth: 0, aSouth: 0, aMain: 0 },
    admittedId: null, history: [], switchPending: false,
  };
  state.aDepartureControl = gate; // Existing dashboard/save consumers remain compatible.
  let admitted = null;
  const control = car => state.lanes[car.lane]?.aControl;
  const approach = car => control(car).approach ?? car.zone;
  const remaining = () => state.cars.filter(car => control(car) && !car.aMergePassed);
  state.prepareLotAControl = () => {
    if (admitted && !state.cars.includes(admitted)) { admitted = null; gate.admittedId = null; }
    const candidates = remaining();
    const ready = candidates.filter(car => !car.holdForGate && car.distance >= control(car).stopDistance - .25);
    for (const side of approaches) {
      gate.waiting[side] = candidates.filter(car => approach(car) === side).length;
      gate.ready[side] = ready.filter(car => approach(car) === side).length;
    }
    const queued = candidates.filter(car => !car.holdForGate);
    if (!admitted && gate.passedInBatch >= gate.batchSize && queued.length) {
      // Honour the five-car handoff even if the other queue is still approaching
      // its stop line. Otherwise a short North aisle can drain before South gets
      // close enough to compete, silently extending the batch beyond five.
      const highest = Math.max(...queued.map(trafficPriority));
      const available = approaches.filter(side => queued.some(car => approach(car) === side && trafficPriority(car) === highest));
      const start = approaches.indexOf(gate.activeSide);
      gate.activeSide = Array.from({length: approaches.length}, (_, i) => approaches[(start + i + 1) % approaches.length])
        .find(side => available.includes(side));
      gate.passedInBatch = 0;
      gate.switchPending = true;
    }
    const activeQueued = queued.filter(car => approach(car) === gate.activeSide);
    if (gate.switchPending && !activeQueued.length) gate.switchPending = false;
    const pendingPriority = activeQueued.length ? Math.max(...activeQueued.map(trafficPriority)) : 0;
    const selectable = gate.switchPending
      ? ready.filter(car => approach(car) === gate.activeSide || trafficPriority(car) > pendingPriority)
      : ready;
    if (!admitted && selectable.length) {
      // Only ready approaches compete. A distant departure must not reserve an
      // empty crossing against a vehicle already waiting at the staffed stop.
      const highest = Math.max(...selectable.map(trafficPriority));
      const preferred = selectable.filter(car => trafficPriority(car) === highest);
      const available = approaches.filter(side => preferred.some(car => approach(car) === side));
      let next = gate.activeSide;
      if (!available.includes(next) || gate.passedInBatch >= gate.batchSize) {
        const start = approaches.indexOf(gate.activeSide);
        next = Array.from({ length: approaches.length }, (_, i) => approaches[(start + i + 1) % approaches.length])
          .find(side => available.includes(side));
        gate.passedInBatch = 0;
      }
      gate.activeSide = next;
      // Keep ownership throughout the batch, including gaps between cars from
      // a longer aisle. Higher-priority ready traffic may still preempt safely.
      gate.switchPending = true;
      admitted = preferred.filter(car => approach(car) === next)
        .sort((a, b) => (control(a).stopDistance - a.distance) - (control(b).stopDistance - b.distance))[0];
      gate.admittedId = admitted.id;
    }
    for (const car of candidates) {
      const stop = control(car).stopDistance;
      car.controlStopDistance = car === admitted ? undefined : stop;
      car.holdForBatch = car !== admitted && car.distance >= stop - 1e-6;
    }
  };
  state.observeLotAControl = () => {
    if (!admitted || admitted.distance < control(admitted).releaseDistance) return;
    const side = approach(admitted);
    admitted.aMergePassed = true;
    delete admitted.controlStopDistance;
    admitted.holdForBatch = false;
    gate.passedInBatch++;
    gate.totalPassed[side]++;
    gate.history.push({ id: admitted.id, side, phase: admitted.phase, clock: state.clock, batchCount: gate.passedInBatch });
    if (gate.history.length > 100) gate.history.shift();
    admitted = null;
    gate.admittedId = null;
  };
}
