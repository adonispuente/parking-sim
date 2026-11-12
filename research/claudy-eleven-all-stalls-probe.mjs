// CLAUDYBEAR read-only probe: eleven-service run identical to
// spartan-continuation-traffic.mjs (enabled), but records ALL stalled vehicles,
// their yield chains to a terminal holder, Corporate operator state, and when
// each stall began. Changes nothing in src/.
// Usage: node research/claudy-eleven-all-stalls-probe.mjs [scenario] [out.json]
import { writeFileSync } from 'node:fs';
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';
import { fromWorld } from '../src/clearImageSource.js';

const id = process.argv[2] ?? 'eleven';
const out = process.argv[3] ?? `research/claudy-${id}-all-stalls.json`;
const config = serviceOptions(id);
const s = createCampusTraffic({ initialOccupancy: config.initialOccupancy, service: { enabled: true, ...config },
  alphaQueueRelief: { enabled: true }, shuttles: { activeCount: config.activeBuses, dwellSeconds: 3 } });
const still = new Map();
const firstStallAt = new Map();
const snapshots = [];
for (let i = 0; i < 72000; i++) {
  s.step(.1);
  for (const car of s.cars) {
    const prev = still.get(car.id);
    if (!prev || prev.lane !== car.lane || Math.abs(prev.distance - car.distance) > .05)
      still.set(car.id, { lane: car.lane, distance: car.distance, since: s.clock });
    else if (s.clock - prev.since >= 60 && !firstStallAt.has(car.id)) firstStallAt.set(car.id, prev.since);
  }
  if (i % 3000 === 2999) {
    const stalledNow = s.cars.filter(c => s.clock - (still.get(c.id)?.since ?? s.clock) >= 60).length;
    snapshots.push({ clock: Math.round(s.clock), stalled: stalledNow, entered: s.entered.reduce((a, b) => a + b, 0) });
  }
}
const byId = new Map(s.cars.map(c => [c.id, c]));
const pos = c => { const l = s.lanes[c.lane], p = l.path.getPointAt(Math.min(1, c.distance / l.length)); return fromWorld([p.x, p.z]).map(v => Math.round(v * 10) / 10); };
const describe = c => ({ id: c.id, cls: c.kind ?? c.type ?? (c.isBus ? 'bus' : c.phase), phase: c.phase, zone: c.zone,
  px: pos(c), route: s.lanes[c.lane].name, dist: Math.round(c.distance * 100) / 100, len: Math.round(s.lanes[c.lane].length * 100) / 100,
  yield: c.yieldReason ?? null, to: c.yieldingTo ?? null,
  holds: ['holdForGate', 'holdForBatch', 'holdForOfficer', 'holdForCorridor'].filter(k => c[k]),
  corridorStop: c.corridorStopDistance ?? null });
const stalled = s.cars.filter(c => s.clock - (still.get(c.id)?.since ?? s.clock) >= 60);
const chainOf = c => {
  const chain = [c.id]; let cur = c;
  for (let k = 0; k < 40; k++) {
    const next = cur.yieldingTo != null ? byId.get(cur.yieldingTo) : null;
    if (!next) break;
    if (chain.includes(next.id)) { chain.push(next.id, 'CYCLE'); break; }
    chain.push(next.id); cur = next;
  }
  return chain;
};
const rows = stalled.map(c => ({ ...describe(c), stalledSince: Math.round(firstStallAt.get(c.id) ?? still.get(c.id).since), chain: chainOf(c) }));
const terminals = {};
for (const r of rows) {
  const last = r.chain[r.chain.length - 1];
  const key = last === 'CYCLE' ? `cycle:${r.chain.slice(0, -1).slice(-3).join('>')}` : `terminal:${last}`;
  terminals[key] ??= { count: 0, members: [] };
  terminals[key].count++; terminals[key].members.push(r.id);
}
const terminalCars = Object.keys(terminals).filter(k => k.startsWith('terminal:')).map(k => byId.get(Number(k.slice(9))) ?? byId.get(k.slice(9))).filter(Boolean).map(describe);
const reasons = {}; for (const r of rows) reasons[r.yield ?? 'none'] = (reasons[r.yield ?? 'none'] ?? 0) + 1;
const ops = s.corporateOperators;
const result = { scenario: id, clock: s.clock, entered: s.entered.reduce((a, b) => a + b, 0), stalledCount: rows.length, reasons,
  snapshots, terminals, terminalCars,
  corporate: ops && { shared: ops.shared, operators: ops.operators.map(o => ({ index: o.index, reason: o.reason, waiting: o.waiting, admitted: o.admitted, admittedInRow: o.admittedInRow, request: o.request && { car: o.request.car.id, class: o.request.class, stop: o.request.stretch.stop } })) },
  earliest: [...rows].sort((a, b) => a.stalledSince - b.stalledSince).slice(0, 12).map(r => ({ id: r.id, since: r.stalledSince, yield: r.yield, to: r.to, route: r.route, px: r.px })),
  stalled: rows };
writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ out, stalledCount: rows.length, reasons, terminals: Object.fromEntries(Object.entries(terminals).map(([k, v]) => [k, v.count])), corporate: result.corporate, earliest: result.earliest }, null, 1));
