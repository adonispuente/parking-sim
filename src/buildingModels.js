import * as THREE from 'three';

// Presentation-only campus building models for the 3D World view.
//
// Each building polygon in the current source (images/EverythingClearImage.json,
// traced on images/Clear Image.png in the same 1374x1118 identity frame; shapes
// #36 A, #43 B, #50 C) is split along a chord between two of its EXISTING
// vertices into two roof masses. No coordinate is added, moved or rescaled: the
// union of the masses is the source footprint. Rooftop equipment, windows, trees
// and roof pitch are not modeled.
//
// PROVISIONAL INTERPRETATION — the split chords are NOT surveyed roof seams.
// Each chord joins the two re-entrant vertices where the traced outline narrows
// between masses; where each mass really ends is not established. vertexCount
// must match the current source ring, or buildingMasses returns null and the
// scene silently draws a single generic extrusion.
//
// Heights are ILLUSTRATIVE scene units, not surveyed elevations, and the
// values below are presentation choices kept for readability. 2.4 is the
// prior uniform height. Lot A's main block is drawn taller only because its
// shadow in the clear image looks longer than its south-west
// wing's; shadow length alone does not prove a taller building (sun angle,
// roof equipment, parapets and terrain can all lengthen a shadow). Lot B and
// Lot C masses are drawn equal because no difference was judged reliable,
// which is equally unverified.
export const DEFAULT_HEIGHT = 2.4;
export const BUILDING_PROFILES = {
  'lot a building': {
    vertexCount: 12,
    evidence: 'Provisional: broad main roof plus a narrower wing to the south-west; chord joins re-entrant source vertices 8 and 11 (not a surveyed seam). Main block drawn taller from an apparently longer shadow (illustrative, not a measured height).',
    masses: [
      { name: 'Main block', indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 11], height: 3.0, roof: '#eee9d8', wall: '#b7b9aa' },
      { name: 'South-west wing', indices: [8, 9, 10, 11], height: DEFAULT_HEIGHT, roof: '#e7e3d3', wall: '#aeb1a2' },
    ],
  },
  'lot b building': {
    vertexCount: 8,
    evidence: 'Provisional: two elongated roof masses on one diagonal axis, laterally offset; chord joins re-entrant source vertices 2 and 6 (not a surveyed seam). Flat roofs and equal heights are illustrative.',
    masses: [
      { name: 'North mass', indices: [2, 3, 4, 5, 6], height: DEFAULT_HEIGHT, roof: '#eee9d8', wall: '#b7b9aa' },
      { name: 'South offset mass', indices: [6, 7, 0, 1, 2], height: DEFAULT_HEIGHT, roof: '#e6e2d2', wall: '#adb0a1' },
    ],
  },
  'lot c building': {
    vertexCount: 8,
    evidence: 'Provisional: two broad offset wings; chord joins re-entrant source vertices 3 and 7 along y≈306 (not a surveyed seam). Equal heights are illustrative.',
    masses: [
      { name: 'North wing', indices: [3, 4, 5, 6, 7], height: DEFAULT_HEIGHT, roof: '#eee9d8', wall: '#b7b9aa' },
      { name: 'South wing', indices: [7, 0, 1, 2, 3], height: DEFAULT_HEIGHT, roof: '#e6e2d2', wall: '#adb0a1' },
    ],
  },
};

const key = name => String(name ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i], [x2, z2] = points[(i + 1) % points.length];
    sum += x1 * z2 - x2 * z1;
  }
  return sum / 2;
}

function segmentsCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

export function isSimplePolygon(points) {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue; // adjacent edges share a vertex
      if (segmentsCross(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) return false;
    }
  }
  return true;
}

/**
 * Split an approved footprint into profiled masses. Returns null (the caller
 * keeps the single generic extrusion) unless every check proves the masses
 * exactly tile the source polygon using only its own vertices.
 */
export function buildingMasses(name, points) {
  const profile = BUILDING_PROFILES[key(name)];
  if (!profile || !Array.isArray(points) || points.length !== profile.vertexCount) return null;
  const total = signedArea(points);
  if (!Number.isFinite(total) || Math.abs(total) < 1e-6) return null;
  const masses = profile.masses.map(mass => ({ ...mass, points: mass.indices.map(i => points[i]) }));
  let sum = 0;
  for (const mass of masses) {
    const area = signedArea(mass.points);
    if (Math.sign(area) !== Math.sign(total) || !isSimplePolygon(mass.points)) return null;
    sum += area;
  }
  if (Math.abs(sum - total) > Math.abs(total) * 1e-9) return null;
  const used = new Set(profile.masses.flatMap(mass => mass.indices));
  if (used.size !== points.length) return null;
  return { profile, masses };
}

function outline(group, points, color, y) {
  const geometry = new THREE.BufferGeometry().setFromPoints([...points, points[0]].map(([x, z]) => new THREE.Vector3(x, y, z)));
  group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })));
}

// Chord between masses: the two vertices shared by consecutive masses. Drawn
// as a presentation cue for the provisional split, not a surveyed roof seam.
function seam(a, b) {
  const shared = a.indices.filter(i => b.indices.includes(i));
  return shared.length === 2 ? shared : null;
}

/**
 * World-view building: one extruded mesh per mass (roof + wall materials),
 * roof edge per mass and a darker seam where masses meet. Group origin and
 * local point frame match Scene's drawItem building branch (mesh y = .2).
 * Returns null when the footprint does not match a validated profile.
 */
export function createBuildingModel(item) {
  const split = buildingMasses(item.name, item.points);
  if (!split) return null;
  const group = new THREE.Group();
  for (const mass of split.masses) {
    const shape = new THREE.Shape(mass.points.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: mass.height, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, [
      new THREE.MeshStandardMaterial({ color: mass.roof, roughness: 0.88 }),
      new THREE.MeshStandardMaterial({ color: mass.wall, roughness: 0.95 }),
    ]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.y = 0.2;
    mesh.userData.mass = mass.name;
    group.add(mesh);
    outline(group, mass.points, '#faf4e2', mass.height + 0.22);
  }
  for (let i = 1; i < split.masses.length; i++) {
    const a = split.masses[i - 1], b = split.masses[i];
    const ids = seam(a, b);
    if (!ids) continue;
    const y = Math.min(a.height, b.height) + 0.235;
    const geometry = new THREE.BufferGeometry().setFromPoints(ids.map(id => {
      const [x, z] = item.points[id];
      return new THREE.Vector3(x, y, z);
    }));
    group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#8f8e80' })));
  }
  group.userData.buildingModel = { masses: split.masses.map(m => ({ name: m.name, height: m.height })), illustrativeHeights: true, provisionalSplit: true };
  return group;
}
