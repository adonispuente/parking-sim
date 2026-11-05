// Operational value is separate from body length, passenger counts and speed.
// Classes are strict: a queue of lower-priority cars cannot outvote a bus.
export const SHUTTLE_CAR_EQUIVALENT = 20;
export const TRAFFIC_PRIORITY_ORDER = Object.freeze(['Shuttles', 'Departures', 'Arrivals']);

export function trafficClass(vehicle) {
  if (vehicle.fleetBus || vehicle.shuttle) return 'shuttle';
  if (['departing', 'departure', 'exiting'].includes(vehicle.phase)) return 'departure';
  return 'arrival';
}

export function trafficPriority(vehicle) {
  return { shuttle: 3, departure: 2, arrival: 1 }[trafficClass(vehicle)];
}

// Negative means a has priority. Ties remain stable if the cars array is reordered.
export function compareTrafficPriority(a, b) {
  const rank = trafficPriority(b) - trafficPriority(a);
  if (rank) return rank;
  return String(a.id).localeCompare(String(b.id), 'en', { numeric: true });
}
