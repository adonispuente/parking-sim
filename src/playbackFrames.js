// Public presentation only: never restore engine closures from these fields.
const FIELDS = [
  'clock', 'cars', 'entered', 'exited', 'waiting', 'occupancy', 'reserved',
  'assignments', 'parked', 'overflow', 'sentAway', 'atCapacity', 'departed',
  'badgeParking', 'badgeReserved', 'zoneOccupancy', 'zoneReserved',
  'serviceStatus', 'serviceCarry', 'shuttleBreak', 'gateStatus', 'routingIssues',
  'aDepartureControl', 'feederOfficer', 'corporateExitJunction', 'northernRadio',
  'blackPermitControl', 'equityClayStop', 'priorityWaiting',
  'shuttleDispatchMode', 'shuttles', 'shuttleDemand',
];
export function captureTrafficFrame(state) {
  return structuredClone(Object.fromEntries(FIELDS.filter(key => state[key] !== undefined).map(key => [key, state[key]])));
}