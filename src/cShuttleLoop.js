// Commander-approved replacement C loop, ExitPathsAndC #50. Source pixels stay
// exact. Stops move to their nearest projections on this directed trace; the
// drawing and original labeled points are never edited.
import { C_SHUTTLE_TRACE } from './exitPathSource.js';
import { pointAt, routeAt, SHUTTLE_HOME } from './clearImageSource.js';
import { clearSegment, drivableAllowed, obstacleConnector, join, distance } from './sourceRouting.js';

const line = C_SHUTTLE_TRACE.points;
const arcs = [0];
for (let i = 1; i < line.length; i++) arcs.push(arcs[i - 1] + distance(line[i - 1], line[i]));
export const C_LOOP_LENGTH = arcs.at(-1);

function project(p) {
  let best = null;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    const point = [a[0] + dx * t, a[1] + dy * t];
    const gap = distance(p, point);
    if (!best || gap < best.gap) best = { point, gap, station: arcs[i - 1] + t * (arcs[i] - arcs[i - 1]), segment: i - 1 };
  }
  return Object.freeze({ ...best, point: Object.freeze(best.point) });
}
export const C_LOOP_STOPS = Object.freeze(Object.fromEntries(
  [['cRoundabout', 47], ['cSouth', 48], ['cNorth', 49]].map(([id, sourceIndex]) => [id,
    Object.freeze({ ...project(pointAt(sourceIndex)), sourceIndex, originalPoint: Object.freeze([...pointAt(sourceIndex)]) }),
  ]),
));

function at(station) {
  if (station === C_LOOP_LENGTH) return line.at(-1);
  for (let i = 1; i < line.length; i++) if (station <= arcs[i]) {
    const t = (station - arcs[i - 1]) / (arcs[i] - arcs[i - 1]);
    return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t,
      line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
  }
  throw new Error('C shuttle station outside trace');
}
function slice(from, to) {
  if (!(from >= 0 && to > from && to <= C_LOOP_LENGTH)) throw new Error('C shuttle stops must advance in source order');
  return join([at(from)], line.filter((_, i) => arcs[i] > from && arcs[i] < to), [at(to)]);
}
function checkedJoin(a, b, label) {
  if (!clearSegment(a, b, drivableAllowed)) throw new Error(`C shuttle ${label}: derived join leaves drivable ground`);
  return [a, b];
}

export function buildCLoopCircuits() {
  // Existing #30 approach up to its west-Corporate station; new trace then runs
  // through the western C loop. Return joins #29 at its first westbound station
  // AFTER the old east-side C exit, without visiting/reversing that unused leg.
  const approach = routeAt(30), back = routeAt(29);
  const round = C_LOOP_STOPS.cRoundabout.station;
  // Home connectors are the unchanged accepted #30/#29 staging joins; they
  // remain disclosed sourceRouting connectors, not newly certified pavement.
  const outbound = join(obstacleConnector(SHUTTLE_HOME, approach[0], 'shuttle home to #30'),
    approach.slice(0, 15), checkedJoin(approach[14], line[0], 'trace entry'), slice(0, round));
  const homeward = join(checkedJoin(line.at(-1), back[2], 'Corporate return'), back.slice(2),
    obstacleConnector(back.at(-1), SHUTTLE_HOME, 'shuttle #29 home closure'));
  return Object.fromEntries(['cNorth', 'cSouth'].map(id => [id, [
    { points: outbound, stop: 'cRoundabout' },
    { points: slice(round, C_LOOP_STOPS[id].station), stop: id },
    { points: join(slice(C_LOOP_STOPS[id].station, C_LOOP_LENGTH), homeward), stop: 'home' },
  ]]));
}