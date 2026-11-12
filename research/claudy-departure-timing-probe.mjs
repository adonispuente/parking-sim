// CLAUDYBEAR read-only probe: when do departures and shuttle trips accrue?
// Same setup as claudy-shuttle-delay-probe.mjs. Samples s.departed and shuttle
// trips every 60 s and reports when each lot reaches 50/90/100% of its final
// departed count. Changes nothing in src/.
// Usage: node research/claudy-departure-timing-probe.mjs <srcDir> [scenario] [out.json]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const srcDir = resolve(process.argv[2] ?? 'src');
const id = process.argv[3] ?? 'final';
const out = process.argv[4] ?? `research/claudy-departure-timing-${id}.json`;
const imp = m => import(pathToFileURL(`${srcDir}/${m}`).href);
const { createCampusTraffic } = await imp('traffic.js');
const { serviceOptions } = await imp('sundayServices.js');
const config = serviceOptions(id);
const s = createCampusTraffic({ initialOccupancy: config.initialOccupancy, service: { enabled: true, ...config },
  alphaQueueRelief: { enabled: true }, shuttles: { activeCount: config.activeBuses, dwellSeconds: 3 } });
const samples = [];
for (let i = 0; i < 72000; i++) {
  s.step(.1);
  if (i % 600 === 599) samples.push({ t: Math.round(s.clock), dep: { ...s.departed }, trips: s.shuttles.reduce((a, b) => a + b.trips, 0) });
}
const final = samples.at(-1), reach = {};
for (const lot of Object.keys(final.dep)) {
  reach[lot] = {};
  for (const f of [.5, .9, 1]) { const hit = samples.find(x => x.dep[lot] >= Math.ceil(final.dep[lot] * f)); reach[lot][f] = final.dep[lot] ? hit?.t ?? null : null; }
}
const res = { srcDir, scenario: id, final, reach, tripsAt: Object.fromEntries(samples.filter((_, k) => k % 10 === 9).map(x => [x.t, x.trips])) };
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
