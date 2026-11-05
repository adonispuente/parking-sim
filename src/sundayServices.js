import { GENERAL_CAPACITY, lotTotals } from './parkingZones.js';

// Service start times are fixed. Demand/readiness distributions are illustrative,
// adjustable training inputs, not attendance forecasts or measured probabilities.
export const SUNDAY_SERVICES = Object.freeze({
  nine: {id:'nine',label:'9:00 · arrivals',startMinute:540,beginMinute:495,demand:950,activeBuses:3,transition:false,initialOccupancy:{a:0,b:0,c:0}},
  eleven: {id:'eleven',label:'11:00 · service transition',startMinute:660,beginMinute:615,demand:1224,activeBuses:5,transition:true,initialOccupancy:{a:360,b:487,c:103}},
  final: {id:'final',label:'1:15 · service transition',startMinute:795,beginMinute:750,demand:300,activeBuses:5,transition:true,initialOccupancy:{a:360,b:487,c:377}},
});
export const DEFAULT_SERVICE_OPTIONS = Object.freeze({demand:950,earlyPercent:0,equityPercent:10,corporatePercent:10,departureWindowMinutes:40,lingerPercent:15,lingerMinutes:35});
// Operational timing target: 95% issued by service start +45 minutes. The
// remaining 5% over the following 15 minutes is a provisional, adjustable tail.
export const SERVICE_ARRIVAL_TARGET_MINUTES=45;
export const SERVICE_ARRIVAL_TAIL_MINUTES=15;
export const SERVICE_ARRIVAL_TARGET_SHARE=.95;
// The 1:15 Equity stream uses B's main entrance when available; C is overflow,
// not a scheduled destination. Other services and manual Equity retain C-only.
export function serviceArrivalPriorities(serviceId, source, parkingIntent, arrivalPriority) {
  if (source !== 0) return serviceId === 'final' ? ['b','c'] : ['c'];
  if (parkingIntent === 'serve-team') return ['b'];
  if (parkingIntent === 'corporate') return ['b','c'];
  return arrivalPriority?.[source] ?? ['a','b','c'];
}
export function serviceOptions(id, overrides={}) {
  return {...DEFAULT_SERVICE_OPTIONS,...SUNDAY_SERVICES[id],...overrides,id,
    equityPercent:Math.max(10,Math.min(90,Number(overrides.equityPercent??DEFAULT_SERVICE_OPTIONS.equityPercent)||10)),corporatePercent:10};
}
export function formatServiceClock(minute) {
  const m=Math.floor(minute),hour=Math.floor(m/60)%24;
  return `${hour%12||12}:${String(m%60).padStart(2,'0')}`;
}
export const seededFraction = index => {const x=Math.sin((index+1)*127.1+311.7)*43758.5453;return x-Math.floor(x);};

export function createServiceController(config, initialZones) {
  const preset=SUNDAY_SERVICES[config.id]??SUNDAY_SERVICES.nine;
  const settings={...DEFAULT_SERVICE_OPTIONS,...preset,...config};
  settings.equityPercent=Math.max(10,Math.min(90,Number(settings.equityPercent)||10));
  settings.corporatePercent=10;
  const targetDue=(preset.startMinute-preset.beginMinute+SERVICE_ARRIVAL_TARGET_MINUTES)*60;
  const tailEndDue=targetDue+SERVICE_ARRIVAL_TAIL_MINUTES*60;
  const demand=Math.max(0,Math.floor(Number(settings.demand)||0));
  const targetCount=Math.ceil(demand*SERVICE_ARRIVAL_TARGET_SHARE);
  // A transition's first 20-minute stream stays intact unless it would exceed
  // the 95% target cohort (an incompatible extreme earlyPercent override).
  const early=Math.min(targetCount,Math.floor(demand*Math.max(0,Math.min(100,settings.earlyPercent))/100));
  // Exact quotas, spread across the service rather than random trials which can
  // fall below the confirmed minimum. These are disjoint shares of total demand.
  const equityCount=Math.ceil(demand*settings.equityPercent/100);
  const corporateCount=Math.min(demand-equityCount,Math.ceil(demand*.1));
  const feederCount=demand-equityCount;
  let feederIndex=0,equityIndex=0;
  const arrivals=Array.from({length:demand},(_,i)=>{
    const isEarly=preset.transition&&i<early;
    const isTail=i>=targetCount;
    const start=isTail?targetDue:preset.transition&&!isEarly?1200:0;
    const end=isTail?tailEndDue:preset.transition&&isEarly?1200:targetDue;
    const count=isTail?demand-targetCount:isEarly?early:targetCount-(preset.transition?early:0);
    const index=isTail?i-targetCount:isEarly?i:i-(preset.transition?early:0);
    // More people arrive nearer service time; exact demand, reproducible spacing.
    const q=(index+.5)/Math.max(1,count);
    const due=start+(end-start)*Math.pow(q,.72);
    const equity=Math.floor((i+1)*equityCount/Math.max(1,demand))>Math.floor(i*equityCount/Math.max(1,demand));
    let corporate=false;
    if(!equity) {
      corporate=Math.floor((feederIndex+1)*corporateCount/Math.max(1,feederCount))>Math.floor(feederIndex*corporateCount/Math.max(1,feederCount));
      feederIndex++;
    }
    // Alternate the Equity entrances independently of the overall arrival index;
    // a regular ten-percent cadence must not accidentally select only one origin.
    const source=equity?(equityIndex++%2?2:1):0;
    return {due,source,parkingIntent:corporate?'corporate':'general'};
  }).sort((a,b)=>a.due-b.due);
  const started=lotTotals(initialZones,false);
  const gated={a:preset.transition&&started.a>GENERAL_CAPACITY.a/2,b:preset.transition&&started.b>=GENERAL_CAPACITY.b,c:false};
  let cursor=0;
  return {
    settings,preset,gated,reopenedAt:{},arrivals,
    isTransition:preset.transition,
    departureReadyAt(index,lot) {
      if(!preset.transition)return Infinity;
      const q=seededFraction(index+({a:11,b:29,c:47}[lot]));
      const linger=Math.max(0,Math.min(90,settings.lingerPercent))/100;
      const window=Math.max(5,Number(settings.departureWindowMinutes)||40)*60;
      const base=q<1-linger?Math.pow(q/Math.max(.01,1-linger),1.55)*window:
        window+(q-(1-linger))/Math.max(.01,linger)*Math.max(1,Number(settings.lingerMinutes)||35)*60;
      // Readiness includes walking/boarding delay, especially B. Queue delay is additional.
      return base*(lot==='b'?1.15:lot==='c'?1.08:1);
    },
    tick(state) {
      const general=lotTotals(state.zoneOccupancy,false);
      for(const lot of ['a','b'])if(gated[lot]&&general[lot]+state.reserved[lot]-(lot==='a'?(state.badgeReserved??0):0)<=GENERAL_CAPACITY[lot]/2){
        gated[lot]=false;this.reopenedAt[lot]=state.clock;
      }
      state.arrivalQueues??=[[],[],[]];
      while(cursor<arrivals.length&&arrivals[cursor].due<=state.clock){
        const arrival=arrivals[cursor++];
        state.waiting[arrival.source]++;state.arrivalQueues[arrival.source].push(arrival);
      }
      const minute=preset.beginMinute+state.clock/60;
      state.serviceStatus={id:preset.id,label:preset.label,clock:formatServiceClock(minute),minute,
        serviceOffsetMinutes:minute-preset.startMinute,
        arrivalTargetMinute:preset.startMinute+SERVICE_ARRIVAL_TARGET_MINUTES,
        minutesUntilArrivalTarget:Math.max(0,(targetDue-state.clock)/60),
        minutesUntilFinalArrival:Math.max(0,(tailEndDue-state.clock)/60),
        phase:!preset.transition?'Arrivals only':state.clock<1200?'Departure window':minute<preset.startMinute?'Mixed transition':'Late arrivals / lingering departures',
        demand,issued:cursor,remaining:demand-cursor,equityCount,corporateCount,equityPercent:settings.equityPercent,corporatePercent:10,
        gated:{...gated},reopenedAt:{...this.reopenedAt},activeBuses:preset.activeBuses};
    },
  };
}
