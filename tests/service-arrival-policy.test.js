import test from 'node:test';
import assert from 'node:assert/strict';
import annotation from '../images/HopeCityLayoutVectors.json' with { type: 'json' };
import { inPolygon, onStreet } from '../src/pavementRouting.js';
import { ROUTE_METADATA, STREET_SECTIONS, VECTOR_ROUTES } from '../src/vectorRoutes.js';
import { selectArrivalAccess } from '../src/trafficPolicy.js';
import { serviceArrivalPriorities } from '../src/sundayServices.js';

const ring = label => annotation.shapes.find(shape => shape.label === label).points;
const near = (a,b,tolerance=.25) => Math.hypot(a[0]-b[0],a[1]-b[1]) <= tolerance;
const chooseAvailable = (priorities, available) => priorities.find(lot => available.includes(lot));

test('1:15 Equity uses B then C only as fallback; older services and manual keep staffed C', () => {
  for (const source of [1,2]) {
    const priorities = serviceArrivalPriorities('final',source,'general');
    assert.deepEqual(priorities,['b','c']);
    assert.equal(chooseAvailable(priorities,['a','b','c']),'b');
    assert.equal(chooseAvailable(priorities,['a','c']),'c');
    for (const service of ['nine','eleven',undefined]) {
      assert.deepEqual(serviceArrivalPriorities(service,source,'general'),['c']);
      assert.equal(chooseAvailable(serviceArrivalPriorities(service,source,'general'),['a','b','c']),'c');
    }
    assert.deepEqual(selectArrivalAccess({target:'c',source}),{
      access:'cWest',route:source===1?'eCWest':'e2CWest',
    });
  }
  assert.deepEqual(serviceArrivalPriorities('final',0,'general'),['a','b','c']);
  assert.deepEqual(serviceArrivalPriorities('final',0,'corporate'),['b','c']);
  assert.deepEqual(serviceArrivalPriorities('final',0,'serve-team'),['b']);
  assert.deepEqual(serviceArrivalPriorities('eleven',0,'general',{0:['b','a']}),['b','a']);
});

test('both Equity origins reach B through labeled main entrance on street pavement', () => {
  const entrance = ring('Lot B entrance');
  for (const [source,key,origin] of [[1,'eBMain','west'],[2,'e2BMain','south']]) {
    assert.deepEqual(selectArrivalAccess({target:'b',source}),{access:'bWest',route:key});
    assert.equal(ROUTE_METADATA.arrivalOrigin[key],origin);
    assert.equal(ROUTE_METADATA.arrivalAccess[key],'bWest');
    const path=VECTOR_ROUTES.arrival[key],streetCount=STREET_SECTIONS.arrival[key];
    assert.ok(streetCount>3);
    assert.ok(near(path[0],ROUTE_METADATA.equityOrigins[origin][0],3));
    for(let i=1;i<streetCount;i++) {
      const [a,b]=[path[i-1],path[i]];
      const segments=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.25);
      for(let j=0;j<=segments;j++) {
        const t=j/segments;
        assert.ok(onStreet([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]),`${key} street segment ${i}`);
      }
    }
    assert.ok(inPolygon(path.at(-1),entrance),`${key} ends in labeled B entrance`);
    assert.ok(near(path.at(-1),VECTOR_ROUTES.arrival.bWest.at(-1)));
  }
});
