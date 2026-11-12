import { trafficPriority } from './trafficPriority.js';
import { RESOLVED_A_MAIN_POSITION } from './positions/index.js';
import { toWorld } from './clearImageSource.js';

// Provisional staffed station, not a change to approved traced pavement.
export const LOT_A_MAIN_POSITION = RESOLVED_A_MAIN_POSITION;
export const LOT_A_MAIN_BATCH_SIZE = 5;
// Compatibility exports for existing integrations.
export const A_DEPARTURE_MERGE = LOT_A_MAIN_POSITION;
const approaches = ['aNorth', 'aSouth', 'aMain'];

// All routes that actually traverse the position use the same admission gate.
// Badge/shuttle routes elsewhere in A are not silently detoured through it.
// Where an approach folds back on its exit (e.g. South staging west of Main,
// exit tail leaving west), stop further upstream so the held car sits clear of
// the admitted car's exit sweep. Body clearance in sharedTraffic still applies.
export const MAIN_STOP_BACK = 1.7;
export const MAIN_FOLD_STOP_BACK = 3.0;
const mainIndex = points => points.findIndex(p =>
  Math.hypot(p[0] - LOT_A_MAIN_POSITION[0], p[1] - LOT_A_MAIN_POSITION[1]) < .001);
// Stop distance (scene units before Main) the controller applies to a route.
export function mainStopBack(points) {
  const index = mainIndex(points);
  if (index < 0) return null;
  const dir = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1; return [dx / n, dy / n]; };
  const into = index > 0 ? dir(points[index - 1], points[index]) : null;
  const out = index < points.length - 1 ? dir(points[index], points[index + 1]) : null;
  return into && out && into[0] * out[0] + into[1] * out[1] < 0 ? MAIN_FOLD_STOP_BACK : MAIN_STOP_BACK;
}
// A DEPARTURE held for the batch must not park its body inside the path the
// admitted car sweeps after Main, or the gate waits on a car that is yielding to
// the held car (eleven 965->179, final 1248->209). Measured on built lanes
// (research/claudy-main-stop-clearance-probe.log): the aNorth departure held 1.7
// before Main leaves 0.505 world to the admitted aNorth arrival path, below the
// 0.9 conflict width; 3.0 back clears it (~1.16).
// aSouth (CLAUDYBEAR 2026-11-07, eleven 299->1150): measured with sharedTraffic's
// own CHORD-sampled windows, not the true lane geometry. A Main-inbound arrival
// held 1.7 back passes 0.882 from an admitted departure's look-ahead chord (true
// lanes 0.94), so the admitted departure yields to the held arrival. aMain 2.2
// clears all 26 arrival lanes vs both departures (min 0.979). The aSouth
// departure held 1.7 sits ON the admitted aSouth arrival path (gap 0). Its window
// is narrow: <3.05 still conflicts near Main (3.0 -> 0.893), >3.25 conflicts with
// the arrival's final aisle (3.5 -> 0.699). 3.2 is the measured best (min 0.956).
// research/claudy-asouth-departure-back-probe-fine.json. Thin margins, provisional.
export const MAIN_DEPARTURE_HOLD_BACK = Object.freeze({ aNorth: 3.0, aSouth: 3.2, aMain: 2.2 });
// Stop distance the controller actually applies for this route and approach.
export function mainHoldBack(points, approach) {
  const back = mainStopBack(points);
  if (back === null) return null;
  return Math.max(back, MAIN_DEPARTURE_HOLD_BACK[approach] ?? 0);
}
export function attachMainPositionToLane(lane, points, approach) {
  let total = 0, station = null, index = -1;
  for (let i = 0; i < points.length; i++) {
    if (i) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (station === null && Math.hypot(points[i][0] - LOT_A_MAIN_POSITION[0], points[i][1] - LOT_A_MAIN_POSITION[1]) < .001) {
      station = total; index = i;
    }
  }
  if (station === null) return false;
  // keepRight offsets street vertices, so raw-pixel arclength ratios drift from
  // the built lane. Locate the canonical Main on the actual lane path instead,
  // searching ONLY near the raw-ratio estimate: a global nearest sample could
  // lock onto a later pass beside Main and hold arrivals inside the position.
  let mergeDistance = total ? station / total * lane.length : 0;
  if (lane.path?.getPointAt && lane.length > 0) {
    const [mx, mz] = toWorld(LOT_A_MAIN_POSITION);
    const n = Math.max(1, Math.ceil(lane.length / .05)), estimate = mergeDistance;
    const window = Math.max(3, lane.length * .08);
    let best = Infinity;
    for (let i = 0; i <= n; i++) {
      if (Math.abs(lane.length * i / n - estimate) > window) continue;
      const p = lane.path.getPointAt(i / n);
      if (!p) continue;
      const dd = Math.hypot(p.x - mx, p.z - mz);
      if (dd < best) { best = dd; mergeDistance = lane.length * i / n; }
    }
  }
  const folds = mainStopBack(points) === MAIN_FOLD_STOP_BACK, back = mainHoldBack(points, approach);
  lane.aControl = { approach, mergeDistance, folds,
    stopDistance: Math.max(0, mergeDistance - back),
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
    // A vehicle already beyond its stop line clears before any new admission,
    // including after a redirect or a state restored with traffic in the gate.
    const clearing = candidates.filter(car => car !== admitted &&
      car.distance > control(car).stopDistance + .1 && car.distance < control(car).releaseDistance);
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
    if (!admitted && !clearing.length && selectable.length) {
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
      const mustClear = car === admitted || clearing.includes(car);
      car.controlStopDistance = mustClear ? undefined : stop;
      car.holdForBatch = !mustClear && car.distance >= stop - 1e-6;
    }
  };
  state.observeLotAControl = () => {
    for (const car of remaining()) {
      if (car.distance < control(car).releaseDistance) continue;
      const side = approach(car);
      car.aMergePassed = true;
      delete car.controlStopDistance;
      car.holdForBatch = false;
      gate.passedInBatch++;
      gate.totalPassed[side]++;
      gate.history.push({ id: car.id, side, phase: car.phase, clock: state.clock, batchCount: gate.passedInBatch });
      if (gate.history.length > 100) gate.history.shift();
      if (car === admitted) { admitted = null; gate.admittedId = null; }
    }
  };
}
