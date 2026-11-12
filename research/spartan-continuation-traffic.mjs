// Post-change same-map feature comparison; not older-map baseline reruns.
import { createCampusTraffic } from '../src/traffic.js';
import { serviceOptions } from '../src/sundayServices.js';
import { fromWorld } from '../src/clearImageSource.js';
for(const mode of process.argv[2]?[process.argv[2]]:['enabled','disabled'])for(const id of ['nine','eleven','final']) {
  const config=serviceOptions(id);
  const s=createCampusTraffic({initialOccupancy:config.initialOccupancy,service:{enabled:true,...config},
    alphaQueueRelief:{enabled:mode!=='disabled'},shuttles:{activeCount:config.activeBuses,dwellSeconds:3}});
  const still=new Map(),start=Date.now();
  for(let i=0;i<72000;i++) {
    s.step(.1);
    for(const car of s.cars) {
      const prev=still.get(car.id);
      if(!prev||prev.lane!==car.lane||Math.abs(prev.distance-car.distance)>.05)
        still.set(car.id,{lane:car.lane,distance:car.distance,since:s.clock});
    }
  }
  const stalled=s.cars.filter(c=>s.clock-(still.get(c.id)?.since??s.clock)>=60).map(c=>{
    const l=s.lanes[c.lane],p=l.path.getPointAt(Math.min(1,c.distance/l.length));
    return {id:c.id,phase:c.phase,zone:c.zone,px:fromWorld([p.x,p.z]),yield:c.yieldReason,to:c.yieldingTo,route:l.name};
  });
  console.log(JSON.stringify({mode,scenario:id,wallMs:Date.now()-start,demand:config.demand,
    entered:s.entered.reduce((a,b)=>a+b,0),waiting:s.waiting.reduce((a,b)=>a+b,0),occupancy:s.occupancy,
    departed:s.departed,busTrips:s.shuttles.map(b=>b.trips),stalledCount:stalled.length,
    westStalls:stalled.filter(c=>c.px[0]>=440&&c.px[0]<=550&&c.px[1]>=320&&c.px[1]<=420).length,
    relief:s.alphaQueueRelief,issues:s.routingIssues,stalled:stalled.slice(0,16)}));
}