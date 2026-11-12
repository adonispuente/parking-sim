// World presentation only; never a routing, collision or occupancy input.
// Commander requested one pavement color, superseding earlier per-section tones.
// Reuse approved B North #aca9a2; not a claim that all aerial samples match it.
export const WORLD_PAVEMENT_MATERIAL = Object.freeze({
  color: '#aca9a2', roughness: 1,
  evidence: 'Commander-requested uniform treatment; approved B North tone reused',
});

// Illustrative grass, not a measured species, height or surveyed median.
export const WORLD_MEDIAN_GRASS_COLOR = '#6f8758';
export const SURFACE_MATERIALS = Object.freeze(Object.fromEntries(
  ['clear-41', 'clear-42', 'clear-44'].map(id => [id, WORLD_PAVEMENT_MATERIAL]),
));

export function worldSurfaceMaterial(_id) {
  return WORLD_PAVEMENT_MATERIAL;
}
