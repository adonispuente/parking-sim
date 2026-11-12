// Lot C hubs are parking/launch anchors, not additional parking capacity.
import drawing from '../images/LotCHubs.json' with { type: 'json' };
import { IMAGE_SIZE } from './clearImageSource.js';

export const C_HUB_SOURCE = 'images/LotCHubs.json';
// Provisional pull-out allowance per hub, not a parking-space capacity.
export const C_HUB_RELEASE_SLOTS = 2;
const freezePoints = points => Object.freeze(points.map(p => Object.freeze([...p])));
if (drawing.imageWidth !== IMAGE_SIZE.width || drawing.imageHeight !== IMAGE_SIZE.height || drawing.shapes.length < 60)
  throw new Error(`${C_HUB_SOURCE}: expected the registered 1374x1118 drawing with at least 60 shapes`);
function bind(index, label, type) {
  const shape = drawing.shapes[index];
  if (shape?.label !== label || shape.shape_type !== type || !shape.points.length ||
      (type === 'point' && shape.points.length !== 1) || (type === 'linestrip' && shape.points.length < 2) ||
      (type === 'polygon' && shape.points.length < 3) ||
      shape.points.some(p => p.length !== 2 || !p.every(Number.isFinite) || p[0] < 0 || p[0] > IMAGE_SIZE.width || p[1] < 0 || p[1] > IMAGE_SIZE.height))
    throw new Error(`${C_HUB_SOURCE}: invalid ${label} at #${index}`);
  return Object.freeze({ sourceIndex: index, points: freezePoints(shape.points) });
}
export const C_HUBS = Object.freeze([51, 52, 53, 54, 55, 56, 57].map(index => {
  const bound = bind(index, 'Lot C Hub', 'point');
  return Object.freeze({ ...bound, id: `c-hub-${index}`, point: bound.points[0], side: [52, 53, 56].includes(index) ? 'north' : 'south' });
}));
export const C_ROUNDABOUT_POSITION = bind(48, 'Lot C rounabout position', 'point').points[0];
export const C_FOUR_WAY = bind(49, 'Lot C round about 4 way', 'polygon').points;
// #58/#59 repeat #40 verbatim; one aisle must not become three alternatives.
export const C_HUB_EXIT_TRACES = Object.freeze([18, 19, 20, 21, 22, 23, 40, 41, 42, 43, 44, 45, 46, 47]
  .map(index => bind(index, 'Lot C Exit Path', 'linestrip')));
export const C_HUB_SHUTTLE_TRACE = bind(50, 'Lot C Shuttle Route new', 'linestrip').points;
export function hubsForZone(zone) {
  const side = zone.endsWith('North') ? 'north' : 'south';
  // Keep the existing first-half fill rule. Northern hubs serve both northern
  // allocations; southern remainder hubs open with the remainder sections.
  return C_HUBS.filter(hub => hub.side === side && (side === 'north' ||
    (zone.startsWith('cFirst') ? [51, 57] : [54, 55]).includes(hub.sourceIndex)));
}
export function cHubForCar(zone, ordinal = 0) {
  const hubs = hubsForZone(zone);
  return hubs[Math.abs(ordinal) % hubs.length];
}
export function cHubById(id) {
  const hub = C_HUBS.find(h => h.id === id);
  if (!hub) throw new Error(`Unknown Lot C hub: ${id}`);
  return hub;
}
