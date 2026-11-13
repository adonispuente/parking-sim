import { SUNDAY_SERVICES, NEXT_SERVICE, serviceOptions } from './sundayServices.js';

// A UI-ready options patch; no engine/controller objects cross a restart.
// continuous:true starts the next service at the carry minute, so auto-play
// never skips the clock ahead to the next service's normal begin minute.
export function serviceCarryOptions(options,stats,nextId,{continuous=false}={}) {
  const next=SUNDAY_SERVICES[nextId],carry=stats.serviceCarry;
  const expected=NEXT_SERVICE[stats.serviceStatus?.id];
  if(!next||nextId!==expected||!carry||!Number.isFinite(carry.minute)||
    stats.serviceStatus?.remaining!==0||(stats.active??0)!==0||
    (stats.waiting??[]).some(n=>n!==0)||Object.values(stats.reserved??{}).some(n=>n!==0)) {
    throw new Error('Carry-forward requires completed arrivals and clear car routes');
  }
  const beginMinute=continuous?carry.minute:Math.max(next.beginMinute,carry.minute);
  return {phase:'arrival',service:{enabled:true,...serviceOptions(nextId,{beginMinute})},
    initialOccupancy:{...stats.occupancy},initialZoneOccupancy:{...stats.zoneOccupancy},
    initialServiceCarry:structuredClone(carry),
    shuttles:{...options.shuttles,activeCount:next.activeBuses,dispatchDuringDepartures:true}};
}