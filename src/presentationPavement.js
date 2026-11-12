// World-view (presentation) pavement for the Commander-drawn S5 patches.
// Display only: never imported by routing, collision, occupancy or the layout checker.
// Geometry is the exact PAVEMENT_PATCHES rings (images/layout-overlay.json) through the existing
// traceWorldPoint registration; nothing is simplified, snapped or re-drawn.
import * as THREE from 'three';
import { PAVEMENT_FEATURE_IDS, PAVEMENT_PATCHES } from './layoutOverlay.js';
import { traceWorldPoint } from './tracedMap.js';
import { WORLD_PAVEMENT_MATERIAL } from './presentationMaterials.js';

// Shared World pavement tone under Commander's uniform-color request.
export const PRESENTATION_PAVEMENT_COLOR = WORLD_PAVEMENT_MATERIAL.color;
// Between source road surfaces (.11) and lot surfaces (.15): no coplanar faces, and buildings
// (base .2) still cover the known Lot A roof-overlap sliver from above.
export const PRESENTATION_PAVEMENT_ELEVATION = .13;

export function createPresentationPavement() {
  const group = new THREE.Group();
  group.name = 'presentation-pavement';
  PAVEMENT_PATCHES.forEach((ring, index) => {
    const shape = new THREE.Shape(ring.map(traceWorldPoint).map(([x, z]) => new THREE.Vector2(x, -z)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: PRESENTATION_PAVEMENT_COLOR, roughness: 1, side: THREE.DoubleSide }));
    mesh.position.y = PRESENTATION_PAVEMENT_ELEVATION;
    mesh.receiveShadow = true;
    mesh.userData.presentationPavement = PAVEMENT_FEATURE_IDS[index];
    group.add(mesh);
  });
  return group;
}
