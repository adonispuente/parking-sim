import { GENERAL_CAPACITY, lotTotals } from './parkingZones.js';

// Service start times are fixed. Demand/readiness distributions are illustrative,
// adjustable training inputs, not attendance forecasts or measured probabilities.
export const SUNDAY_SERVICES = Object.freeze({
  nine: {id:'nine',label:'9:00 · arrivals',startMinute:540,beginMinute:495,demand:950,activeBuses:3,transition:false,initialOccupancy:{a:0,b:0,c:0}},
  eleven: {id:'eleven',label:'11:00 · service transition',startMinute:660,beginMinute:605,arrivalBeginMinute:615,demand:1224,activeBuses:5,transition:true,initialOccupancy:{a:360,b:487,c:103}},
  final: {id:'final',label:'1:15 · service transition',startMinute:795,beginMinute:725,arrivalBeginMinute:750,demand:300,activeBuses:5,transition:true,initialOccupancy:{a:360,b:487,c:377}},
});
export const DEFAULT_SERVICE_OPTIONS = Object.freeze({demand:950,earlyPercent:0,equityPercent:10,corporatePercent:10,departureWindowMinutes:25,lingerMinutes:5});
// Operational timing: 75% of each service's people are on time (due at or before
// service start); the rest come late (Commander, 2026-11-06). The confirmed 95%
// target still holds at service start +45 minutes; the remaining 5% over the
// following 15 minutes is a provisional, adjustable tail.
export const SERVICE_ON_TIME_SHARE=.75;
export const SERVICE_ARRIVAL_TARGET_MINUTES=45;
export const SERVICE_ARRIVAL_TAIL_MINUTES=15;
export const SERVICE_ARRIVAL_TARGET_SHARE=.95;
export const SERVICE_DURATION_MINUTES=75;
// Cohorts are related by the actual schedule, not a fixed gap between services.
// In particular, the 11:00 congregation dismisses at 12:15, not 12:30.
export function serviceTimeline(config={}) {
  const preset=SUNDAY_SERVICES[config.id]??SUNDAY_SERVICES.nine;
  const previous={eleven:'nine',final:'eleven'}[preset.id];
  return {startMinute:preset.startMinute,beginMinute:config.beginMinute??preset.beginMinute,
    dismissalMinute:preset.startMinute+SERVICE_DURATION_MINUTES,
    previousDismissalMinute:previous?SUNDAY_SERVICES[previous].startMinute+SERVICE_DURATION_MINUTES:null};
}
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
  // Fixed ticks accumulate sub-nanosecond error at exact minute boundaries.
  const m=Math.floor(minute+1e-8),hour=Math.floor(m/60)%24;
  return `${hour%12||12}:${String(m%60).padStart(2,'0')}`;
}
export const seededFraction = index => {const x=Math.sin((index+1)*127.1+311.7)*43758.5453;return x-Math.floor(x);};

// Vehicle proxies, not individual people. Deterministic quotas have <1 car
// rounding error per service/lot: floor(N/20) early; A ~2% late, disjoint.
// The 25-minute main spread and five-minute A tail are provisional inputs.
export function departureSchedule(serviceId,lot,ordinal,settings={}) {
  const preset=SUNDAY_SERVICES[serviceId]??SUNDAY_SERVICES.nine;
  const dismissalMinute=preset.startMinute+SERVICE_DURATION_MINUTES;
  const n=Math.max(0,Math.floor(ordinal));
  const early=n%20===19,late=!early&&lot==='a'&&n%50===48;
  const departureGroup=early?'early':late?'late':'main';
  const q=seededFraction(n+({a:10000,b:20000,c:30000}[lot]??0));
  const window=Math.max(5,Math.min(25,Number(settings.departureWindowMinutes)||25));
  const tail=Math.max(1,Math.min(5,Number(settings.lingerMinutes)||5));
  const readinessMinute=dismissalMinute+(early?-10+5*q:late?window+tail*q:window*Math.pow(q,1.55));
  return {serviceId:preset.id,dismissalMinute,readinessMinute,departureGroup,departureOrdinal:n};
}

export function createServiceController(config, initialZones) {
  const sourcePreset=SUNDAY_SERVICES[config.id]??SUNDAY_SERVICES.nine;
  const timeline=serviceTimeline(config);
  const preset={...sourcePreset,beginMinute:timeline.beginMinute};
  const settings={...DEFAULT_SERVICE_OPTIONS,...preset,...config};
  settings.equityPercent=Math.max(10,Math.min(90,Number(settings.equityPercent)||10));
  settings.corporatePercent=10;
  settings.departureWindowMinutes=Math.max(5,Math.min(25,Number(settings.departureWindowMinutes)||25));
  settings.lingerMinutes=Math.max(1,Math.min(5,Number(settings.lingerMinutes)||5));
  const startDue=(preset.startMinute-preset.beginMinute)*60;
  const targetDue=startDue+SERVICE_ARRIVAL_TARGET_MINUTES*60;
  const tailEndDue=targetDue+SERVICE_ARRIVAL_TAIL_MINUTES*60;
  const demand=Math.max(0,Math.floor(Number(settings.demand)||0));
  const targetCount=Math.ceil(demand*SERVICE_ARRIVAL_TARGET_SHARE);
  const onTimeCount=Math.min(targetCount,Math.ceil(demand*SERVICE_ON_TIME_SHARE));
  // A transition's first 20-minute stream is part of the on-time cohort and is
  // capped at it, so an extreme earlyPercent override cannot erase the late 25%.
  const early=preset.transition?Math.min(onTimeCount,Math.floor(demand*Math.max(0,Math.min(100,settings.earlyPercent))/100)):0;
  // Disjoint, ordered cohorts: early stream, rest of on time, late within the
  // 95% target, late tail.
  // Pre-roll includes outgoing early departures, but does not pull the incoming
  // arrival stream earlier. Carry-forward may start later: overdue demand queues.
  const arrivalStart=((preset.arrivalBeginMinute??sourcePreset.beginMinute)-preset.beginMinute)*60;
  const cohorts=[
    {count:early,start:arrivalStart,end:arrivalStart+1200},
    {count:onTimeCount-early,start:arrivalStart+(preset.transition?1200:0),end:startDue},
    {count:targetCount-onTimeCount,start:startDue,end:targetDue},
    {count:demand-targetCount,start:targetDue,end:tailEndDue},
  ];
  const cohortOf=i=>{
    let offset=0;
    for(const c of cohorts){if(i<offset+c.count)return {c,index:i-offset};offset+=c.count;}
    return {c:cohorts[cohorts.length-1],index:i-offset};
  };
  // Exact quotas, spread across the service rather than random trials which can
  // fall below the confirmed minimum. These are disjoint shares of total demand.
  const equityCount=Math.ceil(demand*settings.equityPercent/100);
  const corporateCount=Math.min(demand-equityCount,Math.ceil(demand*.1));
  const feederCount=demand-equityCount;
  let feederIndex=0,equityIndex=0;
  const arrivals=Array.from({length:demand},(_,i)=>{
    const {c,index}=cohortOf(i);
    // More people arrive nearer each window's end; exact demand, reproducible spacing.
    const q=(index+.5)/Math.max(1,c.count);
    const due=c.start+(c.end-c.start)*Math.pow(q,.72);
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
  const initialGate=config.initialGate;
  const gated={a:initialGate?!!initialGate.closed:preset.transition&&started.a>GENERAL_CAPACITY.a/2,b:false,c:false};
  let releaseMinute=initialGate?.releaseMinute??(gated.a?timeline.previousDismissalMinute:null);
  let cursor=0;
  return {
    settings,preset,gated,reopenedAt:initialGate?.reopenedMinute!=null?{a:(initialGate.reopenedMinute-preset.beginMinute)*60}:{},arrivals,
    isTransition:preset.transition,
    departureMetadata(ordinal,lot,serviceId=({eleven:'nine',final:'eleven'}[preset.id]??preset.id)) {
      const schedule=departureSchedule(serviceId,lot,ordinal,settings);
      return {...schedule,readyAt:(schedule.readinessMinute-preset.beginMinute)*60};
    },
    departureReadyAt(index,lot) {return this.departureMetadata(index,lot).readyAt;},
    tick(state,lotSettings=[]) {
      const general=lotTotals(state.zoneOccupancy,false);
      const minute=preset.beginMinute+state.clock/60;
      const manualClosed=lotSettings.some(lot=>(lot.id==='a'||lot.id==='lot-a')&&lot.open===false);
      const generalUsed=general.a+Math.max(0,(state.reserved?.a??0)-(state.badgeReserved??0));
      if(!gated.a&&(generalUsed>=GENERAL_CAPACITY.a||manualClosed)) {
        gated.a=true;releaseMinute=timeline.dismissalMinute;
      }
      if(gated.a&&!manualClosed&&minute+1e-8>=releaseMinute&&generalUsed<=GENERAL_CAPACITY.a/2) {
        gated.a=false;this.reopenedAt.a=state.clock;
      }
      const reason=manualClosed?'manual-closure':!gated.a?'open':minute+1e-8<releaseMinute?'until-dismissal':'waiting-for-half';
      state.arrivalQueues??=[[],[],[]];
      while(cursor<arrivals.length&&arrivals[cursor].due<=state.clock){
        const arrival=arrivals[cursor++];
        state.waiting[arrival.source]++;state.arrivalQueues[arrival.source].push(arrival);
      }
      state.serviceStatus={id:preset.id,label:preset.label,clock:formatServiceClock(minute),minute,
        dismissalMinute:timeline.dismissalMinute,previousDismissalMinute:timeline.previousDismissalMinute,
        gates:{a:{closed:gated.a,reason,releaseMinute,generalUsed,reopenAtOrBelow:GENERAL_CAPACITY.a/2},
          b:{closed:false,reason:'capacity-and-manual'},c:{closed:false,reason:'capacity-and-manual'}},
        serviceOffsetMinutes:minute-preset.startMinute,
        arrivalTargetMinute:preset.startMinute+SERVICE_ARRIVAL_TARGET_MINUTES,
        minutesUntilArrivalTarget:Math.max(0,(targetDue-state.clock)/60),
        minutesUntilFinalArrival:Math.max(0,(tailEndDue-state.clock)/60),
        phase:minute>=timeline.dismissalMinute?'Dismissal / departure tail':minute>=timeline.dismissalMinute-10?'Early departures':minute<preset.startMinute?(preset.transition?'Mixed transition':'Arrivals'):'Service / late arrivals',
        departureTiming:{kind:'vehicle-cohort proxy',earlyPercent:5,aLatePercent:2,mainMinutes:settings.departureWindowMinutes,aTailMinutes:settings.lingerMinutes,residualStaff:'not modeled'},
        demand,issued:cursor,remaining:demand-cursor,onTimeCount,equityCount,corporateCount,equityPercent:settings.equityPercent,corporatePercent:10,
        gated:{...gated},reopenedAt:{...this.reopenedAt},activeBuses:preset.activeBuses};
    },
  };
}
