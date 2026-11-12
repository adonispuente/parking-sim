// Commander-approved NoMedians preview, World presentation only.
// Not a source of drivable pavement, occupancy, routes, capacity or obstacles.
import * as THREE from 'three';
import drawing from '../images/NoMedians.json' with { type: 'json' };
import { shapeAt, IMAGE_SIZE, toWorld } from './clearImageSource.js';
import { worldSurfaceMaterial, WORLD_MEDIAN_GRASS_COLOR } from './presentationMaterials.js';
import { tessellatePresentationFill } from './presentationFill.js';

const PAVEMENT_BINDINGS = Object.freeze([
  [4, 'Lot B Entrance detailed layout'],
  [5, 'Lot A North With Medians excluded'],
  [6, 'Lot A south excluding medians'],
  [7, 'Lot A shuttle path and round about'],
  [8, 'Lot A black permit avoiding medians'],
  [11, 'Lot B with medians removed'],
  [12, 'Lot A North pedestrian area road'],
]);
export const REPLACED_WORLD_SURFACES = Object.freeze(['clear-37', 'clear-38', 'clear-39', 'clear-40', 'clear-41', 'clear-42', 'clear-44']);
export const PRESENTATION_LOT_SOURCE = 'images/NoMedians.json';
export const PRESENTATION_LOT_FILL_RULE = 'evenodd';
export const PRESENTATION_LOT_ELEVATION = .15;

if (drawing.imageWidth !== IMAGE_SIZE.width || drawing.imageHeight !== IMAGE_SIZE.height) {
  throw new Error('NoMedians presentation drawing must use the registered source frame.');
}
export const PRESENTATION_LOT_RINGS = Object.freeze([
  ...PAVEMENT_BINDINGS.map(([index, label]) => {
    const shape = drawing.shapes[index];
    if (shape?.label !== label || shape.shape_type !== 'polygon') throw new Error(`NoMedians presentation binding changed at #${index}`);
    return { id: `nomedians-${index}`, sourceIndex: index, kind: 'pavement', points: shape.points };
  }),
  ...[36, 43].map(index => ({ id: `building-${index}`, kind: 'exclude', points: shapeAt(index).points })),
]);
export const PRESENTATION_LOT_FILL = tessellatePresentationFill(PRESENTATION_LOT_RINGS);

// Color exposed ground inside the old lot footprints, excluding every approved
// pavement piece and both buildings. Includes landscape margins, not just medians.
// No new boundaries or physical obstacles are inferred from these display gaps.
export const PRESENTATION_GRASS_RINGS = Object.freeze([
  ...REPLACED_WORLD_SURFACES.map(id => ({
    id: `grass-${id}`, kind: 'pavement', points: shapeAt(Number(id.slice(6))).points,
  })),
  ...PRESENTATION_LOT_RINGS.map(ring => ({ ...ring, kind: 'exclude' })),
]);
export const PRESENTATION_GRASS_FILL = tessellatePresentationFill(PRESENTATION_GRASS_RINGS);

export function createPresentationLots() {
  const group = new THREE.Group();
  group.name = 'nomedians-presentation-lots';
  const grassPositions = [];
  for (const { vertices } of PRESENTATION_GRASS_FILL.batches) {
    for (let i = 0; i < vertices.length; i += 2) {
      const [x, z] = toWorld([vertices[i], vertices[i + 1]]);
      grassPositions.push(x, 0, z);
    }
  }
  if (grassPositions.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3));
    geometry.computeVertexNormals();
    const grass = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: WORLD_MEDIAN_GRASS_COLOR, roughness: 1, side: THREE.DoubleSide,
    }));
    grass.position.y = .02;
    grass.receiveShadow = true;
    grass.userData.presentationGrass = 'source-defined-lot-gaps';
    group.add(grass);
  }
  for (const { material, vertices } of PRESENTATION_LOT_FILL.batches) {
    const positions = [];
    for (let i = 0; i < vertices.length; i += 2) {
      const [x, z] = toWorld([vertices[i], vertices[i + 1]]);
      positions.push(x, 0, z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const presented = worldSurfaceMaterial(material);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: presented?.color ?? '#606a69', roughness: presented?.roughness ?? 1, side: THREE.DoubleSide,
    }));
    mesh.position.y = PRESENTATION_LOT_ELEVATION;
    mesh.receiveShadow = true;
    mesh.userData.presentationLot = material;
    mesh.userData.fillRule = PRESENTATION_LOT_FILL_RULE;
    group.add(mesh);
  }
  return group;
}
