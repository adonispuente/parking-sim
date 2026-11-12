// Wide parking-lot aisles (Commander, 2026-11-09): the inside of Lot C is massive and most
// of its roads fit about five car widths, so cars can steer around each other there.
// The traffic engine follows single centerlines, so two cars crossing inside Lot C can
// "overlap" on paper and lock each other (car 922 / 2172 / 2174 at the cWest arrival aisle).
// Inside a wide aisle the engine's cycle breaker may let one blocked vehicle pull around,
// instead of requiring a clear centerline. Outside these lots nothing changes.
import { fromWorld } from './clearImageSource.js';
import { onLotGround } from './shuttleRoutes.js';

export const WIDE_AISLE_LOTS = ['c'];

export function attachWideAisles(state) {
  state.inWideAisle = car => {
    const lane = state.lanes[car.lane];
    if (!lane) return false;
    const p = lane.path.getPointAt(Math.max(0, Math.min(1, car.distance / lane.length)));
    const px = fromWorld([p.x, p.z]);
    return WIDE_AISLE_LOTS.some(lot => onLotGround(lot, px));
  };
}
