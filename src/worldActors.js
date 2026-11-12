import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Factories own their geometry, materials and generated textures. Scene's release()
// traverses and disposes these resources when an actor leaves the scene.
const colors = ['#788b82', '#668c98', '#a17870', '#b4a17f', '#7c8294', '#9aaca1'];

function hashId(value) {
  let hash = 2166136261;
  for (const char of String(value ?? '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function material(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });
}

function block(parent, size, color, position, roughness) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, roughness));
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function instances(parent, geometry, color, positions, rotation) {
  const mesh = new THREE.InstancedMesh(geometry, material(color), positions.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < positions.length; i++) {
    dummy.position.set(...positions[i]);
    dummy.rotation.set(...rotation);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

// Bake stationary detail, including every instance transform, into one mesh.
// A bus's textured sign remains a separate MeshBasicMaterial mesh.
function mergeActorMeshes(group) {
  const parts = group.children.filter(child => child.material instanceof THREE.MeshStandardMaterial);
  const geometries = [];
  const instanceMatrix = new THREE.Matrix4();
  const transform = new THREE.Matrix4();
  try {
    for (const part of parts) {
      part.updateMatrix();
      const count = part.isInstancedMesh ? part.count : 1;
      for (let i = 0; i < count; i++) {
        if (part.isInstancedMesh) {
          part.getMatrixAt(i, instanceMatrix);
          transform.multiplyMatrices(part.matrix, instanceMatrix);
        } else {
          transform.copy(part.matrix);
        }
        const geometry = part.geometry.clone();
        geometries.push(geometry);
        geometry.applyMatrix4(transform);
        const color = new Float32Array(geometry.getAttribute('position').count * 3);
        for (let vertex = 0; vertex < color.length; vertex += 3) {
          color[vertex] = part.material.color.r;
          color[vertex + 1] = part.material.color.g;
          color[vertex + 2] = part.material.color.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
      }
    }
    const merged = mergeGeometries(geometries);
    if (!merged) throw new Error('Could not merge actor geometry');
    const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, roughness: 0.82, metalness: 0.04,
    }));
    for (const part of parts) {
      group.remove(part);
      part.geometry.dispose();
      part.material.dispose();
    }
    group.add(mesh);
  } finally {
    for (const geometry of geometries) geometry.dispose();
  }
}

function lights(group, width, depth, y) {
  const x = width / 2 - 0.12;
  const z = depth / 2 - 0.016;
  const geometry = new THREE.BoxGeometry(0.105, 0.065, 0.02);
  instances(group, geometry, '#f8ebc9', [[-x, y, z], [x, y, z]], [0, 0, 0]);
  instances(group, new THREE.BoxGeometry(0.105, 0.065, 0.02), '#ba625f',
    [[-x, y, -z], [x, y, -z]], [0, 0, 0]);
}

function wheels(group, width, depth, radius, frontZ, rearZ, y) {
  const x = width / 2 - 0.05;
  instances(group, new THREE.CylinderGeometry(radius, radius, 0.09, 10), '#273035',
    [[-x, y, frontZ], [x, y, frontZ], [-x, y, rearZ], [x, y, rearZ]],
    [0, 0, Math.PI / 2]);
}

function busMarking(group, busNumber) {
  if (typeof document === 'undefined' || !document.createElement) return;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#f8f2e9';
  ctx.fillRect(0, 0, 256, 80);
  ctx.fillStyle = '#493754';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const suffix = busNumber == null ? '' : ` ${String(busNumber).slice(0, 8)}`;
  ctx.fillText(`BUS${suffix}`, 128, 42, 246);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.userData.generated = true;
  // One material and one plane means release() disposes the generated map once.
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.49, 0.15),
    new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
  sign.rotation.y = Math.PI / 2;
  sign.position.set(0.43, 0.43, 0.36);
  group.add(sign);
}

/** Local +Z is forward; root origin matches Scene's existing body-centred vehicle anchor. */
export function createVehicleVisual(car = {}) {
  const group = new THREE.Group();
  const bus = Boolean(car.fleetBus);
  const visual = new THREE.Group();
  // The simulation positions the root near y=.6; its existing body is centred
  // at local y=0, so retain that anchor instead of raising the whole actor.
  visual.position.y = bus ? -0.31 : -0.27;
  group.add(visual);
  const width = bus ? 0.88 : 0.65;
  const depth = bus ? 2.9 : 1.35;
  // Leave the exact existing simulation footprint untouched, including wheels and lights.
  const paint = bus ? '#735875' : car.badge ? '#c6aa6b' : colors[hashId(car.id) % colors.length];
  block(visual, [width, bus ? 0.48 : 0.3, depth], paint, [0, bus ? 0.31 : 0.27, 0]);
  if (bus) {
    block(visual, [0.76, 0.12, 2.67], '#e5d9dc', [0, 0.6, 0]);
    block(visual, [0.75, 0.26, 2.15], '#344750', [0, 0.77, -0.08], 0.34);
    block(visual, [0.76, 0.055, 2.32], '#eee4d9', [0, 0.925, -0.08]);
    // Window dividers repeat on both sides; baked with the body below.
    instances(visual, new THREE.BoxGeometry(0.015, 0.23, 0.035), '#e5d9dc',
      [-0.94, -0.32, 0.3, 0.91].flatMap(z => [[-0.385, 0.78, z], [0.385, 0.78, z]]), [0, 0, 0]);
    block(visual, [0.65, 0.23, 0.013], '#344750', [0, 0.75, 1.443], 0.34);
    wheels(visual, width, depth, 0.17, 1.2, -1.16, 0.17);
    lights(visual, width, depth, 0.36);
    busMarking(visual, car.busNumber);
  } else {
    block(visual, [0.53, 0.21, 0.76], '#344b52', [0, 0.51, -0.07], 0.35);
    block(visual, [0.49, 0.055, 0.61], '#c4c6b4', [0, 0.645, -0.07]);
    // Body-colored hood and boot keep the glazing below the vehicle footprint.
    block(visual, [0.54, 0.025, 0.23], paint, [0, 0.435, 0.535]);
    wheels(visual, width, depth, 0.13, 0.48, -0.46, 0.13);
    lights(visual, width, depth, 0.30);
  }
  mergeActorMeshes(visual);
  return group;
}

/** A static, illustrative safety-vest worker; placement is the caller's decision. */
export function createVolunteerVisual() {
  const group = new THREE.Group();
  const trousers = '#3b4a51';
  block(group, [0.14, 0.5, 0.16], trousers, [-0.12, 0.38, 0]);
  block(group, [0.14, 0.5, 0.16], trousers, [0.12, 0.38, 0]);
  block(group, [0.2, 0.09, 0.26], '#303b3e', [-0.12, 0.085, 0.04]);
  block(group, [0.2, 0.09, 0.26], '#303b3e', [0.12, 0.085, 0.04]);
  block(group, [0.42, 0.5, 0.23], '#bfa564', [0, 0.86, 0]);
  block(group, [0.38, 0.055, 0.243], '#f0e9c9', [0, 0.94, 0]);
  block(group, [0.38, 0.055, 0.243], '#f0e9c9', [0, 0.77, 0]);
  block(group, [0.12, 0.41, 0.13], '#566a69', [-0.29, 0.88, 0]);
  block(group, [0.12, 0.41, 0.13], '#566a69', [0.29, 0.88, 0]);
  block(group, [0.13, 0.115, 0.13], '#ac8065', [-0.29, 0.615, 0]);
  block(group, [0.13, 0.115, 0.13], '#ac8065', [0.29, 0.615, 0]);
  block(group, [0.12, 0.11, 0.12], '#ac8065', [0, 1.18, 0]);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), material('#ac8065'));
  head.position.set(0, 1.35, 0);
  group.add(head);
  block(group, [0.31, 0.06, 0.27], '#33444a', [0, 1.49, -0.015]);
  mergeActorMeshes(group);
  return group;
}
