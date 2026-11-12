// Equity entrance/exit 2 driveway is two-way width (Commander, 2026-11-07).
// Arrivals spawn and departures leave at its south end ~(1032.6,1105.7); the
// traced chord to Equity Drive lies outside every mapped polygon for ~30 px, so
// before this change both directions shared one centreline and deadlocked
// head-on (eleven 700/1029/750; research/claudy-equity-c-diagnosis-2026-11-07.md).
// These tests build lanes the way src/traffic.js lane() does (keepRight on the
// vectorToTrace coordinates) and check opposing separation on the driveway.
import test from 'node:test';
import assert from 'node:assert/strict';
import { keepRight, KEEP_RIGHT_PX, EQUITY_EXIT2_CONNECTOR, onEquityExit2Connector } from '../src/traffic.js';
import { vectorToTrace } from '../src/vectorRoutes.js';
import { zoneArrivalRoute, zoneDepartureRoute } from '../src/parkingRoutes.js';
import { onStreet } from '../src/pavementRouting.js';
import { avoidsObstacles } from '../src/sourceRouting.js';
import { WORLD_SCALE } from '../src/clearImageSource.js';

const CONFLICT_PX = 0.9 / WORLD_SCALE;
const dense = (pts, step = 1) => { const o = [pts[0]]; for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return o; };
const built = raw => keepRight(raw.map(vectorToTrace), KEEP_RIGHT_PX, null);
const rawTrace = raw => raw.map(vectorToTrace);
const arrivals = { 'e2CWest cFirstSouth': () => zoneArrivalRoute('e2CWest', 'cFirstSouth'), 'e2CWest cFirstNorth': () => zoneArrivalRoute('e2CWest', 'cFirstNorth') };
const departures = { 'bNorth bNorth': () => zoneDepartureRoute('bNorth', 'bNorth'), 'cWest cFirstNorth': () => zoneDepartureRoute('cWest', 'cFirstNorth'), 'cEast cFirstSouth': () => zoneDepartureRoute('cEast', 'cFirstSouth') };
const minSepInConnector = (A, D) => { let best = Infinity; for (const p of A) { if (!onEquityExit2Connector(p)) continue; for (const q of D) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1])); } return best; };

test('connector box covers the unmapped driveway stretch only', () => {
  assert.equal(EQUITY_EXIT2_CONNECTOR.length, 4);
  for (const p of [[1032.6, 1105.7], [1033.5, 1098], [1035, 1090], [1037, 1083]]) {
    assert.ok(onEquityExit2Connector(p), `${p} inside`);
    assert.equal(onStreet(p), false, `${p} is unmapped`);
  }
});

test('control: un-offset traces meet head-on on the driveway', () => {
  const sep = minSepInConnector(dense(rawTrace(arrivals['e2CWest cFirstSouth']())), dense(rawTrace(departures['bNorth bNorth']())));
  assert.ok(sep < CONFLICT_PX, `raw separation ${sep.toFixed(2)} px should be under ${CONFLICT_PX.toFixed(2)}`);
});

for (const [an, af] of Object.entries(arrivals)) for (const [dn, df] of Object.entries(departures)) {
  test(`built ${an} arrival clears ${dn} departure on the driveway`, () => {
    const A = dense(built(af())), D = dense(built(df()));
    assert.ok(A.some(onEquityExit2Connector), 'arrival uses the driveway');
    assert.ok(D.some(onEquityExit2Connector), 'departure uses the driveway');
    const sep = minSepInConnector(A, D);
    assert.ok(sep >= CONFLICT_PX, `separation ${sep.toFixed(2)} px (${(sep * WORLD_SCALE).toFixed(3)} world) must be >= 0.9 world`);
  });
}

test('built driveway points stay inside the connector or on street and avoid obstacles', () => {
  for (const f of [...Object.values(arrivals), ...Object.values(departures)]) for (const p of built(f())) {
    if (!onEquityExit2Connector(p) && !(Math.abs(p[0] - 1033) < 20 && p[1] > 1060)) continue;
    assert.ok(onEquityExit2Connector(p) || onStreet(p), `${p} drivable`);
    assert.ok(avoidsObstacles(p), `${p} clear of obstacles`);
  }
});
