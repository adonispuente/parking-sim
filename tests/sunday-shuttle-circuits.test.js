import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusTraffic } from '../src/traffic.js';
import { buildShuttleCircuits, internalPath, avoidsShuttleObstacles, SHUTTLE_STOPS } from '../src/shuttleRoutes.js';
import { streetPath, inPolygon, onStreet } from '../src/pavementRouting.js';
import annotation from '../images/HopeCityLayoutVectors.json' with { type:'json' };

const stop=id=>SHUTTLE_STOPS.find(item=>item.id===id).point;
const segmentSamples=points=>points.slice(1).flatMap((b,i)=>{
  const a=points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.5);
  return Array.from({length:n+1},(_,j)=>[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);
});

test('ordered B and C circuits include every pickup and home without crossing annotated obstacles',()=>{
  const circuits=buildShuttleCircuits();
  for(const [name,legs] of Object.entries(circuits)) {
    assert.deepEqual(legs[0].points[0],stop('home'));
    assert.deepEqual(legs.at(-1).points.at(-1),stop('home'));
    assert.deepEqual(legs.map(leg=>leg.stop),name==='b'
      ? ['bSouth','bNorth','home']:['cRoundabout',name,'home']);
    for(const leg of legs)for(const p of segmentSamples(leg.points))
      assert.ok(avoidsShuttleObstacles(p),`${name} obstacle at ${p}`);
  }
  const connector=internalPath('b',[305,267],[400,86]);
  for(const p of segmentSamples(connector))assert.ok(avoidsShuttleObstacles(p));
});

test('three active buses serve 2B/1C, retiring buses return home, and departure dispatch retains B',()=>{
  const s=createCampusTraffic({shuttles:{activeCount:3,dwellSeconds:1}});
  for(let i=0;i<5000;i++)s.step(.1);
  assert.equal(s.shuttles.length,5);
  assert.ok(s.shuttles.slice(0,2).every(bus=>bus.trips>0&&bus.visits>=bus.trips*2));
  assert.ok(s.shuttles[2].trips>0);
  assert.ok(s.shuttles.slice(3).every(bus=>bus.trips===0&&bus.phase==='home'));
  s.setShuttleConfig({activeCount:5});
  for(let i=0;i<500;i++)s.step(.1);
  s.setShuttleConfig({activeCount:3});
  for(let i=0;i<5000;i++)s.step(.1);
  assert.ok(s.shuttles.slice(3).every(bus=>bus.phase==='home'&&!s.cars.some(car=>car.id===bus.id)));
  const departing=createCampusTraffic({initialOccupancy:{b:487},phase:'departure',shuttles:{activeCount:5}});
  departing.step(.1);
  assert.equal(departing.shuttleDispatchMode,'four-b-one-c');
});

test('Corporate opposing bus centers clear on west, north and vertical cross sections',()=>{
  const corporate=annotation.shapes.find(shape=>shape.label==='Corporate Drive').points;
  const sections=[
    {name:'west horizontal',a:[110,286],b:[250,257],axis:0,at:175},
    {name:'north horizontal',a:[390,50],b:[620,50],axis:0,at:500},
    {name:'vertical S',a:[270,120],b:[270,205],axis:1,at:165},
  ];
  for(const {name,a,b,axis,at} of sections) {
    const outbound=streetPath(a,b),inbound=streetPath(b,a);
    const samples=[segmentSamples(outbound),segmentSamples(inbound)];
    for(const p of samples.flat())assert.ok(onStreet(p),`${name}: outside approved street at ${p}`);
    const crossing=points=>{
      const hits=points.filter(p=>Math.abs(p[axis]-at)<.3&&inPolygon(p,corporate));
      assert.ok(hits.length,`${name}: missing Corporate crossing`);
      return hits.reduce((sum,p)=>sum+p[1-axis],0)/hits.length;
    };
    const centers=samples.map(crossing);
    const separation=Math.abs(centers[0]-centers[1]);
    assert.ok(separation>=6,`${name}: ${separation.toFixed(2)}px opposing centers, need >=6px for 5.7px bus bodies`);
    assert.ok(axis===0 ? centers[0]>centers[1] : centers[0]<centers[1],
      `${name}: travel must keep right-hand side`);
    for(const center of centers)for(const side of [-1,1]) {
      const edge=[at,at];edge[1-axis]=center+side*2.85;
      assert.ok(inPolygon(edge,corporate),`${name}: bus half-width outside Corporate at ${edge}`);
    }
  }
});
