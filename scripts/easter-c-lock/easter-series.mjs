import { createCampusTraffic } from '../../src/traffic.js';
import { SUNDAY_SERVICES, serviceOptions, formatServiceClock } from '../../src/sundayServices.js';
const [id,demandArg,eqArg]=process.argv.slice(2);const p=SUNDAY_SERVICES[id];
const over={};if(demandArg!=='-')over.demand=Number(demandArg);if(eqArg!=='-')over.equityPercent=Number(eqArg);
const init=process.env.INIT?JSON.parse(process.env.INIT):p.initialOccupancy;
const shuttles={enabled:true,activeCount:5,bFullPercent:100,randomDwell:true,dwellSeconds:45,cDirection:'auto',bStop:'circuit',dispatchMode:'demand',dispatchDuringDepartures:true};
const s=createCampusTraffic({initialOccupancy:{...init},badgePercent:5,phase:'arrival',service:{enabled:true,...serviceOptions(id,over)},zonePreferences:{a:'auto',b:'auto',c:'auto'},shuttles});
const lots=['a','b','c'].map(i=>({id:`lot-${i}`,open:true}));
let lastSig=null,frozenAt=null,dump=false,bucket=-1;
while(s.serviceStatus.minute<700){
  s.step(.05,[18,18,0],lots);
  const m=s.serviceStatus.minute;
  if(Math.floor(m/5)!==bucket){bucket=Math.floor(m/5);
    const cars=s.cars.filter(c=>!c.fleetBus);
    const sig=cars.map(c=>`${c.id}:${c.lane}:${(c.distance??0).toFixed(2)}`).join(',');
    const same=cars.length>0&&sig===lastSig;if(same&&frozenAt==null)frozenAt=m;if(!same)frozenAt=null;lastSig=sig;
    console.log(id,JSON.stringify(over),formatServiceClock(m),'occ',JSON.stringify(s.occupancy),'departed',JSON.stringify(s.departed),'onroad',cars.length,'identical-to-5min-ago',same);
    if(same&&!dump){dump=true;
      const held=cars.slice(0,400);
      const lanes={};for(const c of held){const L=s.lanes[c.lane];const k=`${c.lane}:${L?.name??L?.id??L?.kind??''}:${c.phase}`;lanes[k]=lanes[k]??[];lanes[k].push(+(c.distance??0).toFixed(1)+'/'+(L?.length??0).toFixed(0));}
      console.log('FROZEN lanes',JSON.stringify(Object.fromEntries(Object.entries(lanes).map(([k,v])=>[k,v.length+' cars, front '+v.sort().at(-1)]))));
      console.log('cEntrance',JSON.stringify(s.cEntrance,null,0)?.slice(0,700));
      console.log('cRoundabout',JSON.stringify(s.cRoundabout,null,0)?.slice(0,700));
      console.log('clay',JSON.stringify(s.equityClayStop)?.slice(0,400));
      break;}
  }
}
