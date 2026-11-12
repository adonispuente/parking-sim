// M3 S3: read-only display descriptors for the layout overlay in the Routes view.
// Pure pixel geometry; Scene.jsx maps points with traceWorldPoint. Nothing here
// feeds routing. Colours match `npm run layout:check` so the app and the SVG
// review image agree: confidence colour, red = geometry problem, dashed = rule area.
import { LAYOUT, RUNTIME_FEATURES, OVERLAY_FILE } from './layoutOverlay.js';
import { checkLayoutGeometry, featureRing } from './layoutGeometryCheck.js';

export const CONFIDENCE_COLORS = Object.freeze({ confirmed: '#2e9d4f', estimated: '#e3a21a', unknown: '#8a8a8a' });
export const PROBLEM_COLOR = '#e0312b';
export const UNSET_COLOR = '#3a6fd8';

const KIND_MEANING = Object.freeze({
  stage: 'staging rule area', oneway: 'one-way rule area', lane: 'directed lane (point order = travel)',
  road: 'two-way road', nodrive: 'no-drive area', pave: 'drivable patch', stop: 'stop / hold line',
  node: 'junction', pos: 'position point',
});
// Plain meanings the Commander and SPARTAN required to be explicit for the migrated features.
const FEATURE_MEANING = Object.freeze({
  'stage:c-throat': 'staging exclusion · not a median',
  'stage:c-staging-target': 'Lot C staging target',
  'oneway:feeder-north': 'northbound rule band · not surveyed',
  'lane:b-north-direct': 'north-row launch · not surveyed',
});
// Image north is -y (traceWorldPoint maps image y to world z).
const DIRECTION = Object.freeze({ north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] });
const ARROW_PX = 16;
const DEFAULT_LAYOUT = LAYOUT, DEFAULT_RUNTIME = RUNTIME_FEATURES;

// Chevron (left wing, tip, right wing) pointing along unit vector d, tip at `tip`.
export function chevron(tip, d, size = ARROW_PX) {
  const len = Math.hypot(d[0], d[1]) || 1, [ux, uy] = [d[0] / len, d[1] / len], [px, py] = [-uy, ux];
  const back = [tip[0] - ux * size, tip[1] - uy * size];
  return [[back[0] + px * size * .6, back[1] + py * size * .6], tip, [back[0] - px * size * .6, back[1] - py * size * .6]];
}
const centre = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; };

export function overlayDisplay(layout = DEFAULT_LAYOUT, runtimeIds = DEFAULT_RUNTIME) {
  const check = checkLayoutGeometry(layout);
  const features = layout.features.filter(f => f.kind !== 'meta').map(f => {
    const runtime = runtimeIds.includes(f.id), problem = check.badIds.has(f.id);
    // Configured but skipped at runtime (blocked leg): say so instead of claiming it is in use.
    const blocked = runtime && (check.blockedIds?.has(f.id) ?? false), used = runtime && !blocked;
    const confidence = f.fields.confidence ?? 'unset';
    const color = problem ? PROBLEM_COLOR : CONFIDENCE_COLORS[confidence] ?? UNSET_COLOR;
    const area = f.type === 'rectangle' || f.type === 'polygon';
    const arrows = [];
    if (f.kind === 'lane') {
      const a = f.points.at(-2), b = f.points.at(-1), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      arrows.push(chevron(mid, [b[0] - a[0], b[1] - a[1]]));
    }
    if (f.kind === 'oneway' && DIRECTION[f.fields.direction]) {
      const c = centre(f.points), d = DIRECTION[f.fields.direction];
      // A short column of chevrons reads as a direction band in both Top and 3D.
      for (const off of [-60, 0, 60]) arrows.push(chevron([c[0] + d[0] * off, c[1] + d[1] * off], d));
    }
    // A one-way band hugs the image edge; label it just east of the band so it stays on the map.
    const ringPts = area ? featureRing(f) : null;
    const labelAt = f.type === 'point' ? f.points[0]
      : f.kind === 'oneway' ? [Math.max(...ringPts.map(p => p[0])) + 60, centre(ringPts)[1]]
      : area ? centre(ringPts) : f.points.at(-1);
    return Object.freeze({
      id: f.id, kind: f.kind, type: f.type, runtime, used, blocked,
      status: blocked ? 'runtime · configured, not used (blocked)' : runtime ? 'runtime' : 'advisory',
      confidence, evidence: f.fields.evidence ?? 'unset', color, problem,
      problems: check.problems.filter(p => p.id === f.id).map(p => p.message),
      dashed: f.kind === 'stage' || f.kind === 'oneway',
      ring: area ? featureRing(f) : null, path: !area && f.type !== 'point' ? f.points : null,
      point: f.type === 'point' ? f.points[0] : null, arrows, labelAt,
      label: `${f.id} · ${blocked ? 'runtime · configured, not used (blocked)' : runtime ? 'runtime' : 'advisory'}`,
      meaning: f.kind === 'pos' ? `${f.fields.staffed === 'true' ? 'staffed role' : 'unstaffed'} · advisory only`
        : FEATURE_MEANING[f.id] ?? KIND_MEANING[f.kind] ?? f.kind, note: f.fields.note ?? '',
    });
  });
  return Object.freeze({ file: OVERLAY_FILE, features: Object.freeze(features),
    problems: check.problems, warnings: check.warnings, ok: check.problems.length === 0 });
}

// Compact, JSON-safe summary for canvas[data-layout-overlay] and browser checks.
export const overlaySummary = view => ({ file: view.file, ok: view.ok, problems: view.problems.length,
  features: view.features.map(f => ({ id: f.id, status: f.status, confidence: f.confidence, problem: f.problem })) });
