// M2 estimates only. No simulated people, boardings or onboard loads exist yet.
export const DEMAND_AREAS = ['b', 'cNorth', 'cSouth'];
const nonnegative = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const areaOf = car => car.target === 'b' ? 'b' : car.target === 'c'
  ? (['cNorth', 'cFirstNorth'].includes(car.zone) ? 'cNorth' : 'cSouth') : null;
const empty = () => ({ toHome: 0, toLot: 0 });

export function createShuttleDemand(state, tripSeconds) {
  const areas = Object.fromEntries(DEMAND_AREAS.map(id => [id, {
    waiting: empty(), served: empty(), generated: empty(), since: null,
    lastService: null, lastAssigned: null,
  }]));
  const events = [], known = new Set();
  let overrideSignature = '', source = 'estimated vehicle events';
  let lastDecision = { area: null, reason: 'Waiting for pickup demand', clock: 0 };
  const config = () => state.shuttleConfig ?? {};
  const unitsPerCar = () => Math.min(8, nonnegative(config().estimatedPeoplePerCar ?? 2.5))
    * Math.min(1, nonnegative(config().estimatedRideShare ?? .5));
  const capacity = () => Math.max(1, Math.min(100, nonnegative(config().estimatedTripCapacity ?? 20)));
  const add = (id, direction, units) => {
    if (!id || units <= 0) return;
    const area = areas[id];
    if (area.waiting.toHome + area.waiting.toLot <= 1e-8) area.since = state.clock;
    area.waiting[direction] += units;
    area.generated[direction] += units;
  };
  const register = (car, arrived = false) => {
    const id = areaOf(car);
    if (!id || known.has(car.id)) return;
    known.add(car.id);
    const units = unitsPerCar();
    if (arrived && !config().demandOverride) add(id, 'toHome', units);
    if (Number.isFinite(car.readyAt)) {
      events.push({ at: car.readyAt, id, units });
      events.sort((a, b) => a.at - b.at);
    }
  };
  for (const car of state.parkedVehicles ?? []) register(car);
  const update = () => {
    const override = config().demandOverride;
    const signature = JSON.stringify(override ?? null);
    if (signature !== overrideSignature) {
      overrideSignature = signature;
      if (override) for (const id of DEMAND_AREAS) {
        const area = areas[id], value = override[id] ?? {};
        area.waiting = { toHome: nonnegative(value.toHome), toLot: nonnegative(value.toLot) };
        area.generated = { ...area.waiting }; area.served = empty();
        area.since = area.waiting.toHome + area.waiting.toLot > 0 ? state.clock : null;
        area.lastAssigned = null; area.lastService = null;
      }
    }
    source = override ? 'controlled demand override' : 'estimated vehicle events';
    while (events.length && events[0].at <= state.clock + 1e-8) {
      const event = events.shift();
      if (!override) add(event.id, 'toLot', event.units);
    }
  };
  const committed = (id, exclude = null) => {
    const units = empty(); let buses = 0;
    for (const bus of state.shuttles ?? []) {
      if (bus === exclude || bus.demandAssignment?.area !== id) continue;
      buses++;
      for (const direction of ['toHome', 'toLot']) units[direction] += bus.demandAssignment[direction];
    }
    return { ...units, buses };
  };
  const rows = (exclude = null) => Object.fromEntries(DEMAND_AREAS.map(id => {
    const area = areas[id], assigned = committed(id, exclude);
    const unmet = empty();
    for (const direction of ['toHome', 'toLot']) unmet[direction] = Math.max(0, area.waiting[direction] - assigned[direction]);
    const age = area.since == null ? 0 : Math.max(0, state.clock - Math.max(area.since, area.lastService ?? 0, area.lastAssigned ?? 0));
    return [id, { waiting: { ...area.waiting }, served: { ...area.served }, generated: { ...area.generated },
      committed: assigned, unmet, ageSeconds: age, lastService: area.lastService,
      tripSeconds: tripSeconds[id], score: (unmet.toHome + unmet.toLot) / Math.max(1, tripSeconds[id]) }];
  }));
  const choose = (allowed = DEMAND_AREAS, exclude = null) => {
    const snapshot = rows(exclude);
    const eligible = allowed.filter(id => snapshot[id].unmet.toHome + snapshot[id].unmet.toLot > 1e-8);
    const maxWait = Math.max(30, nonnegative(config().demandMaxWaitSeconds ?? 240));
    const overdue = eligible.filter(id => snapshot[id].ageSeconds >= maxWait);
    const ranked = overdue.length ? overdue.sort((a, b) => snapshot[b].ageSeconds - snapshot[a].ageSeconds || DEMAND_AREAS.indexOf(a) - DEMAND_AREAS.indexOf(b))
      : eligible.sort((a, b) => snapshot[b].score - snapshot[a].score || DEMAND_AREAS.indexOf(a) - DEMAND_AREAS.indexOf(b));
    return { area: ranked[0] ?? null, reason: ranked.length ? overdue.length ? 'Quiet-area wait safeguard' : 'Greatest uncommitted demand / circuit time' : 'No uncommitted pickup demand' };
  };
  const reserve = (bus, decision) => {
    bus.demandAssignment = null;
    const id = decision.area;
    if (id) {
      const unmet = rows()[id].unmet;
      bus.demandAssignment = { area: id, toHome: Math.min(capacity(), unmet.toHome), toLot: Math.min(capacity(), unmet.toLot) };
      areas[id].lastAssigned = state.clock;
    }
    lastDecision = { ...decision, clock: state.clock, bus: bus.number };
  };
  const pickup = (bus, stop) => {
    const assignment = bus.demandAssignment;
    if (!assignment || !['bSouth', 'bNorth', 'cNorth', 'cSouth'].includes(stop)) return;
    const area = areas[assignment.area];
    for (const direction of ['toHome', 'toLot']) {
      const amount = Math.min(area.waiting[direction], assignment[direction]);
      area.waiting[direction] = Math.max(0, area.waiting[direction] - amount);
      area.served[direction] += amount; assignment[direction] -= amount;
    }
    area.lastService = state.clock;
    if (area.waiting.toHome + area.waiting.toLot <= 1e-8) area.since = null;
  };
  const publish = () => {
    state.shuttleDemand = { source, units: 'estimated riders (not boardings)', areas: rows(), lastDecision: { ...lastDecision },
      assumptions: { peoplePerCar: config().estimatedPeoplePerCar ?? 2.5, rideShare: config().estimatedRideShare ?? .5,
        tripServiceUnits: capacity(), maxWaitSeconds: config().demandMaxWaitSeconds ?? 240 } };
  };
  return { update, register, choose, reserve, pickup, publish };
}