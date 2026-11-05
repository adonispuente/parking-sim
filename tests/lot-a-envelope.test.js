import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLayout, validateLayout } from '../src/model.js';
import { upgradeLotAParking } from '../src/lotAParking.js';

function inside([x,y], polygon) {
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [a,b]=polygon[i], [c,d]=polygon[j];
    if((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) result=!result;
  }
  return result;
}
test('photo boundary contains entire east apron and matches pavement coordinates',()=>{
  const layout=initialLayout();
  const lot=layout.items.find(i=>i.id==='lot-a');
  const pavement=layout.items.find(i=>i.id==='a-pavement');
  const building=layout.items.find(i=>i.id==='church');
  assert.deepEqual(lot.points,pavement.points);
  assert.equal(lot.rotation,0);
  const polygon=lot.points.map(([x,z])=>[x+lot.x,z+lot.z]);
  const apron=building.masses.find(m=>m.surface==='parking');
  for(let i=0;i<apron.points.length;i++) {
    const a=apron.points[i], b=apron.points[(i+1)%apron.points.length];
    for(let t=0;t<=1;t+=.1) assert.ok(inside([building.x+a[0]+(b[0]-a[0])*t,building.z+a[1]+(b[1]-a[1])*t],polygon));
  }
  assert.deepEqual(validateLayout(layout),layout);
});
test('revision one boundary migration retains building, custom rows and lot state',()=>{
  const old=initialLayout(); old.lotAParkingRevision=1;
  old.items.find(i=>i.id==='lot-a').open=false;
  const church=structuredClone(old.items.find(i=>i.id==='church'));
  const row=old.items.find(i=>i.type==='spaces'); row.count=4;
  const next=upgradeLotAParking(old);
  assert.deepEqual(next.items.find(i=>i.id==='church'),church);
  assert.equal(next.items.find(i=>i.id===row.id).count,4);
  assert.equal(next.items.find(i=>i.id==='lot-a').open,false);
  assert.equal(upgradeLotAParking(next),next);
});
