// Parking anchors from the user's drawing; section capacities remain authoritative.
import drawing from '../images/ABHubs.json' with { type: 'json' };
import { IMAGE_SIZE } from './clearImageSource.js';

export const AB_HUB_SOURCE = 'images/ABHubs.json';
// 78 shapes: Commander added #77 "AddNorthRoute" (2026-11-12, also saved as
// images/NewARoute.json). Shapes #0-#76 are unchanged from the 77-shape revision.
if (drawing.imageWidth !== IMAGE_SIZE.width || drawing.imageHeight !== IMAGE_SIZE.height || drawing.shapes.length !== 78)
  throw new Error(`${AB_HUB_SOURCE}: expected the registered 1374x1118, 78-shape drawing`);

const zones = {
  aNorth: [73, 74, 75], aSouth: [71, 72, 76],
  bSouth: [67], bBanana: [65, 66], bPocket: [68], bNorth: [60, 61, 62, 63, 64, 69],
};
export const AB_HUBS = Object.freeze(Object.entries(zones).flatMap(([zone, indices]) =>
  indices.map((index, ordinal) => {
    const shape = drawing.shapes[index], lot = zone[0];
    if (shape?.label !== (lot === 'a' ? 'Lot A Hub' : 'Lot B hub') ||
        shape.shape_type !== 'point' || shape.points.length !== 1 ||
        shape.points[0].length !== 2 || !shape.points[0].every(Number.isFinite) ||
        shape.points[0][0] < 0 || shape.points[0][0] > IMAGE_SIZE.width ||
        shape.points[0][1] < 0 || shape.points[0][1] > IMAGE_SIZE.height)
      throw new Error(`Invalid A/B hub #${index}`);
    return Object.freeze({
      id: `${lot}-hub-${index}`, lot, zone, sourceIndex: index,
      point: Object.freeze([...shape.points[0]]),
      name: `${lot.toUpperCase()} ${zone.slice(1)} Hub ${ordinal + 1}`,
    });
  })));

export const abHubsForZone = zone => AB_HUBS.filter(h => h.zone === zone);
export function abHubForCar(zone, ordinal = 0) {
  const hubs = abHubsForZone(zone);
  return hubs.length ? hubs[Math.abs(ordinal) % hubs.length] : undefined;
}
export function abHubById(id) {
  const hub = AB_HUBS.find(h => h.id === id);
  if (!hub) throw new Error(`Unknown A/B hub: ${id}`);
  return hub;
}

export const A_HUB_TRACES = Object.freeze([16, 17, 24, 25, 26, 27]);
export function abHubTrace(index) {
  const shape = drawing.shapes[index];
  if (!A_HUB_TRACES.includes(index) ||
      shape?.shape_type !== 'linestrip' || shape.points.length < 2 ||
      shape.points.some(p => p.length !== 2 || !p.every(Number.isFinite) ||
        p[0] < 0 || p[0] > IMAGE_SIZE.width || p[1] < 0 || p[1] > IMAGE_SIZE.height))
    throw new Error(`Invalid A/B aisle trace #${index}`);
  return shape.points;
}

// Commander-drawn Lot A North inbound lane (2026-11-12). It runs beside the
// drawn North exit through the Main section, which carries both directions.
export const A_NORTH_ENTRY_TRACE = 77;
export function aNorthEntryTrace() {
  const shape = drawing.shapes[A_NORTH_ENTRY_TRACE];
  if (shape?.label !== 'AddNorthRoute' || shape.shape_type !== 'linestrip' || shape.points.length < 2 ||
      shape.points.some(p => p.length !== 2 || !p.every(Number.isFinite) ||
        p[0] < 0 || p[0] > IMAGE_SIZE.width || p[1] < 0 || p[1] > IMAGE_SIZE.height))
    throw new Error(`${AB_HUB_SOURCE}: #${A_NORTH_ENTRY_TRACE} is not the AddNorthRoute linestrip`);
  return shape.points;
}
