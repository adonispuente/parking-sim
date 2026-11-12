// CLAUDYBEAR read-only probe: where do shuttles lose time? Runs one service
// exactly like claudy-eleven-all-stalls-probe.mjs (enabled), and every 0.1 s
// tick charges each stopped shuttle to (yield reason | blocker lane family)
// and to a 20 px location cell. Changes nothing in src/.
// Usage: node research/claudy-shuttle-delay-probe.mjs <srcDir> [scenario] [out.json]
//   srcDir: '../src' (live) or a throwaway copy, e.g. './claudy-tmp-f1-before/src'
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const srcDir = resolve(process.argv[2] ?? 'src');
const id = process.argv[3] ?? 'final';
const out = process.argv[4] ?? `research/claudy-shuttle-delay-${id}.json`;
const imp = m => import(pathToFileURL(`${srcDir}/${m}`).href);
const { createCampusTraffic } = await imp('traffic.js');
const { serviceOptions } = await imp('sundayServices.js');
const { fromWorld } = await imp('clearImageSource.js');
const config = serviceOptions(id);
const s = createCampusTraffic({ initialOccupancy: config.initialOccupancy, service: { enabled: true, ...config },
  alphaQueueRelief: { enabled: true }, shuttles: { activeCount: config.activeBuses, dwellSeconds: 3 } });
const family = name => (name ?? '?').split(' · ').slice(0, 2).join(' · ');
const last = new Map(), byReason = {}, byCell = {}, perBus = {};
let stoppedTotal = 0;
for (let i = 0; i < 72000; i++) {
  s.step(.1);
  const byId = new Map(s.cars.map(c => [c.id, c]));
  for (const c of s.cars) {
    if (!String(c.id).startsWith('shuttle')) continue;
    const prev = last.get(c.id), moved = !prev || prev.lane !== c.lane || Math.abs(prev.distance - c.distance) > .005;
    last.set(c.id, { lane: c.lane, distance: c.distance });
    if (moved || c.dwell > 0 || c.dwelling) continue;
    const blocker = c.yieldingTo != null ? byId.get(c.yieldingTo) : null;
    const key = `${c.yieldReason ?? 'none'} | ${blocker ? family(s.lanes[blocker.lane]?.name) : 'no-blocker'}`;
    byReason[key] = (byReason[key] ?? 0) + .1;
    const l = s.lanes[c.lane], p = l.path.getPointAt(Math.min(1, c.distance / l.length)), px = fromWorld([p.x, p.z]);
    const cell = `${Math.round(px[0] / 20) * 20},${Math.round(px[1] / 20) * 20}`;
    byCell[cell] = (byCell[cell] ?? 0) + .1;
    perBus[c.id] = (perBus[c.id] ?? 0) + .1;
    stoppedTotal += .1;
  }
}
const top = (o, n) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]));
const res = { srcDir, scenario: id, clock: Math.round(s.clock), entered: s.entered.reduce((a, b) => a + b, 0),
  stoppedSeconds: Math.round(stoppedTotal), perBus: top(perBus, 10), byReason: top(byReason, 25), byCell: top(byCell, 25),
  note: 'stopped = shuttle distance unchanged over a 0.1 s tick, excluding dwell flags if present; seconds summed over all shuttles' };
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
