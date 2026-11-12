import { SUNDAY_SERVICES, serviceOptions } from './sundayServices.js';

// A UI-ready options patch; no engine/controller objects cross a restart.
export function serviceCarryOptions(options,stats,nextId) {
  const next=SUNDAY_SERVICES[nextId],carry=stats.serviceCarry;
  const expected={nine:'eleven',eleven:'final'}[stats.serviceStatus?.id];
  if(!next||nextId!==expected||!carry||!Number.isFinite(carry.minute)||
    stats.serviceStatus?.remaining!==0||(stats.active??0)!==0||
    (stats.waiting??[]).some(n=>n!==0)||Object.values(stats.reserved??{}).some(n=>n!==0)) {
    throw new Error('Carry-forward requires completed arrivals and clear car routes');
  }
  const beginMinute=Math.max(next.beginMinute,carry.minute);
  return {phase:'arrival',service:{enabled:true,...serviceOptions(nextId,{beginMinute})},
    initialOccupancy:{...stats.occupancy},initialZoneOccupancy:{...stats.zoneOccupancy},
    initialServiceCarry:structuredClone(carry),
    shuttles:{...options.shuttles,activeCount:next.activeBuses,dispatchDuringDepartures:true}};
}