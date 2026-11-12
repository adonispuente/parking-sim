// CLAUDYBEAR read-only: which simulation lanes pass staff points #59/#60/#61
// on Corporate Drive, how close, and heading. Usage (project root):
//   node research/claudy-corporate-lane-inventory.mjs [scenario] [seconds]
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';
import { pointAt, WORLD_SCALE } from '../src/clearImageSource.js';

const id = process.argv[2] || 'eleven';
const seconds = Number(process.argv[3]) || 1300;
const config = serviceOptions(id);
const s = createCampusTraffic({ initialOccupancy: config.initialOccupancy, service: { enabled: true, ...config },
  shuttles: { activeCount: config.activeBuses, dwellSeconds: 3 } });
for (let i = 0; i < seconds * 10; i++) s.step(.1);
const staff = [59, 60, 61].map(i => ({ i, x: pointAt(i)[0] * WORLD_SCALE, z: pointAt(i)[1] * WORLD_SCALE }));
const rows = [];
for (const lane of s.lanes) {
  const n = Math.max(1, Math.ceil(lane.length / .25)), hits = {};
  for (const st of staff) {
    let best = Infinity, bt = 0;
    for (let k = 0; k <= n; k++) { const p = lane.path.getPointAt(k / n), d = Math.hypot(p.x - st.x, p.z - st.z); if (d < best) { best = d; bt = k / n; } }
    if (best <= 4) { const g = lane.path.getTangentAt(bt); hits[st.i] = { gap: +best.toFixed(2), at: +(bt * lane.length).toFixed(1), heading: Math.round(Math.atan2(g.z, g.x) * 180 / Math.PI) }; }
  }
  if (Object.keys(hits).length) rows.push({ name: lane.name, len: +lane.length.toFixed(1), hits });
}
console.log(JSON.stringify({ scenario: id, lanes: s.lanes.length, staffWorld: staff, rows }, null, 1));
