import { createCampusTraffic } from '../../src/traffic.js';
import { SUNDAY_SERVICES, serviceOptions, formatServiceClock } from '../../src/sundayServices.js';
const [id,demandArg,eqArg,untilArg]=process.argv.slice(2);
const p=SUNDAY_SERVICES[id];
const over={};if(demandArg!=='-')over.demand=Number(demandArg);if(eqArg!=='-')over.equityPercent=Number(eqArg);
const init=process.env.INIT?JSON.parse(process.env.INIT):p.initialOccupancy;
const shuttles={enabled:true,activeCount:5,bFullPercent:100,randomDwell:true,dwellSeconds:45,cDirection:'auto',bStop:'circuit',dispatchMode:'demand',dispatchDuringDepartures:true};
const s=createCampusTraffic({initialOccupancy:{...init},badgePercent:5,phase:'arrival',service:{enabled:true,...serviceOptions(id,over)},zonePreferences:{a:'auto',b:'auto',c:'auto'},shuttles});
const lots=['a','b','c'].map(i=>({id:`lot-${i}`,open:true}));
const until=Number(untilArg||665);
while(s.serviceStatus.minute<until)s.step(.05,[18,18,0],lots);
const cars=s.cars.filter(c=>!c.fleetBus);
const byLane={};for(const c of cars){const k=`${c.lane}|${c.phase}|${c.target}|${c.access??''}`;byLane[k]=(byLane[k]??0)+1;}
const moving=cars.filter(c=>(c.speed??0)>0.01).length;
console.log(id,over,'at',formatServiceClock(s.serviceStatus.minute),'occ',JSON.stringify(s.occupancy),'reserved',JSON.stringify(s.reserved),'onroad',cars.length,'moving',moving,'waiting',JSON.stringify(s.waiting),'issues',s.routingIssues.length);
console.log('top lanes',JSON.stringify(Object.entries(byLane).sort((a,b)=>b[1]-a[1]).slice(0,12)));
const stopped=cars.filter(c=>(c.speed??0)<=0.01).slice(0,8).map(c=>({id:c.id,lane:c.lane,name:s.lanes[c.lane]?.name??s.lanes[c.lane]?.id,d:+(c.distance??0).toFixed(1),len:+(s.lanes[c.lane]?.length??0).toFixed(1),phase:c.phase,t:c.target,why:c.yieldReason??c.holdReason??null}));
console.log('stopped sample',JSON.stringify(stopped));
console.log('controls',JSON.stringify({aMain:s.aMainControl?{admitted:s.aMainControl.admittedId,waiting:s.aMainControl.waiting}:null,cEntrance:s.cEntrance?.reason,cRound:s.cRoundabout?.reason,radio:s.northernRadio?.reason,clay:s.equityClayStop?.reason,officer:s.feederOfficer?.reason??s.feederOfficer?.state}));
