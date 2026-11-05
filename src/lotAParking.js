// Approximate traces in latest 1698×1378 satellite pixels, not surveyed dimensions.
const SCALE = 113.6 / 1698;
// Outer curb/entrance trace in the latest satellite; obscured edges are approximate.
export const LOT_A_ENVELOPE = [[125,100],[267,146],[321,77],[369,66],[643,215],[625,260],[608,310],[598,365],[595,420],[593,475],[582,525],[562,570],[533,612],[495,644],[448,669],[399,686],[383,710],[345,710],[344,678],[296,664],[253,650],[211,631],[175,604],[147,567],[127,522],[116,477],[119,430],[132,382],[153,326],[178,267],[202,214],[217,177],[107,132]];
function surface(id, name, pixels, color, elevation = .15) {
  const xs=pixels.map(p=>p[0]), ys=pixels.map(p=>p[1]);
  const cx=(Math.min(...xs)+Math.max(...xs))/2, cy=(Math.min(...ys)+Math.max(...ys))/2;
  return {id:`a-${id}`,type:'surface',name,x:cx*SCALE,z:cy*SCALE,
    width:(Math.max(...xs)-Math.min(...xs))*SCALE,depth:(Math.max(...ys)-Math.min(...ys))*SCALE,
    rotation:0,color,elevation,lotId:'lot-a',points:pixels.map(([x,y])=>[(x-cx)*SCALE,(y-cy)*SCALE])};
}
function row(id, a, b, count, depth=23) {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  return {id,type:'spaces',name:'Lot A · approximate painted bank',x:(a[0]+b[0])/2*SCALE,z:(a[1]+b[1])/2*SCALE,
    width:length/count*SCALE,depth:depth*SCALE,rotation:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI,count,lotId:'lot-a',traceSource:'satellite-approximate'};
}
export function lotAParkingItems() {
  const forecourt=Array.from({length:48},(_,i)=>{const t=i/48*Math.PI*2;return [215+47*Math.cos(t),513+47*Math.sin(t)];});
  return [
    surface('pavement','Lot A · traced paved envelope',LOT_A_ENVELOPE,'#727b7b'),
    surface('forecourt','Lot A · circular pedestrian forecourt',forecourt,'#b5ae99',.20),
    surface('island-west','Lot A · western planted median',[[230,188],[243,194],[148,422],[136,415]],'#436a45',.23),
    surface('island-wing','Lot A · south wing landscape strip',[[391,487],[405,493],[319,641],[305,635]],'#436a45',.23),
    surface('island-n1','Lot A · north row island',[[446,119],[473,133],[470,139],[443,125]],'#436a45',.23),
    surface('island-n2','Lot A · north row island',[[496,147],[523,161],[520,167],[493,153]],'#436a45',.23),
    surface('island-n3','Lot A · north row island',[[548,176],[574,190],[571,196],[545,182]],'#436a45',.23),
    surface('island-east','Lot A · eastern planted end cap',[[603,251],[614,255],[588,301],[578,297]],'#436a45',.23),
    surface('island-south','Lot A · southeast planted end cap',[[452,622],[470,607],[478,615],[460,635]],'#436a45',.23),
    row('row-a',[357,100],[438,144],9),
    row('a-row-north-2',[450,151],[528,193],9),
    row('a-row-north-3',[540,200],[618,242],9),
    row('a-row-middle-1',[337,142],[427,191],10),
    row('a-row-middle-2',[439,197],[515,239],9),
    row('a-row-middle-3',[528,246],[595,282],8),
    row('a-row-building',[319,176],[561,308],27),
    row('a-row-west-outer',[211,243],[151,386],17),
    row('a-row-west-inner',[285,227],[195,416],22),
    row('a-row-court-west',[429,541],[383,620],10),
    row('a-row-court-east',[474,558],[432,632],9),
  ];
}
export function upgradeLotAParking(layout) {
  if(layout.lotAParkingRevision===2) return layout;
  const envelope = surface('pavement','Lot A · traced paved envelope',LOT_A_ENVELOPE,'#727b7b');
  const alignLot = i => i.id === 'lot-a' ? {...i, x:envelope.x,z:envelope.z,width:envelope.width,depth:envelope.depth,rotation:0,points:envelope.points} : i;
  // Boundary-only migration: retain user rows, islands, building and operating state.
  if(layout.lotAParkingRevision===1) return {...layout,lotAParkingRevision:2,items:layout.items.map(i => i.id==='a-pavement'?envelope:alignLot(i))};
  const capacities={'lot-a':411,'lot-b':487,'lot-c':686};
  const items=layout.items.filter(i=>i.id!=='row-a'&&!i.id.startsWith('a-row-')&&!i.id.startsWith('a-island-')&&!['a-pavement','a-forecourt'].includes(i.id))
    .map(i=>i.type==='lot'&&capacities[i.id]?{...i,capacity:capacities[i.id]}:i);
  return {...layout,lotAParkingRevision:2,items:[...items.map(alignLot),...lotAParkingItems()]};
}
