// Full-campus arrivals stay on the public roads and leave north on Feeder.
import { routeAt } from '../clearImageSource.js';
import { join, nearestIndex, clearSegment } from './sourceRouting.js';

const feeder = routeAt(0),
  equityWest = routeAt(9),
  equitySouth = routeAt(10);
const toFeeder = routeAt(12);
const joinIndex = nearestIndex(toFeeder, equitySouth[1]);
const northExit = [feeder[1], [18, 4]];
const routes = [
  join([feeder[0]], northExit),
  join(equityWest.slice(0, 2), northExit),
  join(equitySouth.slice(0, 2), toFeeder.slice(joinIndex), northExit),
];
export function overflowRoute(source) {
  const route = routes[source];
  if (!route || route.slice(1).some((p, i) => !clearSegment(route[i], p)))
    throw new Error(`Unavailable overflow route from source ${source}`);
  return route;
}
