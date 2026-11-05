import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic, createTenCarDemo } from '../src/traffic.js';

const advance=(state,seconds,rates=[0,0,0])=>{
  for(let i=0;i<seconds*10;i++)state.step(.1,rates);
};
const sum=record=>Object.values(record).reduce((a,b)=>a+b,0);

test('arrival demo parks all ten and retains them well beyond the former dwell timer',()=>{
  const state=createTenCarDemo();
  advance(state,600);
  assert.equal(sum(state.occupancy),10);
  assert.equal(state.parkedVehicles.length,10);
  assert.equal(state.cars.length,0);
  assert.equal(sum(state.departed),0);
  assert.equal(state.occupancy.a,7);
  assert.equal(state.occupancy.c,3);
  const history=state.routeHistory.filter(car=>car.source>0);
  assert.equal(history.length,3);
  assert.ok(history.every(car=>car.target==='c'&&car.access==='cWest'));
});

test('explicit departure phase releases retained cars without resetting or teleporting',()=>{
  const state=createTenCarDemo();advance(state,240);
  const endpoints=new Map(state.parkedVehicles.map(car=>[car.id,state.lanes[car.lane].path.getPointAt(1)]));
  state.setPhase('departure');state.step(.1);
  for(const car of state.cars) {
    assert.equal(car.phase,'departing');
    assert.ok(state.lanes[car.lane].path.getPointAt(0).distanceTo(endpoints.get(car.id))<.001);
  }
  advance(state,400);
  assert.equal(sum(state.departed),10);
  assert.equal(sum(state.occupancy),0);
  assert.equal(state.parkedVehicles.length,0);
});

test('each Equity origin assigns C via its staffed entrance even when A has room',()=>{
  for(const source of [1,2]) {
    const state=createCampusTraffic();state.waiting[source]=1;advance(state,180);
    assert.equal(state.occupancy.c,1);
    assert.equal(state.occupancy.a,0);
    assert.equal(state.routeHistory[0].access,'cWest');
    assert.match(state.routeHistory[0].arrivalRoute,source===1?/Equity Entrance → C/:/Equity entrance\/exit 2 → C/);
  }
});

test('feeder spills into B then C while Equity never enters through a C exit',()=>{
  for(const [initialOccupancy,target] of [[{a:411},'b'],[{a:411,b:487},'c']]) {
    const state=createCampusTraffic({initialOccupancy});state.waiting[0]=1;advance(state,200);
    assert.equal(state.routeHistory[0].target,target);
    assert.equal(state.routeHistory[0].access,target==='b'?'bWest':'cWest');
  }
});

test('full campus sends all new arrivals away without queues or overflow parking',()=>{
  const state=createCampusTraffic({initialOccupancy:{a:411,b:487,c:686}});
  advance(state,60,[60,60,60]);
  assert.equal(state.atCapacity,true);
  assert.equal(sum(state.occupancy),1584);
  assert.ok(state.sentAway>=177);
  assert.equal(sum(state.waiting),0);
  assert.equal(state.cars.length,0);
  assert.equal(state.routeHistory.length,0);
});

test('C full alone holds Equity upstream instead of inventing a fallback',()=>{
  const state=createCampusTraffic({initialOccupancy:{c:686}});
  state.waiting[1]=1;state.waiting[2]=1;advance(state,10);
  assert.deepEqual(state.waiting,[0,1,1]);
  assert.equal(state.sentAway,0);
  assert.equal(state.atCapacity,false);
  assert.equal(state.routeHistory.length,0);
});

test('capacity reservations prevent overbooking and remaining arrivals are sent away',()=>{
  const state=createCampusTraffic({initialOccupancy:{a:411,b:487,c:685}});
  state.waiting=[1,1,1];advance(state,200);
  assert.equal(state.occupancy.c,686);
  assert.equal(sum(state.reserved),0);
  assert.equal(state.sentAway,2);
  assert.equal(sum(state.waiting),0);
  assert.equal(state.routeHistory.length,1);
});
