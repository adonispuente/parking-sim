// Temporary simulation rule: fleet buses can share space with other fleet buses.
// Ordinary cars still interact with buses normally in every traffic check.
export const busesPassThrough = (a, b) => a.fleetBus === true && b.fleetBus === true;
