import source, { SOURCE_FILE, SOURCE_PAIR, toWorld, STAFF_POSITIONS, POSITION_ALIASES } from './clearImageSource.js';
export const TRACE_SOURCE = SOURCE_FILE;
export const traceWorldPoint = toWorld;
function category(shape,index) {
  if(shape.shape_type==='linestrip')return 'route';
  if(/building/i.test(shape.label))return 'building';
  if(index>=54&&index<=56)return 'road';
  if(/first half/i.test(shape.label))return 'allocation-mask';
  if(/shuttle/i.test(shape.label))return 'pickup';
  if(shape.shape_type==='point')return 'position';
  return 'parking-area';
}
export const tracedFeatures = source.shapes.map((shape,index)=>({
  id:`clear-${index}`,index,label:shape.label,category:category(shape,index),
  lotId:/^Lot ([ABC])\b/i.test(shape.label)?`lot-${/^Lot ([ABC])\b/i.exec(shape.label)[1].toLowerCase()}`:null,
  shapeType:shape.shape_type,points:shape.points.map(toWorld),pixelPoints:shape.points,source:SOURCE_FILE,
  canonicalIndex:POSITION_ALIASES[index]??index,
}));
export function tracedLayout(base={items:[]}) {
  // Coordinates are source-owned: do not retain ANY old/custom spatial object.
  // Only safe lot operating settings survive a source-pair migration.
  const items=['a','b','c'].map((id,i)=>{
    const previous=base.items?.find(item=>item.id===`lot-${id}`);
    const regions=tracedFeatures.filter(f=>f.lotId===`lot-${id}`&&f.category==='parking-area');
    const xs=regions.flatMap(f=>f.points.map(p=>p[0])),zs=regions.flatMap(f=>f.points.map(p=>p[1]));
    return {id:`lot-${id}`,type:'lot',name:`${id.toUpperCase()} · Campus parking`,capacity:[411,487,686][i],
      open:previous?.open!==false,color:['#d2f481','#83cbd5','#bba8ed'][i],
      x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2,
      width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...zs)-Math.min(...zs),rotation:0};
  });
  for(const f of tracedFeatures) {
    if(f.shapeType!=='polygon'||f.category==='allocation-mask')continue;
    const xs=f.points.map(p=>p[0]),zs=f.points.map(p=>p[1]);
    const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
    const type=f.category==='building'?'building':'surface';
    items.push({id:f.id,type,name:f.label,x,z,width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...zs)-Math.min(...zs),rotation:0,
      points:f.points.map(([px,pz])=>[px-x,pz-z]),lotId:f.lotId??'',sourceIndex:f.index,
      ...(type==='surface'?{color:f.category==='road'?'#46585e':'#727b7b',elevation:f.category==='road'?.11:.15}:{})});
  }
  for(const station of STAFF_POSITIONS) {
    const [x,z]=toWorld(station.point);
    items.push({id:`staff-${station.id}`,type:'position',name:station.label,role:station.label,assignee:'',notes:`${SOURCE_FILE} #${station.index}; source position, not inferred policy.`,x,z,width:1,depth:1,rotation:0,sourceIndex:station.index});
  }
  return {version:1,name:'Hope City · Clear Image campus',sourcePair:SOURCE_PAIR,tracedMapRevision:4,items};
}
