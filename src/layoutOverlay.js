// M3 layout/operations overlay: a second LabelMe file drawn on the same image
// as the frozen 65-shape source (images/EverythingClearImage.json, never edited).
// Shapes carry a "<kind>:<name>" label and key=value lines in `description`.
//
// This module is PURE parsing + named runtime parameters. It imports only the
// source constants (no routing modules), so routing can import it without a
// cycle. Geometry checks against roofs/joins live in scripts/layout-check.mjs.
//
// Runtime reads ONLY the features in RUNTIME_FEATURES. Every other validated
// feature is advisory until code explicitly adopts it.
import overlay from '../images/layout-overlay.json' with { type: 'json' };
import { IMAGE_SIZE, SOURCE_PAIR } from './clearImageSource.js';

export const OVERLAY_FILE = 'images/layout-overlay.json';
export const OVERLAY_VERSION = 1;
export const EVIDENCE = Object.freeze(['traced','measured','commander-observed','inferred','approved-abstraction']);
export const CONFIDENCE = Object.freeze(['confirmed','estimated','unknown']);
const COMMON = ['evidence','confidence','note'];
// kind -> allowed LabelMe shape types, min points, extra allowed keys, required extra keys
export const KINDS = Object.freeze({
  meta:    { types:['point'], min:1, keys:['version','source_pair'], required:['version','source_pair'], common:false },
  lane:    { types:['linestrip','line'], min:2, keys:['from','to','classes','width_px'], required:[] },
  road:    { types:['linestrip','line'], min:2, keys:['classes','width_px'], required:[] },
  nodrive: { types:['polygon','rectangle'], min:2, keys:[], required:[] },
  pave:    { types:['polygon','rectangle'], min:2, keys:[], required:[] },
  stop:    { types:['line'], min:2, keys:['controller'], required:[] },
  node:    { types:['point'], min:1, keys:[], required:[] },
  pos:     { types:['point'], min:1, keys:['role','staffed'], required:['role','staffed'] },
  stage:   { types:['rectangle','point'], min:1, keys:['role'], required:['role'] },
  oneway:  { types:['rectangle'], min:2, keys:['direction','tolerance_px'], required:['direction','tolerance_px'] },
});
export const PAVEMENT_FEATURE_IDS = Object.freeze(['pave:lot-a-entrance-road','pave:equity-exit2-driveway']);
export const B_NORTH_DIRECT_ID = 'lane:b-north-direct';
export const RUNTIME_FEATURES = Object.freeze(['stage:c-throat','stage:c-staging-target','oneway:feeder-north',...PAVEMENT_FEATURE_IDS,B_NORTH_DIRECT_ID]);
// Exact point counts per LabelMe shape type (null = only the kind's minimum applies).
const TYPE_POINTS = Object.freeze({ point: [1, 1], line: [2, 2], rectangle: [2, 2], polygon: [3, Infinity], linestrip: null });

export class LayoutOverlayError extends Error {
  constructor(problems) {
    super(`Layout overlay invalid (${problems.length} problem${problems.length===1?'':'s'}):\n- ${problems.join('\n- ')}`);
    this.name = 'LayoutOverlayError'; this.problems = problems;
  }
}

export function parseDescription(text='') {
  const out = {}, bad = [];
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) { bad.push(line); continue; }
    const key = line.slice(0, eq).trim(), value = line.slice(eq + 1).trim();
    if (key in out) bad.push(`duplicate key ${key}`); else out[key] = value;
  }
  return { fields: out, bad };
}

const bounds = pts => ({ xMin: Math.min(...pts.map(p=>p[0])), xMax: Math.max(...pts.map(p=>p[0])),
  yMin: Math.min(...pts.map(p=>p[1])), yMax: Math.max(...pts.map(p=>p[1])) });

// Pure: returns { features, byId } or throws LayoutOverlayError listing every problem.
export function parseOverlay(doc, { requireRuntime = true } = {}) {
  const problems = [];
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.shapes)) throw new LayoutOverlayError(['not a LabelMe file: missing shapes[]']);
  if (doc.imageWidth !== IMAGE_SIZE.width || doc.imageHeight !== IMAGE_SIZE.height)
    problems.push(`image size ${doc.imageWidth}x${doc.imageHeight} does not match source ${IMAGE_SIZE.width}x${IMAGE_SIZE.height}`);
  if (doc.imagePath !== 'Clear Image.png') problems.push(`imagePath "${doc.imagePath}" must be "Clear Image.png" (same image as the source file)`);
  const features = [], byId = new Map();
  doc.shapes.forEach((shape, index) => {
    const where = `shape #${index} "${shape?.label}"`;
    const m = /^([a-z]+):([a-z0-9][a-z0-9-]*)$/.exec(shape?.label ?? '');
    if (!m) { problems.push(`${where}: label must look like kind:name (lowercase, digits, dashes)`); return; }
    const [, kind] = m, spec = KINDS[kind];
    if (!spec) { problems.push(`${where}: unknown kind "${kind}" (known: ${Object.keys(KINDS).join(', ')})`); return; }
    if (byId.has(shape.label)) { problems.push(`${where}: duplicate id ${shape.label}`); return; }
    if (!spec.types.includes(shape.shape_type)) problems.push(`${where}: ${kind} must be drawn as ${spec.types.join(' or ')}, got ${shape.shape_type}`);
    const pts = shape.points;
    // Validate point structure BEFORE anything reads it; a malformed shape is
    // reported and excluded, never dereferenced (raw TypeError otherwise).
    const ptsOk = Array.isArray(pts) && pts.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));
    if (!Array.isArray(pts)) problems.push(`${where}: points must be a list of [x, y] pairs`);
    else if (!ptsOk) problems.push(`${where}: non-finite or malformed coordinate`);
    else {
      if (pts.length < spec.min) problems.push(`${where}: needs at least ${spec.min} point(s)`);
      const exact = TYPE_POINTS[shape.shape_type];
      if (exact && (pts.length < exact[0] || pts.length > exact[1]))
        problems.push(`${where}: ${shape.shape_type} must have ${exact[1] === Infinity ? `at least ${exact[0]}` : `exactly ${exact[0]}`} point(s), got ${pts.length}`);
      if (pts.some(([x,y]) => x < 0 || y < 0 || x > IMAGE_SIZE.width || y > IMAGE_SIZE.height)) problems.push(`${where}: point outside the ${IMAGE_SIZE.width}x${IMAGE_SIZE.height} image`);
    }
    const { fields, bad } = parseDescription(shape.description);
    bad.forEach(b => problems.push(`${where}: unreadable description line "${b}" (use key=value)`));
    const allowed = new Set([...(spec.common === false ? [] : COMMON), ...spec.keys]);
    for (const k of Object.keys(fields)) if (!allowed.has(k)) problems.push(`${where}: unknown key "${k}" (allowed: ${[...allowed].join(', ')})`);
    const required = [...(spec.common === false ? [] : ['evidence','confidence']), ...spec.required];
    for (const k of required) if (!(k in fields)) problems.push(`${where}: missing required key "${k}"`);
    if ('evidence' in fields && !EVIDENCE.includes(fields.evidence)) problems.push(`${where}: evidence "${fields.evidence}" not one of ${EVIDENCE.join('|')}`);
    if ('confidence' in fields && !CONFIDENCE.includes(fields.confidence)) problems.push(`${where}: confidence "${fields.confidence}" not one of ${CONFIDENCE.join('|')}`);
    for (const k of ['width_px','tolerance_px']) if (k in fields && !(Number.isFinite(Number(fields[k])) && Number(fields[k]) >= 0)) problems.push(`${where}: ${k} must be a non-negative number`);
    if (kind === 'pos') {
      if (!fields.role?.trim()) problems.push(`${where}: role must describe the position`);
      if (!['true','false'].includes(fields.staffed)) problems.push(`${where}: staffed must be true or false (metadata only; never activates a worker)`);
    }
    if (!ptsOk) return;
    const feature = Object.freeze({ id: shape.label, kind, index, type: shape.shape_type,
      points: Object.freeze(pts.map(p => Object.freeze([...p]))), fields: Object.freeze(fields) });
    byId.set(feature.id, feature); features.push(feature);
  });
  const meta = byId.get('meta:overlay');
  if (!meta) problems.push('missing meta:overlay point (version, source_pair)');
  else {
    if (Number(meta.fields.version) !== OVERLAY_VERSION) problems.push(`meta:overlay version ${meta.fields.version} is not supported (expected ${OVERLAY_VERSION})`);
    if (meta.fields.source_pair !== SOURCE_PAIR) problems.push(`meta:overlay source_pair "${meta.fields.source_pair}" does not match ${SOURCE_PAIR}`);
  }
  for (const f of features) for (const k of ['from','to']) {
    const ref = f.fields[k]; if (ref === undefined) continue;
    if (!byId.has(ref)) problems.push(`${f.id}: ${k}=${ref} refers to a feature that does not exist`);
    else if (!['lane','road','node'].includes(byId.get(ref).kind)) problems.push(`${f.id}: ${k}=${ref} must refer to a lane, road or node`);
  }
  for (const f of features) if (f.kind === 'oneway' && f.fields.direction !== 'north')
    problems.push(`${f.id}: direction=${f.fields.direction} is not supported yet (runtime implements north only)`);
  const stageRole = { 'stage:c-throat': ['staging-exclusion','rectangle'], 'stage:c-staging-target': ['staging-target','point'] };
  for (const [id, [role, type]] of Object.entries(stageRole)) {
    const f = byId.get(id); if (!f) continue;
    if (f.fields.role !== role) problems.push(`${id}: role must be ${role}`);
    if (f.type !== type) problems.push(`${id}: must be drawn as ${type}`);
  }
  if (requireRuntime) for (const id of RUNTIME_FEATURES) if (!byId.has(id)) problems.push(`missing runtime feature ${id}`);
  const bNorth = byId.get(B_NORTH_DIRECT_ID);
  if (bNorth) {
    if (bNorth.type !== 'linestrip' || bNorth.points.length !== 3)
      problems.push(`${B_NORTH_DIRECT_ID}: runtime pilot requires a three-point linestrip (northern-row start, divergence, exit join)`);
    if (bNorth.fields.classes !== 'car') problems.push(`${B_NORTH_DIRECT_ID}: classes must be car; this pilot does not reroute shuttles`);
  }
  if (problems.length) throw new LayoutOverlayError(problems);
  return Object.freeze({ features: Object.freeze(features), byId });
}

export const LAYOUT = parseOverlay(overlay);
export const layoutFeature = id => {
  const f = LAYOUT.byId.get(id); if (!f) throw new Error(`Unknown layout feature: ${id}`); return f;
};

// Exact S5 Commander-drawn polygons; consumers retain the existing source-roof
// exclusion mask. Additional pave annotations stay advisory until adopted here.
export const PAVEMENT_PATCHES = Object.freeze(PAVEMENT_FEATURE_IDS.map(id => layoutFeature(id).points));
// S6: approved northern-row launch abstraction, not surveyed pavement or a new
// western-arm connector. Only bNorth cars taking the north exit consume it.
export const B_NORTH_DIRECT_PATH = layoutFeature(B_NORTH_DIRECT_ID).points;

// --- Runtime parameters (behavior-equivalent to the literals they replaced) ---
// C throat: staging-exclusion box, NOT a physical median. Both legitimate C
// entrance/exit roadways run through it. No lower y bound (as before): the
// rectangle's top edge is only where it was drawn.
const throat = bounds(layoutFeature('stage:c-throat').points);
export const C_THROAT = Object.freeze({ xMin: throat.xMin, xMax: throat.xMax, tailY: throat.yMax });
export const C_STAGING_TARGET = layoutFeature('stage:c-staging-target').points[0];
// Feeder one-way abstraction: "x below the rectangle's right edge" (strict <),
// NOT surveyed lane geometry. Two distinct predicates are preserved exactly:
//  - segment check (direct joins/shortcuts): southbound forbidden only when BOTH
//    endpoints are inside and the move exceeds tolerance_px;
//  - grid-step check (A* neighbours): any southward step forbidden when the
//    START is inside, even if the next node crosses the edge.
const feeder = layoutFeature('oneway:feeder-north');
export const FEEDER_ONE_WAY = Object.freeze({ xBelow: bounds(feeder.points).xMax, tolerance: Number(feeder.fields.tolerance_px) });
export const feederSegmentOk = (a, b) => !(a[0] < FEEDER_ONE_WAY.xBelow && b[0] < FEEDER_ONE_WAY.xBelow && b[1] > a[1] + FEEDER_ONE_WAY.tolerance);
export const feederGridStepOk = (a, dy) => !(a[0] < FEEDER_ONE_WAY.xBelow && dy > 0);

export const OVERLAY_PROVENANCE = Object.freeze(LAYOUT.features.filter(f => f.kind !== 'meta').map(f => Object.freeze({
  id: f.id, kind: f.kind, evidence: f.fields.evidence, confidence: f.fields.confidence,
  runtime: RUNTIME_FEATURES.includes(f.id), note: f.fields.note ?? '' })));
