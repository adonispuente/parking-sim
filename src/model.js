import { IMAGE_SIZE, WORLD_SCALE, SOURCE_PAIR } from './clearImageSource.js';
import { tracedLayout } from './tracedMap.js';
export const upgradeLotAParking = layout => layout;
export const STORAGE_KEY = 'parking-flow-clear-image-v1';
export const WORLD = { width: IMAGE_SIZE.width*WORLD_SCALE, height: IMAGE_SIZE.height*WORLD_SCALE };
export const COLORS = ['#d2f481', '#83cbd5', '#bba8ed'];
export const TYPES = ['lot', 'spaces', 'barricade', 'position', 'road', 'building', 'surface'];
export const ROLES = ['Greeter', 'Traffic director', 'Lot attendant', 'Pedestrian crossing', 'Team lead'];
const item = (id, type, name, x, z, width, depth, rotation, extra = {}) =>
  ({ id, type, name, x, z, width, depth, rotation, ...extra });

export function initialLayout() {
  return tracedLayout({items:[]});
}

export function makeItem(type, x, z, lotId = '') {
  if (!TYPES.includes(type)) throw new Error('Unknown object type.');
  const sizes = { lot: [18, 16], spaces: [2.1, 4.5], barricade: [6, 0.8], position: [2, 2], road: [16, 3], building: [10, 8], surface: [10, 8] };
  const [width, depth] = sizes[type];
  const extra = type === 'lot' ? { capacity: 40, open: true, color: COLORS[0] }
    : type === 'spaces' ? { count: 8, lotId }
    : type === 'position' ? { role: 'Lot attendant', assignee: '', notes: '' } : {};
  return item(crypto.randomUUID(), type, `New ${type === 'spaces' ? 'parking row' : type}`, x, z, width, depth, 0, extra);
}

export function validateLayout(data) {
  const fail = () => { throw new Error('Invalid layout. Import a Parking Flow v1 JSON export with valid objects.'); };
  const number = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const text = (v, max = 200) => typeof v === 'string' && v.length <= max;
  if (!data || data.version !== 1 || !text(data.name) || !Array.isArray(data.items) || data.items.length > 400) fail();
  const ids = new Set();
  for (const i of data.items) {
    if (!i || !text(i.id, 100) || !i.id || ids.has(i.id) || !TYPES.includes(i.type) || !text(i.name)
      || !number(i.x, 0, WORLD.width) || !number(i.z, 0, WORLD.height)
      || !number(i.width, 0.4, 113) || !number(i.depth, 0.4, Math.max(92, WORLD.height)) || !number(i.rotation, -360, 360)) fail();
    ids.add(i.id);
    if (i.points !== undefined && (!['lot', 'building', 'road', 'surface'].includes(i.type) || !Array.isArray(i.points)
      || i.points.length < (i.type === 'road' ? 2 : 3) || i.points.length > 200
      || !i.points.every(p => Array.isArray(p) && p.length === 2 && p.every(v => number(v, -114, 114))))) fail();
    if (i.roadWidth !== undefined && !number(i.roadWidth, .4, 15)) fail();
    if (i.type === 'surface' && (!i.points || !/^#[0-9a-f]{6}$/i.test(i.color) || !number(i.elevation, .1, .25))) fail();
    if (i.masses !== undefined && (i.type !== 'building' || !Array.isArray(i.masses) || i.masses.length > 20
      || !i.masses.every(m => text(m.name) && number(m.height, .1, 15) && /^#[0-9a-f]{6}$/i.test(m.color)
        && Array.isArray(m.points) && m.points.length >= 3 && m.points.length <= 100
        && m.points.every(p => Array.isArray(p) && p.length === 2 && p.every(v => number(v, -114, 114)))))) fail();
    if (i.type === 'lot' && (!Number.isInteger(i.capacity) || !number(i.capacity, 0, 1000) || typeof i.open !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(i.color))) fail();
    if (i.type === 'spaces' && (!Number.isInteger(i.count) || !number(i.count, 1, 50) || !text(i.lotId, 100))) fail();
    if (i.type === 'position' && (!text(i.role, 100) || !text(i.assignee) || !text(i.notes, 2000))) fail();
  }
  for (const i of data.items) {
    if (i.type === 'spaces' && i.lotId && !data.items.some(lot => lot.id === i.lotId && lot.type === 'lot')) fail();
  }
  // Return only the serializable format, never retain a caller's mutable object.
  return JSON.parse(JSON.stringify({ version: 1, name: data.name, items: data.items, sourcePair:data.sourcePair,
    ...([1,2].includes(data.lotAParkingRevision) ? { lotAParkingRevision: data.lotAParkingRevision } : {}),
    ...(data.lotADraftRevision === 2 ? { lotADraftRevision: 2 } : {}),
    ...(data.eastCampusRevision === 1 ? { eastCampusRevision: 1 } : {}),
    ...(data.shuttleAccessRevision === 1 ? { shuttleAccessRevision: 1 } : {}),
    ...([1,2,3,4].includes(data.tracedMapRevision) ? { tracedMapRevision: data.tracedMapRevision } : {}) }));
}

export function stats(layout) {
  const lots = layout.items.filter(i => i.type === 'lot');
  return {
    lots: lots.length,
    open: lots.filter(i => i.open).length,
    capacity: lots.filter(i => i.open).reduce((sum, i) => sum + i.capacity, 0),
    marked: layout.items.filter(i => i.type === 'spaces').reduce((sum, i) => sum + i.count, 0),
    positions: layout.items.filter(i => i.type === 'position').length,
  };
}

export function deleteItem(layout, id) {
  return { ...layout, items: layout.items.filter(i => i.id !== id).map(i => i.type === 'spaces' && i.lotId === id ? { ...i, lotId: '' } : i) };
}

export function previewRoutes(layout) {
  return layout.items.filter(i => i.type === 'lot' && i.open && i.capacity > 0).map(lot => ({
    lotId: lot.id,
    color: lot.color,
    points: [[108, 87], [108, 7], [42, 7], [42, Math.min(75, lot.z + 18)], [lot.x, Math.min(88, lot.z + 10)]],
  }));
}
