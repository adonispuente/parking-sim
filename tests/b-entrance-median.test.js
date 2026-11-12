// Lot B west mouth is median-separated: entrance side y>=~375 (traced #4-#7
// turn in at y~384-391), exit side y~358-363 (traced #17), #61 on the median at
// (486,370). Feeder-origin arrivals must enter on the entrance side without an
// out-and-back reversal at the mouth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pointAt } from '../src/clearImageSource.js';
import { zoneArrivalRoute } from '../src/parkingRoutes.js';

const ZONES = ['bSouth', 'bBanana', 'bPocket', 'bNorth'];
const KEYS = ['bWest', 'bNorth'];
const e = pointAt(61);
const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// Mouth window around #61 (px).
const inMouth = p => d(p, e) < 45;

for (const key of KEYS) for (const zone of ZONES) {
  test(`${key} -> ${zone}: entrance-side mouth, no reversal, passes #61`, () => {
    const path = zoneArrivalRoute(key, zone);
    const mouth = path.map((p, i) => [p, i]).filter(([p]) => inMouth(p));
    assert.ok(mouth.length > 0, 'route passes through the #61 mouth window');
    assert.ok(Math.min(...path.map(p => d(p, e))) < 30, 'within #61 operator reach');
    assert.ok(!path.some(p => d(p, e) < .5), 'never drives onto #61 median point');
    // Entrance side: no mouth vertex on the exit side of the median.
    for (const [p] of mouth) assert.ok(p[1] >= e[1], `mouth vertex ${p} on exit side`);
    // No reversal: consecutive heading changes inside the mouth stay under 120 deg.
    for (let i = 1; i < path.length - 1; i++) {
      if (!inMouth(path[i])) continue;
      const a = [path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]];
      const b = [path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]];
      const la = Math.hypot(...a), lb = Math.hypot(...b);
      if (la < 1e-6 || lb < 1e-6) continue;
      const cos = (a[0] * b[0] + a[1] * b[1]) / (la * lb);
      assert.ok(cos > Math.cos(120 * Math.PI / 180), `reversal at ${path[i]}`);
    }
  });
}