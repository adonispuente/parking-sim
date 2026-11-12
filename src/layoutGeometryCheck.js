// Geometry checks for a parsed layout overlay, shared by `npm run layout:check`
// and the in-app Routes view so both mark the same features as problems.
// Moved verbatim from scripts/layout-check.mjs (M3 S3); behavior unchanged.
// Pure: reads source roofs via sourceRouting, never changes routing state.
import { avoidsObstacles, inPolygon, distance, clearSegment } from './sourceRouting.js';
import { routeAt } from './clearImageSource.js'; // imports only the source JSON: no cycle

export const JOIN_PX = 18; // same as VEHICLE_ROUTE_MANIFEST.thresholds.joinPx
// lane:b-north-direct must end exactly on the bNorth departure source (#11 first point);
// parkingRoutes.js throws at load otherwise, so the checker names it first.
export const B_NORTH_LANE = 'lane:b-north-direct', B_NORTH_JOIN_PX = .001;

export const featureRing = f => f.type === 'rectangle'
  ? (([[x1,y1],[x2,y2]]) => [[x1,y1],[x2,y1],[x2,y2],[x1,y2]])(f.points) : f.points;

const sample = pts => pts.slice(1).flatMap((b,i) => { const a = pts[i], n = Math.max(1, Math.ceil(distance(a,b)));
  return Array.from({ length: n + 1 }, (_, k) => [a[0]+(b[0]-a[0])*k/n, a[1]+(b[1]-a[1])*k/n]); });

// Returns { problems: [{ id, message }], warnings: [string], badIds: Set<id>, blockedIds: Set<id> }.
export function checkLayoutGeometry(layout) {
  const problems = [], warnings = [], badIds = new Set(), blockedIds = new Set();
  // Record a problem against a full feature id (ids contain ':', so never re-parse the message).
  const problem = (id, message) => { badIds.add(id); problems.push({ id, message }); };
  const noDrive = layout.features.filter(f => f.kind === 'nodrive');
  for (const f of layout.features.filter(f => f.kind === 'lane' || f.kind === 'road')) {
    const pts = sample(f.points);
    if (pts.some(p => !avoidsObstacles(p))) problem(f.id, 'crosses a source building roof');
    for (const nd of noDrive) if (pts.some(p => inPolygon(p, featureRing(nd)))) problem(f.id, `crosses ${nd.id}`);
    const ends = { from: f.points[0], to: f.points.at(-1) };
    for (const k of ['from','to']) {
      const ref = f.fields[k]; if (!ref) continue;
      const other = layout.byId.get(ref), near = Math.min(...other.points.map(q => distance(q, ends[k])));
      if (near > JOIN_PX) problem(f.id, `${k} end is ${near.toFixed(1)} px from ${ref} (max ${JOIN_PX})`);
    }
    if (!f.fields.width_px) warnings.push(`${f.id}: no width_px; width not checked (pixels only; no physical clearance is certified)`);
  }
  for (const f of layout.features.filter(f => f.kind === 'pos' || f.kind === 'node' || f.kind === 'stage' && f.type === 'point'))
    if (!avoidsObstacles(f.points[0])) problem(f.id, 'point sits on a source building roof');
  // Same predicate as parkingRoutes bNorthDirectExit: a blocked leg means runtime falls back to the B loop exit.
  const bn = layout.byId.get(B_NORTH_LANE);
  if (bn && bn.points.length === 3) {
    const [start, via, end] = bn.points, target = routeAt(11)[0], gap = distance(end, target);
    if (gap > B_NORTH_JOIN_PX) problem(bn.id, `exit join is ${gap.toFixed(3)} px from the bNorth departure source #11[0]; must be within ${B_NORTH_JOIN_PX} px (the app will not load)`);
    if (!clearSegment(start, via) || !clearSegment(via, target)) {
      blockedIds.add(bn.id);
      warnings.push(`${bn.id}: a leg crosses a source obstacle; B North departures fall back to the B loop exit (configured, not used)`);
    }
  }
  return { problems, warnings, badIds, blockedIds };
}
