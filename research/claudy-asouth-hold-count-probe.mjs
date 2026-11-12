// CLAUDYBEAR 2026-11-07 READ-ONLY: same setup as spartan-continuation-traffic.mjs (enabled),
// counts Lot A Main batch holds per approach (distinct cars, held seconds) per service.
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';
for (const id of ['nine','eleven','final']) {
  const config = serviceOptions(id);
  const s = createCampusTraffic({initialOccupancy:config.initialOccupancy,service:{enabled:true,...config},
    alphaQueueRelief:{enabled:true},shuttles:{activeCount:config.activeBuses,dwellSeconds:3}});
  const cars = {}, secs = {}, first = {};
  for (let i = 0; i < 72000; i++) {
    s.step(.1);
    for (const car of s.cars) if (car.holdForBatch) {
      const ap = s.lanes[car.lane]?.aControl?.approach ?? '?';
      (cars[ap] ??= new Set()).add(car.id); secs[ap] = (secs[ap] ?? 0) + .1; first[ap] ??= +s.clock.toFixed(1);
    }
  }
  console.log(JSON.stringify({ scenario:id, heldCars:Object.fromEntries(Object.entries(cars).map(([k,v])=>[k,v.size])),
    heldSeconds:Object.fromEntries(Object.entries(secs).map(([k,v])=>[k,+v.toFixed(1)])), firstHeldAt:first }));
}
