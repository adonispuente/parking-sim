import annotation, { TRACE_SOURCE } from './campusAnnotations.js';
const IMAGE_SIZE = { width:735, height:566 };

if (annotation.imageWidth !== IMAGE_SIZE.width || annotation.imageHeight !== IMAGE_SIZE.height) {
  throw new Error('LabelMe trace does not match the satellite image dimensions.');
}

export { TRACE_SOURCE };
export const traceWorldPoint = ([x, y]) => [x * 113.6 / IMAGE_SIZE.width, y * 113.6 / IMAGE_SIZE.width];

function category(label) {
  if (/building/i.test(label)) return 'building';
  if (/corporate drive|feeder road|equity drive/i.test(label)) return 'road';
  if (/round\s?about/i.test(label)) return 'roundabout';
  if (/shuttle pickup/i.test(label)) return 'pickup';
  return 'parking-area';
}

export const tracedFeatures = annotation.shapes.map((shape, index) => {
  const label = shape.label;
  const lot = /^Lot ([ABC])\b/i.exec(label)?.[1]?.toLowerCase() ?? null;
  const points = shape.points.map(traceWorldPoint);
  return { id: `trace-${String(index + 1).padStart(2, '0')}`, label,
    category: category(label), lotId: lot ? `lot-${lot}` : null,
    shapeType: shape.shape_type, points, pixelPoints: shape.points,
    source: TRACE_SOURCE };
});

// Source-derived geometry only. Parking regions are surfaces, never fabricated stalls.
export function tracedLayout(base) {
  const oldGenerated = i => i.id.startsWith('east-') || i.id.startsWith('a-') ||
    i.id.startsWith('shuttle-') || ['church','center-building','east-building','road-spine','road-west','road-east','road-south','drive-a-north','drive-b-east','row-a','row-b','row-c','barrier-c'].includes(i.id);
  const items = base.items.filter(i => !oldGenerated(i) && !i.id.startsWith('trace-') && !(i.type === 'spaces' && i.traceSource))
    .map(i => i.type==='lot' && ['lot-a','lot-b','lot-c'].includes(i.id) ?
      {...i,capacity:{'lot-a':411,'lot-b':487,'lot-c':686}[i.id]} : i);
  for (const feature of tracedFeatures) {
    if (feature.shapeType === 'point') continue;
    const coords = feature.shapeType === 'circle' ? (() => {
      const [[cx,cy],[edgeX,edgeY]] = feature.points;
      const radius = Math.hypot(edgeX-cx,edgeY-cy);
      return Array.from({length:48},(_,i) => [cx+radius*Math.cos(i*Math.PI/24),cy+radius*Math.sin(i*Math.PI/24)]);
    })() : feature.points;
    const xs=coords.map(p=>p[0]), ys=coords.map(p=>p[1]);
    const x=(Math.min(...xs)+Math.max(...xs))/2, z=(Math.min(...ys)+Math.max(...ys))/2;
    const type=feature.category==='building'?'building':'surface';
    items.push({id:feature.id,type,name:feature.label,x,z,
      width:Math.max(.4,Math.max(...xs)-Math.min(...xs)),depth:Math.max(.4,Math.max(...ys)-Math.min(...ys)),rotation:0,
      points:coords.map(([px,py])=>[px-x,py-z]),lotId:feature.lotId ?? '',
      ...(type==='surface'?{color:feature.category==='road'?'#46585e':feature.category==='roundabout'?'#bdad8c':'#727b7b',elevation:feature.category==='road'?.11:.15}:{})});
  }
  // Operational capacity remains separate from drawn regions; bound the lot labels to those regions.
  for (const lot of items.filter(i => i.type==='lot')) {
    const regions=tracedFeatures.filter(f=>f.lotId===lot.id && f.category==='parking-area');
    if (!regions.length) continue;
    const xs=regions.flatMap(f=>f.points.map(p=>p[0])),ys=regions.flatMap(f=>f.points.map(p=>p[1]));
    lot.x=(Math.min(...xs)+Math.max(...xs))/2;
    lot.z=(Math.min(...ys)+Math.max(...ys))/2;
    lot.width=Math.max(.4,Math.max(...xs)-Math.min(...xs));
    lot.depth=Math.max(.4,Math.max(...ys)-Math.min(...ys));
    lot.rotation=0;
    delete lot.points;
  }
  return {...base,name:'Hope City · updated C first-half trace',tracedMapRevision:3,items};
}
