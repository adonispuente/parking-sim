import { createCampusTraffic } from '../../src/traffic.js';
import { SUNDAY_SERVICES, NEXT_SERVICE, serviceOptions, formatServiceClock } from '../../src/sundayServices.js';
import { serviceCarryOptions } from '../../src/serviceCarry.js';
const first=process.argv[2]||'nine';
const s0=SUNDAY_SERVICES[first];
let options={initialOccupancy:{...s0.initialOccupancy},badgePercent:5,phase:'arrival',service:{enabled:true,...serviceOptions(first)},zonePreferences:{a:'auto',b:'auto',c:'auto'},
  shuttles:{enabled:true,activeCount:s0.activeBuses,bFullPercent:100,randomDwell:true,dwellSeconds:45,cDirection:'auto',bStop:'circuit',dispatchMode:'demand',dispatchDuringDepartures:s0.transition}};
const lots=['a','b','c'].map(id=>({id:`lot-${id}`,open:true}));
let s=createCampusTraffic(structuredClone(options)),last=null,maxOcc={a:0,b:0,c:0};
const log=(...a)=>console.log(...a);
log('start',options.service.id,formatServiceClock(s.serviceStatus.minute),JSON.stringify(s.occupancy));
for(let t=0;t<20*60*400;t++){
  s.step(.05,[18,18,0],lots);
  if(t%1200===0)for(const k of 'abc')maxOcc[k]=Math.max(maxOcc[k],s.occupancy[k]);
  if(t%12000===0)log(' ',s.serviceStatus.id,formatServiceClock(s.serviceStatus.minute),'occ',JSON.stringify(s.occupancy),'issued',s.serviceStatus.issued,'/',s.serviceStatus.demand,'sentAway',s.sentAway,'carry',!!s.serviceCarry,'issues',s.routingIssues.length);
  const nextId=NEXT_SERVICE[s.serviceStatus.id];
  if(s.serviceCarry&&nextId&&t%10===0){
    const stats={...s,active:s.cars.filter(c=>!c.fleetBus).length};
    let patch;try{patch=serviceCarryOptions(options,stats,nextId,{continuous:true});}catch(e){continue;}
    const before=s.serviceStatus.minute;
    log('CARRY',s.serviceStatus.id,'->',nextId,'at',formatServiceClock(before),before.toFixed(3),'occ',JSON.stringify(s.occupancy),'max',JSON.stringify(maxOcc),'sentAway',s.sentAway);
    options={...options,...patch};
    s=createCampusTraffic(structuredClone(options));maxOcc={a:0,b:0,c:0};
    log('  new',s.serviceStatus.id,'begins',formatServiceClock(s.serviceStatus.minute),s.serviceStatus.minute.toFixed(3),'gap(min)',(s.serviceStatus.minute-before).toFixed(4),'occ',JSON.stringify(s.occupancy),'equity%',s.serviceStatus.equityPercent);
  }
  if(s.serviceStatus.id==='final'&&s.serviceStatus.minute>=905)break;
}
log('end',s.serviceStatus.id,formatServiceClock(s.serviceStatus.minute),'occ',JSON.stringify(s.occupancy),'max',JSON.stringify(maxOcc),'issues',s.routingIssues.length);
