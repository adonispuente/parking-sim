// Exit-trace catalog, S0.
//
// Strict, isolated binding of the Commander's traced exit lines in
// images/ExitPathsAndC.json. This module only NAMES, VALIDATES and FREEZES the
// 32 exit linestrips and the explicitly approved C shuttle loop (#50).
// Data validation remains pure; callers explicitly select traffic use.
//
// The directed order of the source vertices is preserved exactly (source order =
// how the line was drawn). Intended outward direction is plausible but NOT
// verified here; that is the job of the later live-pilot slice, never this one.
//
// Frame constants are literal with provenance on purpose: this file must not
// import route-generation or any other source module just to read a size.
// 1374x1118 is the registered source frame (see src/clearImageSource.js).

import source from '../images/ExitPathsAndC.json' with { type: 'json' };

export const EXIT_PATH_SOURCE_FILE = 'images/ExitPathsAndC.json';

const FRAME = Object.freeze({ width: 1374, height: 1118 });

// This versioned binding pins exactly 51 shapes. If the Commander appends to the
// drawing, the count check fails by design — an explicit binding revision is
// required, never silent adoption of new shapes.
const EXPECTED_SHAPE_COUNT = 51;
const SHUTTLE_SPEC = Object.freeze({
  sourceIndex: 50, expectedLabel: 'Lot C Shuttle Route new', expectedType: 'linestrip',
});

// Allowed LabelMe shape types and the point cardinality each demands.
// point=1, circle=2 (center+radius point), linestrip>=2, polygon>=3.
const TYPE_CARDINALITY = Object.freeze({
  point: Object.freeze({ min: 1, max: 1 }),
  circle: Object.freeze({ min: 2, max: 2 }),
  linestrip: Object.freeze({ min: 2, max: Infinity }),
  polygon: Object.freeze({ min: 3, max: Infinity }),
});
const KNOWN_TYPES = Object.freeze(Object.keys(TYPE_CARDINALITY));

function range(lo, hi) {
  const out = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

// --- exit-path family assignments, keyed by zero-based source index ----------
//
// The drawing's labels ("Lot B North Exit Path", etc.) are NOT destination
// policy — some "Lot B North" traces end at the west exit or interior joins. We
// bind by property family, not by the label's implied destination. Repeated
// labels are intentionally legal, so we never key by label alone.
//
//   16,17            -> lot a, family aSouth
//   24..27           -> lot a, family aNorth
//   28..39           -> lot b, family b
//   18..23, 40..47   -> lot c, family c
//
// That is 6 A + 12 B + 14 C = 32 exit paths (indices 16..47).
// The exact expected label for each range is pinned so a relabel is caught.
const EXIT_RANGES = Object.freeze([
  { indices: [16, 17], lot: 'a', family: 'aSouth', label: 'Lot A South Exit Path' },
  { indices: [24, 25, 26, 27], lot: 'a', family: 'aNorth', label: 'Lot A North Exit Path' },
  { indices: range(28, 39), lot: 'b', family: 'b', label: 'Lot B North Exit Path' },
  { indices: range(18, 23).concat(range(40, 47)), lot: 'c', family: 'c', label: 'Lot C Exit Path' },
]);

// sourceIndex -> { lot, family, expectedLabel, expectedType }
const EXIT_SPECS = new Map();
for (const r of EXIT_RANGES) for (const i of r.indices) {
  EXIT_SPECS.set(i, Object.freeze({ lot: r.lot, family: r.family, expectedLabel: r.label, expectedType: 'linestrip' }));
}

// The two Lot C roundabout annotations. Validated for coordinates only; they are
// never made drivable and never included in EXIT_PATHS. (Label 48 spelling is
// the drawing's exact text, "rounabout".)
const ANNOTATION_SPECS = Object.freeze({
  48: Object.freeze({ expectedLabel: 'Lot C rounabout position', expectedType: 'point' }),
  49: Object.freeze({ expectedLabel: 'Lot C round about 4 way', expectedType: 'polygon' }),
});

function describeCardinality(card) {
  return card.max === 1 ? 'exactly 1' : `at least ${card.min}`;
}

// Deep-clone + deep-freeze a points array, making brand-new arrays so we never
// alias a caller-owned fixture. Coordinates are copied verbatim — no
// normalization, reorder, reverse, smoothing, connecting or dedup.
function deepFreezePoints(points) {
  const frozen = points.map(p => Object.freeze([p[0], p[1]]));
  return Object.freeze(frozen);
}

// Validate coordinates + type cardinality for one shape, plus the exact
// label/type contract where this binding pins one (the 32 exits and the two
// roundabout annotations).
function validateShape(shape, index) {
  const where = `${EXIT_PATH_SOURCE_FILE} shape #${index}`;

  if (typeof shape !== 'object' || shape === null || Array.isArray(shape))
    throw new Error(`${where}: must be an object, got ${typeof shape}`);
  if (typeof shape.label !== 'string' || shape.label.trim() === '')
    throw new Error(`${where}: missing "label"`);
  if (typeof shape.shape_type !== 'string' || !KNOWN_TYPES.includes(shape.shape_type))
    throw new Error(`${where} "${shape.label}": shape_type ${JSON.stringify(shape.shape_type)} is not one of ${KNOWN_TYPES.join('/')}`);

  // exact contracts where pinned
  const exit = EXIT_SPECS.get(index);
  const ann = ANNOTATION_SPECS[index];
  if (index === SHUTTLE_SPEC.sourceIndex) {
    if (shape.label !== SHUTTLE_SPEC.expectedLabel || shape.shape_type !== SHUTTLE_SPEC.expectedType)
      throw new Error(`${where}: expected shuttle linestrip "${SHUTTLE_SPEC.expectedLabel}"`);
  }
  if (exit) {
    if (shape.shape_type !== exit.expectedType)
      throw new Error(`${where} "${shape.label}": exit path must be shape_type "${exit.expectedType}", found "${shape.shape_type}"`);
    if (shape.label !== exit.expectedLabel)
      throw new Error(`${where} "${shape.label}": expected exit label "${exit.expectedLabel}"`);
  } else if (ann) {
    if (shape.shape_type !== ann.expectedType)
      throw new Error(`${where} "${shape.label}": annotation must be "${ann.expectedType}", found "${shape.shape_type}"`);
    if (shape.label !== ann.expectedLabel)
      throw new Error(`${where} "${shape.label}": expected annotation label "${ann.expectedLabel}"`);
  }

  // coordinates: every point = exactly 2 finite numbers within the inclusive frame
  const card = TYPE_CARDINALITY[shape.shape_type];
  if (!Array.isArray(shape.points))
    throw new Error(`${where} "${shape.label}": missing "points" array`);
  if (shape.points.length < card.min || shape.points.length > card.max)
    throw new Error(`${where} "${shape.label}": ${shape.shape_type} has ${shape.points.length} point(s), needs ${describeCardinality(card)}`);
  shape.points.forEach((p, pi) => {
    if (!Array.isArray(p) || p.length !== 2)
      throw new Error(`${where} "${shape.label}" point #${pi}: must be exactly [x, y], got ${JSON.stringify(p)}`);
    if (!p.every(Number.isFinite))
      throw new Error(`${where} "${shape.label}" point #${pi}: contains a non-finite coordinate ${JSON.stringify(p)}`);
    const [x, y] = p;
    if (x < 0 || x > FRAME.width || y < 0 || y > FRAME.height)
      throw new Error(`${where} "${shape.label}" point #${pi} (${x}, ${y}) is outside the ${FRAME.width}x${FRAME.height} frame`);
  });
}

// Validate a full drawing and return a frozen catalog of the 32 exit paths,
// ordered by ascending source index. Throws a descriptive Error naming the
// source, shape index, label and the specific issue; never falls back silently.
export function validateExitPathDrawing(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${EXIT_PATH_SOURCE_FILE}: drawing must be an object, got ${typeof value}`);

  if (!Number.isInteger(value.imageWidth) || !Number.isInteger(value.imageHeight) ||
      value.imageWidth !== FRAME.width || value.imageHeight !== FRAME.height)
    throw new Error(`${EXIT_PATH_SOURCE_FILE}: registered frame is ${value.imageWidth}x${value.imageHeight}, expected ${FRAME.width}x${FRAME.height}`);

  if (!Array.isArray(value.shapes))
    throw new Error(`${EXIT_PATH_SOURCE_FILE}: drawing must have a "shapes" array`);

  if (value.shapes.length !== EXPECTED_SHAPE_COUNT)
    throw new Error(`${EXIT_PATH_SOURCE_FILE}: expected exactly ${EXPECTED_SHAPE_COUNT} shapes for this versioned binding, found ${value.shapes.length}. Appended source shapes require an explicit binding revision.`);

  value.shapes.forEach((shape, index) => validateShape(shape, index));

  const catalog = [...EXIT_SPECS.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sourceIndex, spec]) => {
      const shape = value.shapes[sourceIndex];
      return Object.freeze({
        id: `exitpaths-${sourceIndex}`,
        sourceFile: EXIT_PATH_SOURCE_FILE,
        sourceIndex,
        label: shape.label,
        lot: spec.lot,
        family: spec.family,
        points: deepFreezePoints(shape.points),
      });
    });

  return Object.freeze(catalog);
}

// The frozen catalog of the 32 exit paths bound from the registered source.
export const EXIT_PATHS = validateExitPathDrawing(source);

// Separate from the exit catalog: this is a shuttle loop, not a 33rd car exit.
export const C_SHUTTLE_TRACE = Object.freeze({
  id: 'exitpaths-shuttle-50', sourceFile: EXIT_PATH_SOURCE_FILE,
  sourceIndex: SHUTTLE_SPEC.sourceIndex, label: SHUTTLE_SPEC.expectedLabel,
  points: deepFreezePoints(source.shapes[SHUTTLE_SPEC.sourceIndex].points),
});

// Non-drivable Lot C roundabout annotation metadata (validated above; not part
// of EXIT_PATHS and never used for routing/rendering behavior).
export const EXIT_PATH_ANNOTATIONS = Object.freeze(
  Object.keys(ANNOTATION_SPECS)
    .map(key => {
      const i = Number(key);
      return Object.freeze({
        sourceIndex: i,
        label: source.shapes[i].label,
        shapeType: source.shapes[i].shape_type,
        points: deepFreezePoints(source.shapes[i].points),
        drivable: false,
      });
    })
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
);

export function exitPathById(id) {
  const found = EXIT_PATHS.find(e => e.id === id);
  if (!found)
    throw new Error(`Unknown exit path id ${JSON.stringify(id)}. Expected format "exitpaths-<sourceIndex>" for one of ${EXIT_PATHS.length} exits (source indices 16..47).`);
  return found;
}

export default { EXIT_PATHS, EXIT_PATH_ANNOTATIONS, EXIT_PATH_SOURCE_FILE, validateExitPathDrawing, exitPathById };
