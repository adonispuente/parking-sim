// CLAUDYBEAR read-only probe: eleven-service timeline of the Corporate #60/#61
// valve cycle (405 / shuttle-5 / 1038). Same configuration as
// spartan-continuation-traffic.mjs enabled. Logs state changes only.
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';
import { fromWorld } from '../src/clearImageSource.js';
const config = serviceOptions('eleven');
const s = createCampusTraffic({ initialOccupancy: config.initialOccupancy, service: { enabled: true, ...config },
  alphaQueueRelief: { enabled: true }, shuttles: { activeCount: config.activeBuses, dwellSeconds: 3 } });
const watch = new Set([405, 'shuttle-5', 1038]);
const from = Number(process.argv[2] ?? 1400), to = Number(process.argv[3] ?? 1530);
let last = '';
while (s.clock < to) {
  s.step(.1);
  if (s.clock < from) continue;
  const ops = s.corporateOperators;
  const cars = s.cars.filter(c => watch.has(c.id)).map(c => {
    const l = s.lanes[c.lane], p = l.path.getPointAt(Math.min(1, c.distance / l.length));
    return { id: c.id, route: l.name, d: Math.round(c.distance * 10) / 10, px: fromWorld([p.x, p.z]).map(Math.round),
      stop: c.corridorStopDistance == null ? null : Math.round(c.corridorStopDistance * 10) / 10, hold: !!c.holdForCorridor, y: c.yieldReason ?? null, to: c.yieldingTo ?? null };
  });
  const key = JSON.stringify({ occ: ops.shared.occupants, dir: ops.shared.direction, r60: ops.operators[1].reason, r61: ops.operators[2].reason,
    q60: ops.operators[1].request?.car ?? null, q61: ops.operators[2].request?.car ?? null,
    cars: cars.map(c => [c.id, c.stop, c.hold, c.y, c.to]) });
  if (key !== last) { console.log(Math.round(s.clock * 10) / 10, JSON.stringify({ occ: ops.shared.occupants, dir: ops.shared.direction,
    r60: ops.operators[1].reason, q60: ops.operators[1].request?.car ?? null, r61: ops.operators[2].reason, q61: ops.operators[2].request?.car ?? null, cars })); last = key; }
}
