import test from 'node:test';
import assert from 'node:assert/strict';
import annotation from '../images/HopeCityLayoutVectors.json' with { type: 'json' };
import { inPolygon, onStreet } from '../src/pavementRouting.js';
import { ROUTE_METADATA, STREET_SECTIONS, VECTOR_ROUTES } from '../src/vectorRoutes.js';

const ring = label => annotation.shapes.find(shape => shape.label === label).points;
const near = (a,b,tolerance=3) => Math.hypot(a[0]-b[0],a[1]-b[1]) <= tolerance;
const segmentOnStreet = (a,b) => {
  const samples = Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1]) / .25);
  for (let i=0;i<=samples;i++) {
    const t=i/samples;
    if (!onStreet([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])) return false;
  }
  return true;
};

test('two labeled Equity entrances are distinct inbound origins', () => {
  const { west, south } = ROUTE_METADATA.equityOrigins;
  assert.ok(inPolygon(west[0],ring('Equity Entrance')));
  assert.ok(inPolygon(south[0],ring('Equity Entrance & exit 2')));
  assert.ok(onStreet(south[0]), 'the second access is routable pavement');
  assert.ok(Math.hypot(west[0][0]-south[0][0],west[0][1]-south[0][1]) > 400);
  assert.equal(ROUTE_METADATA.arrivalOrigin.eCWest,'west');
  assert.equal(ROUTE_METADATA.arrivalOrigin.e2CWest,'south');
  assert.ok(near(VECTOR_ROUTES.arrival.eCWest[0],west[0]));
  assert.ok(near(VECTOR_ROUTES.arrival.e2CWest[0],south[0]));
});

test('both Equity C routes follow pavement then the staffed west entrance, not an exit', () => {
  for (const key of ['eCWest','e2CWest']) {
    const path = VECTOR_ROUTES.arrival[key];
    const streetCount = STREET_SECTIONS.arrival[key];
    assert.equal(ROUTE_METADATA.arrivalAccess[key],'cWest');
    assert.ok(streetCount > 3,`${key} has a street section`);
    for (let i=1;i<streetCount;i++) {
      assert.ok(segmentOnStreet(path[i-1],path[i]),`${key} street segment ${i} stays on labeled pavement`);
    }
    assert.ok(path.slice(0,streetCount).some(([x,y])=>inPolygon([x,y],ring('Equity Drive')) && x > 600 && y > 500),`${key} traverses Equity Drive`);
    assert.ok(near(path[streetCount-1],ROUTE_METADATA.cStaffedEntrance[0],3),`${key} joins the first C entrance station`);
    // Grid endpoint is near, not identical to, the first exact throat station.
    // join may retain that first station before the middle station.
    let cursor=streetCount-1;
    for(const station of ROUTE_METADATA.cStaffedEntrance) {
      const found=path.findIndex((p,index)=>index>=cursor&&near(p,station,.25));
      assert.ok(found>=0,`${key} follows each C entrance station in order`);
      cursor=found+1;
    }
    assert.ok(near(path.at(-1),ROUTE_METADATA.cStaffedEntrance.at(-1),.25));
  }
  assert.ok(VECTOR_ROUTES.arrival.eA && VECTOR_ROUTES.arrival.eB && VECTOR_ROUTES.arrival.eCEast,'legacy route keys remain available');
});
