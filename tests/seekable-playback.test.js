import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSeekablePlayback, PLAYBACK_SPEEDS } from '../src/playback.js';
import { createCampusTraffic, createTenCarDemo } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';

const immediate = async () => {};
// Private closure state deliberately cannot be restored by copying public fields.
function counter() {
  let serial = 0;
  return { clock: 0, events: [], step(dt, rates) {
    this.clock += dt; this.events.push(++serial * (rates?.[0] ?? 1));
  }};
}
const inputs = { rates: [2,0,0], phase:'arrival', lots: [] };
test('UI speed contract has matching reverse/forward speeds, initially 5; elapsed timeline removed', () => {
  assert.deepEqual(PLAYBACK_SPEEDS, [-30,-20,-10,-5,5,10,20,30]);
  const ui = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(ui, /playbackSpeed,setPlaybackSpeed\]=useState\(5\)/);
  assert.match(ui, /PLAYBACK_SPEEDS.map/);
  assert.doesNotMatch(ui, /aria-label="Simulation timeline"/);
});
test('fixed live ticks and rewind-forward replay preserve private state exactly', async () => {
  const player = createSeekablePlayback(counter, inputs, { yieldWork: immediate });
  for (let i=0;i<60;i++) player.advance(1/60,5);
  assert.equal(player.clock,5);
  const reference = structuredClone({ clock:player.simulation.clock,events:player.simulation.events });
  await player.seek(1);
  assert.equal(player.simulation.events.length,20);
  await player.seek(5);
  assert.deepEqual({clock:player.simulation.clock,events:player.simulation.events},reference);
  player.advance(.1,5);
  assert.equal(player.simulation.events.at(-1),220);
});
test('live input changes invalidate history; caller mutation cannot change frozen inputs', async () => {
  const original=structuredClone(inputs);
  const player=createSeekablePlayback(counter,original,{yieldWork:immediate});
  original.rates[0]=999;
  await player.seek(.1);
  assert.deepEqual(player.simulation.events,[2,4]);
  assert.equal(player.setInputs(structuredClone(inputs)),false);
  assert.equal(player.setInputs({...inputs,rates:[3,0,0]}),true);
  assert.equal(player.clock,0);
  player.advance(.01,5);
  assert.deepEqual(player.simulation.events,[3]);
});
test('latest seek wins; cancellation never publishes partial reconstructed state', async () => {
  const pending=[];
  const player=createSeekablePlayback(counter,inputs,{yieldWork:()=>new Promise(r=>pending.push(r)),chunkSteps:1});
  const first=player.seek(20);
  const second=player.seek(0);
  pending.shift()();
  assert.equal(await first,false);
  pending.shift()();
  assert.equal(await second,true);
  assert.equal(player.clock,0);
  const canceled=player.seek(10);
  player.cancel();pending.shift()();
  assert.equal(await canceled,false);
  assert.equal(player.clock,0);
  assert.equal(player.seeking,false);
});
test('seek validates targets and chunk-yields with progress',async()=>{
  let yields=0;const progress=[];
  const player=createSeekablePlayback(counter,inputs,{chunkSteps:2,yieldWork:async()=>{yields++;}});
  await assert.rejects(player.seek(NaN),/finite/);
  await player.seek(-10);
  assert.equal(player.clock,0);
  await player.seek(.25,p=>progress.push(p));
  assert.ok(yields>=4);
  assert.equal(progress.at(-1).seeking,false);
  assert.equal(player.clock,.25);
});

test('zero-time reconstruction applies live controls without advancing the clock',async()=>{
  const factory=()=>({phase:'arrival',clock:0,setPhase(value){this.phase=value;},step(dt){this.clock+=dt;}});
  const player=createSeekablePlayback(factory,{phase:'departure'},{yieldWork:immediate});
  assert.equal(player.simulation.phase,'departure');
  player.setInputs({phase:'mixed'});
  assert.equal(player.simulation.phase,'mixed');
  await player.seek(0);
  assert.equal(player.simulation.phase,'mixed');
  assert.equal(player.simulation.clock,0);
});

test('speed and frame partition change pace, not the sequence of traffic ticks',()=>{
  const players=PLAYBACK_SPEEDS.filter(speed=>speed>0).map(speed=>{
    const player=createSeekablePlayback(counter,inputs,{yieldWork:immediate});
    for(let i=0;i<600/speed;i++)player.advance(.1,speed);
    return player;
  });
  assert.ok(players.every(player=>player.clock===60));
  for(const player of players)assert.deepEqual(player.simulation.events,players[0].simulation.events);
});

test('cancellation during chunking discards partial work and preserves visible state',async()=>{
  const pending=[];
  const player=createSeekablePlayback(counter,inputs,{chunkSteps:2,yieldWork:()=>new Promise(r=>pending.push(r))});
  player.advance(.1,5);
  const visible=player.simulation;
  const seek=player.seek(20);
  pending.shift()();
  await Promise.resolve(); // reconstruction advanced one private chunk, then yielded
  assert.equal(player.simulation,visible);
  player.setInputs({...inputs,rates:[3,0,0]});
  pending.shift()();
  assert.equal(await seek,false);
  assert.equal(player.clock,0);
  assert.deepEqual(player.simulation.events,[]);
});

function digest(s) {
  return JSON.parse(JSON.stringify({clock:s.clock,cars:s.cars,entered:s.entered,exited:s.exited,
    waiting:s.waiting,reserved:s.reserved,occupancy:s.zoneOccupancy,parked:s.parkedVehicles,
    shuttles:s.shuttles,gate:s.aMainControl,feeder:s.feederOfficer,corporate:s.corporateOperators,
    service:s.serviceStatus,routeHistory:s.routeHistory}));
}
test('real demo replay restores queues, reservations, cars and parked records',async()=>{
  const player=createSeekablePlayback(()=>createTenCarDemo(),{rates:[0,0,0]}, {yieldWork:immediate});
  await player.seek(90);const reference=digest(player.simulation);
  await player.seek(12);await player.seek(90);
  assert.deepEqual(digest(player.simulation),reference);
  assert.equal(player.simulation.entered.reduce((a,b)=>a+b,0),10);
});
test('real service replay preserves seeded shuttles, schedule and controller state',async()=>{
  const preset=serviceOptions('nine',{demand:20});
  const factory=()=>createCampusTraffic({service:{enabled:true,...preset},shuttles:{activeCount:3,randomDwell:true}});
  const player=createSeekablePlayback(factory,{rates:[0,0,0]}, {yieldWork:immediate});
  // Compare fixed live stepping to seek, not two replays alone.
  for(let i=0;i<600;i++)player.advance(.1,5);
  const reference=digest(player.simulation);
  await player.seek(0);await player.seek(300);
  assert.deepEqual(digest(player.simulation),reference);
});

for(const id of ['eleven','final'])test(`${id} transition replay preserves departure IDs, gates and initial occupancy`,async()=>{
  const preset=serviceOptions(id,{demand:20});
  const origin={initialOccupancy:preset.initialOccupancy,service:{enabled:true,...preset},shuttles:{activeCount:5,randomDwell:true}};
  const player=createSeekablePlayback(()=>createCampusTraffic(structuredClone(origin)),{rates:[0,0,0]}, {yieldWork:immediate});
  for(let i=0;i<240;i++)player.advance(.1,5);
  const reference=digest(player.simulation);
  await player.seek(5);await player.seek(120);
  assert.deepEqual(digest(player.simulation),reference);
  assert.ok(player.simulation.cars.some(car=>car.phase==='departing'));
});
test('30× advances thirty simulated seconds per real second without enlarging fixed ticks', () => {
  const playback=createSeekablePlayback(counter,{rates:[0,0,0],options:{gain:1}});
  for(let i=0;i<60;i++)playback.advance(1/60,30);
  assert.ok(Math.abs(playback.clock-30)<1e-8);
  assert.equal(playback.simulation.events.length,600);
});
