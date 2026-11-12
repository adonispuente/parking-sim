import {createCampusTraffic} from '../src/traffic.js';
import {serviceOptions} from '../src/sundayServices.js';
const preset=serviceOptions('eleven');
const s=createCampusTraffic({service:{enabled:true,...preset},initialOccupancy:preset.initialOccupancy,shuttles:{activeCount:5,randomDwell:true}});
const metrics={releaseFrames:0,heldFrames:0,clearingFrames:0,backupFrames:0,maxHeld:0};
const start=performance.now();
for(let i=0;i<48000;i++){
  s.step(.05);
  const r=s.northernRadio;
  if(r.releaseBuses.length)metrics.releaseFrames++;
  if(r.heldCars)metrics.heldFrames++;
  if(r.clearingCars)metrics.clearingFrames++;
  if(r.clayBackedUp)metrics.backupFrames++;
  metrics.maxHeld=Math.max(metrics.maxHeld,r.heldCars);
}
console.log(JSON.stringify({seconds:s.clock,cpuMs:performance.now()-start,entered:s.entered,departed:s.departed,
  active:s.cars.length,issues:s.routingIssues,metrics,diverted:s.northernRadio.diverted,
  cCarAccess:[...new Set([...s.cars,...s.parkedVehicles].filter(c=>c.target==='c'&&!c.fleetBus).map(c=>c.access))],
  trips:s.shuttles.map(b=>b.trips),radioPositions:s.parkingRadio.positions.length,
  radio:s.northernRadio,held:s.cars.filter(c=>c.holdForNorthern||c.fleetBus||s.northernRadio.clearingIds.includes(c.id)).map(c=>({id:c.id,lane:s.lanes[c.lane].name,distance:c.distance,stop:c.northernStopDistance,wait:c.yieldReason,to:c.yieldingTo,point:s.lanes[c.lane].path.getPointAt(c.distance/s.lanes[c.lane].length)}))},null,2));