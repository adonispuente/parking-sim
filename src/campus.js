// Visual traces, not surveyed boundaries. Coordinates refer to the full latest image.
export const IMAGE_SIZE = { width: 1698, height: 1378 };
export const worldPoint = ([u, v]) => [u * 113.6, v * (113.6 * IMAGE_SIZE.height / IMAGE_SIZE.width)];
export const BUILDINGS = [
  { id: 'church', name: 'Lot A · church', points: [[.214,.172],[.329,.245],[.320,.271],[.330,.279],[.329,.311],[.315,.339],[.278,.363],[.240,.337],[.196,.470],[.137,.439],[.169,.364],[.126,.321],[.174,.218],[.187,.180],[.208,.193]] },
  { id: 'center-building', name: 'Lot B · building', points: [[.533,.233],[.572,.258],[.537,.340],[.586,.376],[.577,.399],[.524,.519],[.480,.493],[.515,.415],[.468,.380]] },
  { id: 'east-building', name: 'Lot C · building', points: [[.756,.231],[.898,.237],[.897,.305],[.852,.305],[.852,.325],[.864,.325],[.864,.392],[.722,.385],[.724,.323],[.769,.323],[.769,.303],[.754,.300]] },
];
export const ROADS = [
  { id: 'road-west', name: 'West frontage street', width: 2.5, points: [[.044,0],[.043,.15],[.041,.34],[.038,.52],[.037,.74],[.038,.92],[.042,1]] },
  { id: 'road-spine', name: 'Curved campus road · west to north', width: 2.2, points: [[.040,.527],[.103,.528],[.178,.532],[.241,.530],[.281,.518],[.313,.497],[.339,.466],[.357,.427],[.366,.382],[.369,.330],[.371,.275],[.381,.226],[.397,.185],[.419,.148],[.449,.120],[.484,.103],[.530,.101],[.620,.104],[.730,.108],[.850,.109],[.947,.110],[.983,.110]] },
  { id: 'road-east', name: 'East frontage street', width: 2.4, points: [[.983,0],[.984,.111],[.984,.247],[.982,.390],[.971,.525],[.954,.673],[.943,.811],[.934,.938],[.925,.967],[.903,.979],[.840,.980]] },
  { id: 'road-south', name: 'South cross-campus road', width: 2.2, points: [[.041,.957],[.116,.963],[.210,.964],[.300,.970],[.410,.972],[.520,.974],[.630,.974],[.730,.977],[.840,.980]] },
  { id: 'drive-a-north', name: 'Lot A · northwest access', width: 1.7, access: true, points: [[.043,.080],[.089,.082],[.137,.083],[.155,.105],[.193,.133]] },
  { id: 'drive-b-east', name: 'Lot B · internal parking aisle (approx.)', width: 1.5, access: true, points: [[.638,.104],[.637,.21],[.634,.36],[.628,.47],[.625,.56]] },
];

export function tracedItem(trace, type) {
  const points = trace.points.map(worldPoint);
  const xs = points.map(p => p[0]), zs = points.map(p => p[1]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const z = (Math.min(...zs) + Math.max(...zs)) / 2;
  return { id: trace.id, type, name: trace.name, x, z,
    width: Math.max(.4, Math.max(...xs) - Math.min(...xs)),
    depth: Math.max(.4, Math.max(...zs) - Math.min(...zs)), rotation: 0,
    points: points.map(([px, pz]) => [px - x, pz - z]),
    ...(type === 'road' ? { roadWidth: trace.width, access: !!trace.access } : {}),
  };
}
