// Wide parking-lot aisles (Commander, 2026-11-09): the inside of Lot C is massive and most
// of its roads fit about five car widths, so cars can steer around each other there.
// The traffic engine follows single centerlines, so two cars crossing inside Lot C can
// "overlap" on paper and lock each other (car 922 / 2172 / 2174 at the cWest arrival aisle).
// Inside a wide aisle the cycle breaker may let a blocked vehicle pull around.
// The user also confirmed the staffed C entrance is wide enough to clear a
// shuttle turn; only its local, drivable turn apron receives the same behavior.
import { fromWorld, shapeAt } from './clearImageSource.js';
import { C_ENTRANCE_AREA } from './cEntranceControl.js';
import { inPolygon, drivableAllowed } from './sourceRouting.js';
import { onLotGround } from './shuttleRoutes.js';

export const WIDE_AISLE_LOTS = ['c'];
// Lot A North interior (section polygon, source #39), on drivable ground only.
// Commander 2026-11-12: the Lot A North/Main section "allows for 2 directions of
// traffic". With North arrivals no longer metered against North exits at Main,
// a car pulling into a hub and one pulling out of it met on the hub centreline and
// closed a wait cycle (cars 997/158/70, 11:00 run). Only the cycle breaker uses
// this; ordinary yields are unchanged. PROVISIONAL: polygon is the drawn section.
export const WIDE_AISLE_SECTIONS = Object.freeze({ aNorth: 39 });
const sectionRings = Object.fromEntries(Object.entries(WIDE_AISLE_SECTIONS).map(([zone, shape]) => [zone, shapeAt(shape).points]));
const inWideSection = p => Object.values(sectionRings).some(ring => inPolygon(p, ring) && drivableAllowed(p));

export function attachWideAisles(state) {
  const position=car=>{
    const lane=state.lanes[car.lane];if(!lane)return null;
    const p=lane.path.getPointAt(Math.max(0,Math.min(1,car.distance/lane.length)));
    return fromWorld([p.x,p.z]);
  };
  state.inWideAisle=car=>{
    const p=position(car);
    return !!p&&WIDE_AISLE_LOTS.some(lot=>onLotGround(lot,p));
  };
  const inEntrance=car=>{
    const p=position(car);return !!p&&inPolygon(p,C_ENTRANCE_AREA)&&drivableAllowed(p);
  };
  const inSection=car=>{const p=position(car);return !!p&&inWideSection(p);};
  state.canPullAroundInWideAisle=(car,other)=>
    (state.inWideAisle(car)&&state.inWideAisle(other)) ||
    (inSection(car)&&inSection(other)) ||
    // Only the shuttle gets the extra entrance-apron maneuver. Ordinary cars
    // stay on their lanes; the interior hub launch allowance is unchanged.
    (car.fleetBus===true&&inEntrance(car)&&inEntrance(other));
}
