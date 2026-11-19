// Map "area names": one readable label per parking area so visitors can tell
// Lot A North from Black Permit at a glance. Pure geometry only — Scene.jsx
// turns these anchors into sprites.

/**
 * Areas to name, in priority order (earlier wins when labels collide on screen).
 * `source` is the traced LabelMe region label; `pieces` is a C_ZONE_PIECES key
 * for Lot C South, which sits on the remainder beyond the first-filled half.
 * `align: 'top-center'` keeps the label in a narrow strip at the region's
 * horizontal centre (for regions that wrap around a building).
 */
export const AREA_LABELS = Object.freeze([
  { name: 'Lot A North', lot: 'a', source: 'Lot A north' },
  { name: 'Lot A South', lot: 'a', source: 'Lot A south' },
  { name: 'Lot B North', lot: 'b', source: 'Lot B North' },
  // Lot C North wraps around the C building, so its label is pinned top-centre.
  // ("Lot C First Half" is only the simulation's fill order, not a real spot — not named.)
  { name: 'Lot C North', lot: 'c', source: 'Lot C North', align: 'top-center' },
  { name: 'Lot C South', lot: 'c', pieces: 'cSouth' },
  { name: 'Lot B South', lot: 'b', source: 'Lot B South' },
  { name: 'Lot B Banana', lot: 'b', source: 'Lot B banana' },
  { name: 'Black Permit', lot: 'a', source: 'Lot A black permit' },
  { name: 'Lot B Pocket', lot: 'b', source: 'Lot B pocket' },
]);

export function pointInPolygon([x, z], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i],
      [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToSegment([px, pz], [ax, az], [bx, bz]) {
  const dx = bx - ax,
    dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function edgeDistance(point, ring) {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    best = Math.min(best, distanceToSegment(point, ring[j], ring[i]));
  return best;
}

export function polygonArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return Math.abs(area) / 2;
}

/**
 * The interior point farthest from every edge (approximate "pole of
 * inaccessibility"). Unlike the centroid it stays inside concave shapes such
 * as the Lot B banana, so the label always sits on the area it names.
 */
export function labelPoint(ring, { align, samples = 24 } = {}) {
  const xs = ring.map((p) => p[0]),
    zs = ring.map((p) => p[1]);
  let [minX, maxX, minZ, maxZ] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...zs),
    Math.max(...zs),
  ];
  if (align === 'top-center') {
    // Search only a strip ±8% of the width around the horizontal centre; the
    // most interior point there lands in the band above any central building.
    const centre = (minX + maxX) / 2,
      half = (maxX - minX) * 0.08;
    [minX, maxX] = [centre - half, centre + half];
  }
  let best = null,
    bestDistance = -1;
  // Coarse grid, then one refinement pass around the winner.
  for (let pass = 0; pass < 2; pass++) {
    const stepX = (maxX - minX) / samples,
      stepZ = (maxZ - minZ) / samples;
    for (let i = 0; i <= samples; i++)
      for (let k = 0; k <= samples; k++) {
        const point = [minX + i * stepX, minZ + k * stepZ];
        if (!pointInPolygon(point, ring)) continue;
        const distance = edgeDistance(point, ring);
        if (distance > bestDistance) [best, bestDistance] = [point, distance];
      }
    if (!best) break;
    [minX, maxX, minZ, maxZ] = [best[0] - stepX, best[0] + stepX, best[1] - stepZ, best[1] + stepZ];
  }
  if (best) return best;
  return [xs.reduce((a, b) => a + b, 0) / xs.length, zs.reduce((a, b) => a + b, 0) / zs.length];
}

/**
 * Resolve every AREA_LABELS entry to a world-space anchor.
 * @param features traced regions ({ label, points } in world coordinates)
 * @param zonePieces C_ZONE_PIECES (rings in trace coordinates)
 * @param toWorld converts a trace point to world coordinates
 */
export function areaLabelAnchors(features, zonePieces = {}, toWorld = (p) => p) {
  const anchors = [];
  for (const area of AREA_LABELS) {
    let rings = [];
    if (area.pieces) rings = (zonePieces[area.pieces] ?? []).map((ring) => ring.map(toWorld));
    else {
      const feature = features.find((f) => f.label.toLowerCase() === area.source.toLowerCase());
      if (feature) rings = [feature.points];
    }
    const ring = rings
      .filter((r) => r.length >= 3)
      .sort((a, b) => polygonArea(b) - polygonArea(a))[0];
    if (ring) anchors.push({ ...area, point: labelPoint(ring, { align: area.align }) });
  }
  return anchors;
}

/**
 * Greedy declutter: walk labels in priority order and hide any whose screen
 * rectangle ({ x, y, w, h }, centred) overlaps one already shown.
 * Returns a visibility flag per input rect.
 */
export function declutter(rects, padding = 4) {
  const shown = [];
  return rects.map((rect) => {
    if (!rect) return false;
    const hit = shown.some(
      (other) =>
        Math.abs(rect.x - other.x) * 2 < rect.w + other.w + padding * 2 &&
        Math.abs(rect.y - other.y) * 2 < rect.h + other.h + padding * 2,
    );
    if (!hit) shown.push(rect);
    return !hit;
  });
}

/** Friendly names for shuttle pickups, keyed by SHUTTLE_STOPS id. */
export const SHUTTLE_PICKUP_NAMES = Object.freeze({
  home: 'Shuttle Home · Lot A',
  bSouth: 'Shuttle · B South',
  bNorth: 'Shuttle · B North',
  cRoundabout: 'Shuttle · C Roundabout',
  cSouth: 'Shuttle · C South',
  cNorth: 'Shuttle · C North',
});

/** How many of the main lot areas outrank shuttle pickups when labels collide. */
const PRIMARY_AREA_COUNT = 5;

/**
 * Every map name in declutter priority order: the main lot areas first, then
 * shuttle pickups, then the smaller areas (Banana, Black Permit, Pocket…).
 * @param stops SHUTTLE_STOPS ({ id, lot, point } in trace coordinates)
 */
export function mapLabelEntries(features, zonePieces = {}, toWorld = (p) => p, stops = []) {
  const areas = areaLabelAnchors(features, zonePieces, toWorld).map((a) => ({
    ...a,
    kind: 'area',
  }));
  const pickups = stops
    .filter((stop) => SHUTTLE_PICKUP_NAMES[stop.id])
    .map((stop) => ({
      kind: 'shuttle',
      id: stop.id,
      lot: stop.lot,
      name: SHUTTLE_PICKUP_NAMES[stop.id],
      point: toWorld(stop.point),
    }));
  return [...areas.slice(0, PRIMARY_AREA_COUNT), ...pickups, ...areas.slice(PRIMARY_AREA_COUNT)];
}
