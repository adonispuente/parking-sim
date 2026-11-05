import vectors, { normalizeLabel } from './campusAnnotations.js';
import { streetPath } from './pavementRouting.js';

// Approximate landmark fit, not a dimension ratio. See research/vector-routing-notes.md
// for individual building-corner residuals; imagery is not perfectly registered.
export const VECTOR_REGISTRATION = Object.freeze({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
export const vectorToTrace = ([x, y]) => [
  (x - VECTOR_REGISTRATION.offsetX) / VECTOR_REGISTRATION.scaleX,
  (y - VECTOR_REGISTRATION.offsetY) / VECTOR_REGISTRATION.scaleY,
];


const shapes = new Map(vectors.shapes.map(shape => [normalizeLabel(shape.label), shape]));
function polygon(label) {
  const key=normalizeLabel(label);
  // Accept the updated LabelMe numbering while retaining the established
  // staffed entrance's same polygon/stations. Never fall back to an arbitrary shape.
  const shape = shapes.get(key)??shapes.get({'lot c entrance':'lot c entrance 2','lot c exit':'lot c exit 2'}[key]);
  if (!shape || shape.shape_type !== 'polygon') throw new Error(`Missing vector entrance/road polygon: ${label}`);
  return shape.points;
}
const midpoint = (a, b) => [(a[0]+b[0])/2, (a[1]+b[1])/2];
const at = (label, a, b) => {
  const points=polygon(label);
  if (!points[a] || !points[b]) throw new Error(`Invalid ${label} polygon station ${a}/${b}`);
  return midpoint(points[a],points[b]);
};

// Each throat samples opposing traced polygon edges at several stations, not the polygon centroid.
// Road approaches use the paired road edges; short links between them remain estimated.
const feeder = [[35,566],[36,530],[37,490],[39,400],[40,295],[42,205],[43,125],[44,60],[44,0]];
const corporate = [[43,286],[100,286],[160,286],[210,278],[250,257],[270,224],[275,185],[280,125],[290,95],[315,65],[350,49],[420,49],[490,50],[560,51],[630,52],[690,52]];
const equityFromSouth = [[35,566],at('Equity Entrance',1,14),at('Equity Entrance',5,10),[125,533],[330,533],[530,533],[635,533],[650,510],[663,420],[675,330],[688,240],[690,145],[690,52]];
const equityEast = [[690,52],[690,145],[688,240],[675,330],[663,420],[650,510]];
const aIn = [at('Lot A Main Entrance',2,11),at('Lot A Main Entrance',3,10),at('Lot A Main Entrance',6,9)];
const aOut = [at('Lot A Main exit',8,0),at('Lot A Main exit',2,8),at('Lot A Main exit',4,6)];
const permitIn = [at('Lot A Black Permit Entrance',0,7),at('Lot A Black Permit Entrance',1,6),at('Lot A Black Permit Entrance',3,4)];
const bIn = [at('Lot B entrance',0,9),at('Lot B entrance',2,8),at('Lot B entrance',4,7)];
const bOut = [at('Lot B exit toward feeder',0,11),at('Lot B exit toward feeder',2,10),at('Lot B exit toward feeder',5,8)];
const bNorthOut = [at('Lot B exit',0,10),at('Lot B exit',2,9),at('Lot B exit',4,7)];
const cWestIn = [at('Lot C  entrance',6,5),at('Lot C  entrance',4,8),at('Lot C  entrance',0,1)];
// Updated C trace distinguishes the west-approach Entrance2 and east-approach
// Entrance1 at the staffed north junction. Equity need not cross the outgoing
// lane or double back into the west-approach throat used by feeder/shuttles.
const cEquityIn = [at('Lot C entrance 1',6,5),at('Lot C entrance 1',4,8),at('Lot C entrance 1',0,1)];
const cWestOut = [at('Lot C exit 1',0,9),at('Lot C exit 1',2,8),at('Lot C exit 1',4,6)];
const cEastOut = [at('Lot C  exit',0,11),at('Lot C  exit',2,10),at('Lot C  exit',6,8)];
// Sample the opposing edges of each labeled inbound Equity corridor. The second
// one is an independent southern origin, not a spawn point on the western feeder.
const equityOrigins = Object.freeze({
  west: [at('Equity Entrance',1,14),at('Equity Entrance',5,10)],
  south: [at('Equity Entrance & exit 2',1,12),at('Equity Entrance & exit 2',5,10)],
});
const access = {
  a: { arrival: aIn, departure: aOut },
  badgeA: { arrival: permitIn, departure: [...permitIn].reverse() },
  bWest: { arrival: bIn, departure: bOut },
  bNorth: { arrival: [...bNorthOut].reverse(), departure: bNorthOut },
  cWest: { arrival: cWestIn, departure: cWestOut },
  cEast: { arrival: cEastOut, departure: [...cEastOut].reverse() },
};
const join = (...parts) => parts.flat().filter((p,i,all) => i === 0 || Math.hypot(p[0]-all[i-1][0],p[1]-all[i-1][1]) > 0.2);
// The untraced parking maneuver links the arrival throat to the distinct exit throat.
// This prevents teleporting on departure without asserting individual stall geometry.
const fromParking = key => [access[key].arrival.at(-1),...access[key].departure];
const fromFeeder = feeder.slice(0,5);
const fromCorporate = join(fromFeeder, corporate);
const toEquity = equityEast;
const feederNorth = [[42,205],[43,125],[44,60],[44,0]];
const departure = {
  a: join(fromParking('a'),[[44,20],[44,0]]),
  badgeA: join(fromParking('badgeA'),[[115,286],[43,286]],feederNorth),
  bWest: join(fromParking('bWest'),[[260,210],[245,260],[200,285],[43,286]],feederNorth),
  bNorth: join(fromParking('bNorth'),[[460,49],[560,51],[690,52]],toEquity),
  cWest: join(fromParking('cWest'),[[530,50],[610,52],[690,52]],toEquity),
  cEast: join(fromParking('cEast'),[[670,52]],toEquity),
};
const arrival = {
  a: join(feeder.slice(0,8),access.a.arrival),
  badgeA: join(fromCorporate.slice(0,3),[[155,281]],access.badgeA.arrival),
  bWest: join(fromCorporate.slice(0,6),[[275,215]],access.bWest.arrival),
  bNorth: join(fromCorporate.slice(0,12),[[450,49]],access.bNorth.arrival),
  cWest: join(fromCorporate.slice(0,13),[[510,50]],access.cWest.arrival),
  cEast: join(fromCorporate.slice(0,15),[[670,52]],access.cEast.arrival),
  eCWest: join(equityFromSouth,[[630,52],[530,50]],access.cWest.arrival),
  eCEast: join(equityFromSouth,[[670,52]],access.cEast.arrival),
  eB: join(equityFromSouth,[[630,52],[560,51],[450,49]],access.bNorth.arrival),
  eBMain: join(equityFromSouth,access.bWest.arrival),
  e2BMain: join(equityOrigins.south,access.bWest.arrival),
  eA: join(equityFromSouth,[...corporate.slice(0,16).reverse(),[43,125],[44,60]],access.a.arrival),
  e2CWest: join(equityOrigins.south,access.cWest.arrival),
};
// Replace guessed street control points with paths wholly inside labeled pavement.
// Keep each access throat separate so containment ends only at the lot entrance.
const accessFor = key => ({eCWest:'cWest',e2CWest:'cWest',eCEast:'cEast',eB:'bNorth',eBMain:'bWest',e2BMain:'bWest',eA:'a'}[key]??key);
const containedArrival={};
const arrivalStreetCounts={};
const routeOrigin={};
const equityStreet = (origin, throat) => join(
  streetPath(origin[0],origin[1]),
  ...(origin===equityOrigins.west ? [streetPath(origin[1],[100,534]),streetPath([100,534],[620,533])] : [streetPath(origin[1],[620,533])]),
  streetPath([620,533],[690,90]),
  streetPath([690,90],throat),
);
for(const key of Object.keys(arrival)) {
  const throat=['eCWest','e2CWest'].includes(key)?cEquityIn:access[accessFor(key)].arrival;
  const origin=key==='e2CWest'||key==='e2BMain'?'south':key.startsWith('e')?'west':'feeder';
  const street=origin==='feeder'
    ? streetPath([36,560],throat[0])
    : equityStreet(equityOrigins[origin],throat[0]);
  routeOrigin[key]=origin;
  arrivalStreetCounts[key]=street.length;
  containedArrival[key]=join(street,throat);
}
const containedDeparture={};
const departureStreetStarts={};
for(const key of Object.keys(departure)) {
  // Zoned cars already have a parking origin. Connect to the DEPARTURE throat
  // directly, not the old demo's arrival-to-exit turnaround. The latter sent C
  // departures back into its entrance, head-on against incoming shuttle buses.
  const throat=key==='a'?fromParking(key):access[key].departure;
  const street=streetPath(throat.at(-1),['a','badgeA','bWest'].includes(key)?[44,4]:[690,140]);
  departureStreetStarts[key]=throat.length;
  containedDeparture[key]=join(throat,street);
}
export const STREET_SECTIONS={arrival:arrivalStreetCounts,departure:departureStreetStarts};
// Geometric metadata is kept separate from simulation policy; C's staffed west
// entrance is the arrival throat and neither labeled C exit is used by e2CWest.
export const ROUTE_METADATA = Object.freeze({
  equityOrigins,
  arrivalOrigin: routeOrigin,
  arrivalAccess: Object.fromEntries(Object.keys(arrival).map(key=>[key,accessFor(key)])),
  cStaffedEntrance: cWestIn,
  cEquityEntrance: cEquityIn,
});
export const VECTOR_ROUTES = Object.freeze({ arrival:containedArrival, departure:containedDeparture });

// Shuttle corridors preserve labeled driveways and northbound-only feeder flow.
export const SHUTTLE_ACCESS = Object.freeze({
  home: { arrival: permitIn, departure: [...permitIn].reverse() },
  b: { arrival: bIn, departure: bOut },
  c: { arrival: cWestIn, departure: cWestOut },
});
