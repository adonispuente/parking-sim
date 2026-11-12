import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSeekablePlayback } from '../src/playback.js';
import { captureTrafficFrame } from '../src/playbackFrames.js';
import { createCampusTraffic } from '../src/traffic.js';

const immediate = async () => {};
function fixture() {
  let factories = 0;
  const factory = () => {
    factories++;
    let privateCount = 0;
    return { clock: 0, cars: [], step(dt) {
      assert.ok(dt > 0); this.clock += dt;
      this.cars = [{ id: 1, distance: ++privateCount }];
    }};
  };
  const player = createSeekablePlayback(factory, {}, { captureFrame: captureTrafficFrame, yieldWork: immediate });
  return { player, factories: () => factories };
}
test('recorded reverse updates earlier cars immediately without any reconstruction', () => {
  const { player: p, factories } = fixture();
  for (let i = 0; i < 100; i++) p.advance(.1, 5);
  const latest = p.simulation.cars[0].distance;
  for (let i = 0; i < 10; i++) {
    assert.equal(p.advance(.1, -5), undefined);
    assert.equal(p.seeking, false);
  }
  assert.equal(p.clock, 45); assert.equal(p.simulation.cars[0].distance, latest - 100);
  assert.equal(factories(), 1);
  const paused = p.simulation;
  p.cancel(); assert.equal(p.simulation, paused);
});
test('forward resumption restores private state once, then advances identically', async () => {
  const { player: p, factories } = fixture();
  for (let i = 0; i < 100; i++) p.advance(.1, 5);
  p.advance(.1, -30);
  assert.equal(p.clock, 47);
  await p.advance(.1, 5);
  assert.equal(factories(), 2);
  assert.equal(p.simulation.cars[0].distance, 940);
  p.advance(.1, 5);
  assert.equal(p.simulation.cars[0].distance, 950);
});
test('history bounds, old-history refill, zero and input invalidation', async () => {
  const p = createSeekablePlayback(() => ({ clock: 0, cars: [], step(dt) { this.clock += dt; } }), {},
    { captureFrame: captureTrafficFrame, yieldWork: immediate, maxFrames: 8, maxHistoryBytes: 1024 });
  for (let i = 0; i < 100; i++) p.advance(.1, 30);
  assert.ok(p.historyInfo.frames <= 8); assert.ok(p.historyInfo.bytes <= 1024);
  await p.advance(.1, -30);
  assert.ok(p.clock < 300); assert.ok(p.historyInfo.frames <= 8);
  await p.seek(0); p.advance(.1, -30);
  assert.equal(p.clock, 0);
  p.setInputs({ rates: [1, 0, 0] });
  assert.equal(p.clock, 0); assert.equal(p.historyInfo.frames, 1);
});
test('real traffic recorded rewind restores car poses/counts and deterministic forward state', async () => {
  const options = { shuttles: { activeCount: 0 }, badgePercent: 5 };
  const p = createSeekablePlayback(() => createCampusTraffic(options), { rates: [18, 18, 0] },
    { captureFrame: captureTrafficFrame, yieldWork: immediate });
  for (let i = 0; i < 120; i++) p.advance(.1, 5);
  const reference = captureTrafficFrame(p.simulation);
  p.advance(.1, -30);
  assert.equal(p.clock, 57); assert.ok(p.simulation.clock < reference.clock);
  assert.notDeepEqual(p.simulation.cars, reference.cars);
  await p.advance(.1, 5);
  for (let i = 0; i < 6; i++) p.advance(.1, 5);
  assert.deepEqual(captureTrafficFrame(p.simulation), reference);
});
test('Operations mounts compact parked counts and retires requested sections/presets', () => {
  const ui = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const sunday = readFileSync(new URL('../src/SundayControls.jsx', import.meta.url), 'utf8');
  assert.match(ui, /badgePercent:5/);
  assert.doesNotMatch(ui, /<ParkingSectionControls|<VolunteerControls|Badge vehicles \(%\)|\['Empty lots'|\['A full'|\['A \+ B full'/);
  assert.match(sunday, /aria-label="Current parked cars"/);
  assert.match(sunday, /stats\.occupancy\?\.\[lot\]/);
});