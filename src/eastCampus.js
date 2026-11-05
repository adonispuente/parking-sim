import { tracedItem } from './campus.js';

// Latest satellite normalized image coordinates. Visual draft, not surveyed geometry.
const B = [[.405,.352],[.414,.267],[.444,.194],[.490,.149],[.551,.136],[.608,.147],[.638,.148],[.650,.161],[.649,.302],[.644,.456],[.635,.568],[.558,.568],[.511,.551],[.447,.521],[.409,.475],[.398,.421]];
const C = [[.655,.130],[.679,.121],[.939,.129],[.965,.151],[.966,.389],[.950,.550],[.914,.553],[.658,.544],[.650,.508],[.650,.305],[.657,.268]];
const north = [[.042,.511],[.134,.516],[.201,.516],[.248,.505],[.284,.485],[.313,.461],[.334,.430],[.347,.396],[.355,.359],[.358,.318],[.360,.276],[.366,.235],[.377,.197],[.392,.166],[.410,.139],[.433,.117],[.463,.099],[.493,.089],[.531,.085],[.604,.086],[.744,.092],[.914,.095],[.984,.096]];
const south = [[.043,.542],[.139,.546],[.205,.546],[.254,.536],[.296,.517],[.330,.491],[.355,.458],[.374,.422],[.383,.383],[.387,.341],[.389,.299],[.393,.260],[.402,.223],[.415,.191],[.432,.165],[.455,.145],[.482,.130],[.511,.121],[.545,.119],[.604,.119],[.743,.122],[.914,.125],[.984,.126]];
function surface(id,name,points,color='#727b7b',elevation=.15,lotId='') {
  return {...tracedItem({id,name,points},'surface'),color,elevation,lotId};
}
function bank(id,lotId,a,b) {
  const scale=113.6, ratio=1378/1698;
  const dx=(b[0]-a[0])*scale,dz=(b[1]-a[1])*scale*ratio;
  const length=Math.hypot(dx,dz), count=Math.max(2,Math.round(length/.57));
  return {id,type:'spaces',name:`${lotId==='lot-b'?'Lot B':'Lot C'} · visible bank (approx.)`,x:(a[0]+b[0])/2*scale,z:(a[1]+b[1])/2*scale*ratio,width:length/count,depth:1.35,rotation:Math.atan2(dz,dx)*180/Math.PI,count,lotId,traceSource:'satellite-approximate'};
}
const bRows=[[[.423,.297],[.475,.190]],[[.432,.327],[.492,.202]],[[.442,.352],[.518,.196]],[[.462,.365],[.531,.223]],[[.553,.162],[.582,.178]],[[.575,.211],[.600,.159]],[[.593,.228],[.618,.176]],[[.580,.267],[.611,.286]],[[.569,.292],[.609,.318]],[[.558,.316],[.598,.342]],[[.636,.161],[.635,.267]],[[.635,.290],[.631,.398]],[[.629,.419],[.625,.530]],[[.577,.409],[.610,.432]],[[.564,.437],[.604,.463]],[[.549,.467],[.594,.496]],[[.540,.493],[.582,.520]],[[.558,.558],[.624,.560]],[[.437,.496],[.485,.525]]];
const cRows=[[[.750,.163],[.750,.198]],[[.776,.163],[.776,.198]],[[.813,.164],[.813,.199]],[[.843,.165],[.843,.200]],[[.872,.166],[.872,.201]],[[.901,.166],[.901,.202]],[[.936,.176],[.934,.211]],[[.936,.226],[.933,.273]],[[.936,.286],[.932,.342]],[[.933,.354],[.930,.405]],[[.920,.439],[.916,.514]],[[.684,.327],[.681,.420]],[[.730,.448],[.909,.452]],[[.713,.507],[.907,.515]]];
export function eastCampusItems() {
  const islands=[
    ['b-west',[[.401,.342],[.405,.294],[.431,.209],[.449,.181],[.455,.189],[.438,.219],[.414,.301],[.410,.344]],'lot-b'],
    ['b-south',[[.448,.523],[.477,.539],[.481,.532],[.453,.516]],'lot-b'],
    ['c-west',[[.682,.214],[.724,.213],[.729,.220],[.726,.245],[.715,.256],[.707,.281],[.697,.290],[.682,.286],[.677,.276]],'lot-c'],
    ['c-north',[[.715,.154],[.723,.153],[.730,.171],[.729,.194],[.720,.195],[.717,.174]],'lot-c'],
    ['c-east-1',[[.926,.216],[.945,.217],[.946,.223],[.926,.222]],'lot-c'],
    ['c-east-2',[[.924,.279],[.943,.280],[.942,.285],[.924,.284]],'lot-c'],
  ];
  return [surface('east-corporate-pavement','Corporate Drive · traced S-shaped pavement',[...north,...south.slice().reverse()],'#46585e',.12),
    surface('east-b-pavement','Lot B · traced pavement',B,'#727b7b',.15,'lot-b'),
    surface('east-c-pavement','Lot C · traced pavement',C,'#727b7b',.15,'lot-c'),
    ...islands.map(([id,p,lot])=>surface(`east-${id}`,'Planted island · approximate',p,'#436a45',.23,lot)),
    ...bRows.map(([a,b],i)=>bank(`east-b-row-${i}`,'lot-b',a,b)),
    ...cRows.map(([a,b],i)=>bank(`east-c-row-${i}`,'lot-c',a,b))];
}
export function upgradeEastCampus(layout) {
  if(layout.eastCampusRevision===1) return layout;
  const removed=new Set(['road-spine','drive-b-east','row-b','row-c','barrier-c']);
  const items=layout.items.filter(i=>!removed.has(i.id)&&!i.id.startsWith('east-')).map(i=> {
    if(i.id==='lot-b'||i.id==='lot-c') {
      const isB=i.id==='lot-b';
      return {...i,...tracedItem({id:i.id,name:isB?'Lot B · Central':'Lot C · East',points:isB?B:C},'lot'),capacity:isB?487:686};
    }
    if(i.id==='center-building') return {...i,...tracedItem({id:i.id,name:'Lot B · roof outline; height estimated',points:[[.535,.234],[.571,.261],[.537,.333],[.584,.373],[.521,.516],[.481,.491],[.512,.419],[.467,.378]]},'building')};
    if(i.id==='east-building') return {...i,...tracedItem({id:i.id,name:'Lot C · roof outline; height estimated',points:[[.755,.230],[.898,.238],[.896,.304],[.865,.303],[.864,.391],[.723,.383],[.725,.324],[.766,.325],[.767,.300],[.754,.299]]},'building')};
    return i;
  });
  return {...layout,eastCampusRevision:1,items:[...items,...eastCampusItems()]};
}

// Commander-confirmed shuttle stops; pavement edges remain photo estimates.
function oval(cx, cy, rx, ry) {
  return Array.from({length:48}, (_,i) => {
    const a=i/48*Math.PI*2;
    return [cx+Math.cos(a)*rx,cy+Math.sin(a)*ry];
  });
}
function access(id,name,points,width=1.65) {
  return {...tracedItem({id,name,points,width,access:true},'road'),elevation:.19};
}
export function upgradeShuttleAccess(layout) {
  const buildingId='east-building';
  const building=tracedItem({id:buildingId,name:'Lot C · building; height estimated',points:[[.756,.231],[.898,.237],[.897,.305],[.852,.305],[.852,.325],[.864,.325],[.864,.392],[.722,.385],[.724,.323],[.769,.323],[.769,.303],[.754,.300]]},'building');
  // Repair missing building even in a previously migrated or edited saved layout.
  const items=layout.items.some(i=>i.id===buildingId)?layout.items:[...layout.items,building];
  if(layout.shuttleAccessRevision===1) return {...layout,items};
  const additions=[
    access('shuttle-a-upper-east','Lot A · upper-east entrance / exit (normally closed)',[[.337,.246],[.355,.259],[.374,.274]]),
    {id:'shuttle-a-gate',type:'barricade',name:'Lot A · upper-east access normally CLOSED',x:.355*113.6,z:.259*113.6*1378/1698,width:1.9,depth:.4,rotation:32,lotId:'lot-a'},
    access('shuttle-b-north','Lot B · north entrance',[[.632,.104],[.634,.153],[.633,.223],[.632,.318]]),
    access('shuttle-b-west','Lot B · west entrance',[[.376,.384],[.411,.384],[.427,.397],[.429,.436],[.445,.468]]),
    access('shuttle-c-north-west','Lot C · north entrance west',[[.738,.107],[.737,.164],[.734,.214],[.733,.271],[.716,.307]]),
    access('shuttle-c-north-east','Lot C · north entrance east (approx.)',[[.951,.111],[.951,.164],[.950,.236],[.946,.319]]),
    ...[['a',.126,.372,.020,.025],['b',.467,.426,.027,.034],['c',.705,.254,.029,.046]].flatMap(([lot,x,y,rx,ry])=>[
      access(`shuttle-${lot}-loop`,`Lot ${lot.toUpperCase()} · shuttle pickup / drop-off loop`,[...oval(x,y,rx,ry),[x+rx,y]],1.05),
      surface(`shuttle-${lot}-island`,`Lot ${lot.toUpperCase()} · shuttle island (approx.)`,oval(x,y,rx*.36,ry*.36),'#58784d',.24,`lot-${lot}`),
    ]),
  ];
  return {...layout,shuttleAccessRevision:1,items:[...items.filter(i=>!i.id.startsWith('shuttle-')),...additions]};
}
