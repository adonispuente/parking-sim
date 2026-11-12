import source from '../images/EverythingClearImage.json' with { type: 'json' };

export const SOURCE_PAIR = 'clear-image-everything-v1-65';
export const SOURCE_FILE = 'images/EverythingClearImage.json';
export const SOURCE_IMAGE = 'images/Clear Image.png';
export const IMAGE_SIZE = Object.freeze({ width:1374, height:1118 });
export const WORLD_SCALE = 113.6 / IMAGE_SIZE.width;
export const toWorld = ([x,y]) => [x*WORLD_SCALE,y*WORLD_SCALE];
export const fromWorld = ([x,z]) => [x/WORLD_SCALE,z/WORLD_SCALE];
export const normalizeLabel = label => label.toLowerCase().replace(/entrace/g,'entrance').replace(/\s+/g,' ').trim();
export const SOURCE_LABELS = Object.freeze([
  'Lot A Feeder to Lot A South','Lot A Feeder To Lot A North','Feeder to black permit',
  'Shuttle Path to Lot B south shuttle pickup','Feeder To Bravo South','Feeder to Banana','Feeder to Pocket','Feeder to Lot B north',
  'Feeder to Lot C entrance','Feeder to Equity To Lot C entrance','Clay to equity to Lot C entrance',
  'Lot B exit to Clay','Lot B exit to qeuity to feeder exit','Lot C main exit to clay','Lot C main exit to feeder',
  'Lot C exit to clay','Lot C exit to feeder','Lot B main exit to feeder','Lot A North exit to feeder','Lot A south exit to feeder','Black permit exit to feeder',
  'Potential route out of lot C','Potential route out of lot C','Potential route out of lot C',
  ...Array(6).fill('Shuttle Route through a pickup if full'),'All Lot C shuttle pick up route',
  'Lot A main position','Lot B main entrance position','Lot B exit position','Lot C entrance position','Lot C exit position',
  'Lot A building','Lot A black permit','Lot A south','Lot A north','Lot B South','Lot B banana','Lot B pocket','Lot B building','Lot B North',
  'Lot B South Shuttle Pickup','Lot B North Shuttle pick up','Lot C Roundabout Shuttle pickup','Lot C South shuttle pickuo','Lot C North Shuttle pickup',
  'Lot C Building','Lot C North','Lot C South','Lot C First Half','Feeder Road','Equity Drive','Corporate Drive',
  'Lot A Main Entrance position','Police officer','Police Officer','Police officer','Lot B Entrance Position','Lot B exit Position','Lot C entrance and exit Position','Lot C Exit position',
]);
if(source.imageWidth!==IMAGE_SIZE.width||source.imageHeight!==IMAGE_SIZE.height||source.shapes.length!==65)
  throw new Error('Clear Image source dimensions/count changed; rebind source explicitly.');
export const SOURCE_BINDINGS = Object.freeze(source.shapes.map((shape,index)=>{
  const expectedType=index<31?'linestrip':(index>=36&&index<=44)||(index>=50&&index<=56)?'polygon':'point';
  if(shape.label!==SOURCE_LABELS[index]||shape.shape_type!==expectedType||!shape.points.length||shape.points.some(p=>p.length!==2||!p.every(Number.isFinite)))
    throw new Error(`Clear Image source binding mismatch at #${index}: ${shape.label}`);
  return Object.freeze({index,label:shape.label,id:`clear-${index}`,shape});
}));
export const shapeAt = index => SOURCE_BINDINGS[index].shape;
export const pointAt = index => shapeAt(index).points[0];
export const routeAt = index => shapeAt(index).points;
export const POSITION_ALIASES = Object.freeze({31:57,32:61,33:62,34:63,35:64});
export const STAFF_POSITIONS = Object.freeze([
  ['aMain',57,'Lot A Main Position · 5 car batches'],['aExitOfficer',58,'Lot A feeder exit officer'],
  ['corporateOfficer',59,'Feeder / Corporate officer · 10 out / 5 in'],['permitOfficer',60,'Black Permit officer'],
  ['bEntrance',61,'Lot B entrance position'],['bExit',62,'Lot B north exit position'],
  ['cEntrance',63,'Lot C staffed entrance'],['cExit',64,'Lot C exit position'],
].map(([id,index,label])=>({id,index,label,point:pointAt(index)})));
// No home pickup is marked. Average the home endpoints of source shuttle traces,
// not any coordinate from an earlier image. This is an operational staging estimate.
const homeSamples=[routeAt(3)[0],routeAt(30)[0],routeAt(29).at(-1)];
export const SHUTTLE_HOME = Object.freeze([0,1].map(axis=>homeSamples.reduce((sum,p)=>sum+p[axis],0)/homeSamples.length));
export default source;
