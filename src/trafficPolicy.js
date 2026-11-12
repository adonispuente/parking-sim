// Operational permissions are separate from the traced physical route geometry.
// Unconfirmed special categories are denied by default and can be configured separately.
export const DEFAULT_ACCESS_POLICY = Object.freeze({
  blackPermit: { general: false, badge: true, shuttle: true, accessible: false, rideshare: false },
  bNorthernArrival: false,
  cSecondaryArrival: false,
});

export function selectArrivalAccess({ target, source, category = 'general', policy = DEFAULT_ACCESS_POLICY }) {
  if (target === 'a') {
    const permitted = policy.blackPermit?.[category] === true;
    return { access: source === 0 && permitted ? 'badgeA' : 'a', route: source === 1 ? 'eA' : permitted ? 'badgeA' : 'a' };
  }
  // Dedicated northern B exit and secondary C exit are never normal arrival shortcuts.
  if (target === 'b') return { access: 'bWest', route: source === 2 ? 'e2BMain' : source === 1 ? 'eBMain' : 'bWest' };
  if (target === 'c') return { access: 'cWest', route: source === 2 ? 'e2CWest' : source === 1 ? 'eCWest' : 'cWest' };
  throw new Error(`Unknown parking lot: ${target}`);
}

// Normal directions supplied by the parking team. B North's six balanced hubs
// split into three northern/eastern and three western anchors.
export function selectBDepartureAccess(car,policy='split') {
  if(policy==='north')return 'bNorth';
  if(policy==='west')return 'bWest';
  if(car.zone==='bSouth'||car.zone==='bPocket')return 'bNorth';
  if(car.zone==='bNorth') {
    const north=car.abHubId?['b-hub-60','b-hub-61','b-hub-69'].includes(car.abHubId):Math.abs(car.id|0)%2===0;
    return north?'bNorth':'bWest';
  }
  return 'bWest';
}
