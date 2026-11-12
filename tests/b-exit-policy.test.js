import test from 'node:test';
import assert from 'node:assert/strict';
import { selectBDepartureAccess } from '../src/trafficPolicy.js';
import { createCampusTraffic } from '../src/traffic.js';

test('normal B directions split 304 North cars equally and send all South cars north',()=>{
  const state=createCampusTraffic({initialZoneOccupancy:{bNorth:304,bSouth:75},shuttles:{activeCount:0}});
  const north=state.parkedVehicles.filter(c=>c.zone==='bNorth');
  assert.equal(north.filter(c=>selectBDepartureAccess(c)==='bNorth').length,152);
  assert.equal(north.filter(c=>selectBDepartureAccess(c)==='bWest').length,152);
  assert.ok(state.parkedVehicles.filter(c=>c.zone==='bSouth').every(c=>selectBDepartureAccess(c)==='bNorth'));
  state.northernRadio.clayBackedUp=true;
  for(const car of state.parkedVehicles.filter(c=>c.zone==='bSouth'))assert.equal(state.northernDepartureAccess(car,'bNorth'),'bNorth','South keeps its north exit during radio diversions');
  state.northernRadio.clayBackedUp=false;
  state.setPhase('departure');state.step(.1);
  for(const c of state.cars)assert.equal(c.access,selectBDepartureAccess(c));
});
test('manual exit overrides remain explicit; Banana and Pocket keep their normal exits',()=>{
  assert.equal(selectBDepartureAccess({zone:'bBanana'}),'bWest');
  assert.equal(selectBDepartureAccess({zone:'bPocket'}),'bNorth');
  for(const zone of ['bSouth','bNorth','bBanana','bPocket']) {
    assert.equal(selectBDepartureAccess({zone},'west'),'bWest');
    assert.equal(selectBDepartureAccess({zone},'north'),'bNorth');
  }
});
