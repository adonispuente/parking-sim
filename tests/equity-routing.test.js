import test from 'node:test';
import assert from 'node:assert/strict';
// Current source frame only (images/EverythingClearImage.json, 1374 x 1118). The old
// HopeCityLayoutVectors.json is a different 735 x 566 frame and cannot be compared.
import { shapeAt } from '../src/clearImageSource.js';
import { inPolygon, onStreet } from '../src/pavementRouting.js';
import { onDrivable, isDisclosedUntraced, untracedGapPoints } from '../src/sourceRouting.js';
import { ROUTE_METADATA, STREET_SECTIONS, VECTOR_ROUTES } from '../src/vectorRoutes.js';

const FEEDER_ROAD = 54, EQUITY_DRIVE = 55, CORPORATE_DRIVE = 56;
const ring = index => {
  const shape = shapeAt(index);
  assert.equal(shape.shape_type, 'polygon', `source #${index} is a polygon`);
  return shape.points;
};
assert.equal(shapeAt(FEEDER_ROAD).label, 'Feeder Road');
assert.equal(shapeAt(EQUITY_DRIVE).label, 'Equity Drive');
assert.equal(shapeAt(CORPORATE_DRIVE).label, 'Corporate Drive');
const near = (a,b,tolerance=3) => Math.hypot(a[0]-b[0],a[1]-b[1]) <= tolerance;
const segmentOnStreet = (a,b) => {
  const samples = Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1]) / .25);
  for (let i=0;i<=samples;i++) {
    const t=i/samples;
    if (!onStreet([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])) return false;
  }
  return true;
};
// A segment leaving a DISCLOSED untraced gap point may start off pavement, but it
// must reach pavement within the segment and never leave it again.
const segmentFromGapReachesStreet = (a,b) => {
  const samples = Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1]) / .25);
  let reached=false;
  for (let i=0;i<=samples;i++) {
    const t=i/samples,on=onStreet([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    if (on) reached=true; else if (reached) return false;
  }
  return reached;
};

test('two labeled Equity entrances are distinct inbound origins', () => {
  const { west, south } = ROUTE_METADATA.equityOrigins;
  // West: on traced Feeder Road pavement, entering Equity Drive at the next point.
  assert.ok(inPolygon(west[0],ring(FEEDER_ROAD)),'west origin is on Feeder Road #54');
  assert.ok(onStreet(west[0]),'west origin is routable pavement');
  assert.ok(inPolygon(west[1],ring(EQUITY_DRIVE)),'west route enters Equity Drive #55 at its second point');
  // South: the Equity entrance/exit 2 driveway is the Commander-drawn S5 patch
  // pave:equity-exit2-driveway. Its origin is now drivable pavement, no longer a
  // disclosed gap, and it enters Equity Drive next.
  assert.ok(!isDisclosedUntraced(south[0]),'exit 2 driveway is no longer a disclosed gap');
  assert.ok(untracedGapPoints('equity-exit2-driveway').some(p=>near(p,south[0],.001)),'historical reference point retained');
  assert.ok(onDrivable(south[0]),'south origin lies on the S5 exit 2 driveway pavement');
  assert.ok(inPolygon(south[1],ring(EQUITY_DRIVE)),'south route enters Equity Drive #55 at its second point');
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
      if (i===1 && isDisclosedUntraced(path[0])) assert.ok(segmentFromGapReachesStreet(path[0],path[1]),`${key} leaves the disclosed gap onto pavement and stays on it`);
      else assert.ok(segmentOnStreet(path[i-1],path[i]),`${key} street segment ${i} stays on labeled pavement`);
    }
    // Every street point between the origin and the C entrance join lies inside
    // Equity Drive #55 (current frame), and the drive is actually traversed.
    const inner = path.slice(1,streetCount-1);
    assert.ok(inner.length >= 6,`${key} has at least 6 interior street points`);
    for (const [i,p] of inner.entries()) assert.ok(inPolygon(p,ring(EQUITY_DRIVE)),`${key} street point ${i+1} is inside Equity Drive #55`);
    assert.ok(Math.abs(inner.at(-1)[0]-inner[0][0]) > 150,`${key} traverses Equity Drive, not just touches it`);
    // The street section ends on Corporate Drive #56; the very next point is the first C
    // entrance station (#63) exactly, via the disclosed staffed-entrance throat join
    // (measured 14.6 px eCWest / 16.7 px e2CWest; bounded at 20 px).
    const station=ROUTE_METADATA.cStaffedEntrance[0];
    assert.ok(inPolygon(path[streetCount-1],ring(CORPORATE_DRIVE)),`${key} street section ends on Corporate Drive #56`);
    assert.ok(near(path[streetCount],station,.001),`${key} joins the first C entrance station at the next point`);
    assert.ok(near(path[streetCount-1],station,20),`${key} throat join to the C entrance is short`);
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
