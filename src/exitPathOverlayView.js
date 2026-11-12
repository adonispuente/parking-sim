// Display-only overlay data for the 32 drawn exit traces in images/ExitPathsAndC.json.
// Pure data module: no THREE, no React, no routing imports.
// Drawn points exactly, in source order: no reversing, smoothing, simplifying,
// snapping, road-joining, A*, or connecting. No direction is implied — the
// outward direction of these traces is unverified.
// The roundabout position/outline shapes (source #48, #49) are annotations and
// never appear here: only the 32 exit linestrips are drawn.
// The display never infers activation: it comes only from the explicit frozen
// list below, set by the reviewed slice that promotes a trace into traffic.
import { EXIT_PATHS, EXIT_PATH_SOURCE_FILE } from './exitPathSource.js';
import { traceWorldPoint } from './tracedMap.js';

// Explicit activation list, in sourceIndex order. Each entry is set only by the
// reviewed slice that promotes that trace into traffic:
//   'exitpaths-16' — A South 1R-e promotion (parkingRoutes.js imports ./aSouthCentreline.js).
//   'exitpaths-34' — S1-PROMOTED only (parkingRoutes.js imports ./tracedExitPilot.js). Still parked.
export const ACTIVATED_EXIT_IDS = Object.freeze(['exitpaths-16']);

export const EXIT_TRACE_COLOR = '#f5f4ee';

const LOT_NAMES = { a: 'A', b: 'B', c: 'C' };
const EXPECTED_COUNTS = { a: 6, b: 12, c: 14 };

function build() {
  const counts = { a: 0, b: 0, c: 0 };
  const ids = new Set();
  for (const e of EXIT_PATHS) {
    if (!Object.hasOwn(counts, e.lot))
      throw new Error(`exitPathOverlayView: catalog entry ${e.id} has unknown lot ${JSON.stringify(e.lot)}`);
    if (ids.has(e.id)) throw new Error(`exitPathOverlayView: duplicate id ${e.id}`);
    ids.add(e.id);
    counts[e.lot] += 1;
  }
  const total = EXIT_PATHS.length;
  if (total !== 32) throw new Error(`exitPathOverlayView: expected 32 exit traces, found ${total}`);
  for (const lot of Object.keys(EXPECTED_COUNTS)) {
    if (counts[lot] !== EXPECTED_COUNTS[lot])
      throw new Error(`exitPathOverlayView: lot ${lot} expected ${EXPECTED_COUNTS[lot]} traces, found ${counts[lot]}`);
  }
  for (const id of ACTIVATED_EXIT_IDS) {
    if (!ids.has(id)) throw new Error(`exitPathOverlayView: ACTIVATED_EXIT_IDS references unknown id ${id}`);
  }
  const lines = [...EXIT_PATHS].sort((x, y) => x.sourceIndex - y.sourceIndex).map((e) => {
    const activated = ACTIVATED_EXIT_IDS.includes(e.id);
    const letter = LOT_NAMES[e.lot] ?? String(e.lot).toUpperCase();
    const pixelPoints = e.points;
    const worldPoints = Object.freeze(pixelPoints.map((p) => Object.freeze(traceWorldPoint(p))));
    return Object.freeze({
      id: e.id,
      sourceIndex: e.sourceIndex,
      lot: e.lot,
      family: e.family,
      label: e.label,
      pixelPoints,
      worldPoints,
      status: activated ? 'active' : 'drawn-reference',
      tag: `#${e.sourceIndex} · ${letter} · ${activated ? 'drawn, in traffic use' : 'drawn ref'}`,
      labelAt: worldPoints[Math.floor(worldPoints.length / 2)],
    });
  });
  return Object.freeze({
    file: EXIT_PATH_SOURCE_FILE,
    total,
    counts: Object.freeze(counts),
    activated: Object.freeze([...ACTIVATED_EXIT_IDS]),
    lines: Object.freeze(lines),
  });
}

const overlay = build();

// Built once at module load; every call returns the same frozen object.
export function exitTraceOverlay() {
  return overlay;
}

export default { ACTIVATED_EXIT_IDS, EXIT_TRACE_COLOR, exitTraceOverlay };
