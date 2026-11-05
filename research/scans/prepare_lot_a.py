"""Create a preliminary native LabelMe review draft, never app geometry.
Coordinates below are manual visual picks in the untouched 1698 x 1378 source.
Approved roof points are copied verbatim from src/lotA.js + its documented crop offset.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'research/scans/lot-a-v1'
SOURCE=ROOT/'images/Mosst updated satelite image.png'
OUT.mkdir(parents=True,exist_ok=True)
shapes=[]
def add(fid,kind,points,polygon=True,notes='',confidence='medium',evidence='visual_interpretation',uncertain=True):
    meta=dict(id=fid,lot='A',featureType=kind,confidence=confidence,evidence=evidence,notes=notes,uncertain=uncertain)
    shapes.append(dict(label=fid,points=points,group_id=None,description=json.dumps(meta),shape_type='polygon' if polygon else 'linestrip',flags={},mask=None))

roof=[
('A-roof-west',[[140,68],[210,105],[143,214],[285,295],[220,277],[184,336],[108,321],[126,290],[84,299],[26,265]]),
('A-roof-main',[[210,83],[360,165],[285,295],[143,214]]),
('A-roof-south',[[108,321],[184,336],[114,451],[48,423]])]
for fid,pts in roof:
    add(fid,'roof_section',[[x+190,y+180] for x,y in pts],notes='Approved source outline preserved from src/lotA.js, crop offset (190,180); approval is not a survey. No roof correction proposed.',confidence='high',evidence='commander_approved_existing_trace',uncertain=False)
add('A-east-pavement','ground_pavement',[[550,345],[559,387],[559,511],[475,475]],notes='Approved eastern ground-level paved area copied from src/lotA.js. Shared roof edge is exactly (550,345)-(475,475). Not roof.',evidence='commander_approved_existing_trace',confidence='high',uncertain=False)
add('A-envelope','lot_envelope',[[108,404],[132,334],[165,262],[196,204],[227,156],[271,137],[298,151],[319,139],[347,104],[379,81],[407,78],[439,93],[478,105],[519,122],[563,141],[602,163],[636,191],[651,213],[639,245],[624,288],[620,332],[610,378],[600,428],[589,478],[578,528],[563,574],[540,610],[510,638],[467,661],[420,677],[384,693],[350,691],[320,674],[280,661],[239,645],[202,620],[169,594],[145,564],[125,524],[111,481],[106,439]],notes='Approximate parking/pavement envelope, not property line. Tree-obscured perimeter and driveway throats require manual curb refinement. Contains buildings and landscaping; subtract classified islands at integration.')
# Circular planted center is visibly distinct; no mathematical circle assumption.
add('A-loop-center','landscaped_island',[[205,506],[209,502],[215,500],[222,503],[226,509],[226,516],[222,522],[215,525],[209,523],[204,518],[203,512]],confidence='medium',notes='Visible dark circular center of western pickup/drop-off area; apparent pixel boundary includes shadow.')
add('A-shuttle-pavement','shuttle_pavement',[[161,483],[176,472],[195,469],[219,476],[244,491],[264,511],[249,542],[224,580],[207,609],[185,604],[171,587],[163,563],[156,539],[155,513]],notes='Approximate visible western circular forecourt pavement; shuttle function supplied by Commander, no lane directions inferred.')
add('A-loop-island-north','landscaped_island',[[150,470],[162,467],[178,474],[183,485],[178,494],[168,490],[157,485]],notes='Tree-obscured planted lobe at northwest of loop.')
add('A-loop-island-south','landscaped_island',[[163,543],[175,551],[193,552],[204,561],[200,576],[190,588],[174,590],[162,581],[170,571]],notes='Curved planted lobe; boundary partly shadowed.')
for fid,pts in [
('A-island-west-1',[[144,377],[152,371],[158,378],[157,392],[151,404],[144,398]]),
('A-island-west-2',[[182,431],[192,434],[187,447],[179,443]]),
('A-island-north-bar',[[263,169],[269,164],[291,174],[287,182],[278,177],[246,227],[240,224],[271,175]]),
('A-island-north-small',[[313,210],[325,207],[336,211],[332,219],[321,223],[312,220]]),
('A-island-southeast-1',[[479,531],[488,525],[500,526],[496,541],[485,542]]),
('A-island-southeast-2',[[516,544],[523,542],[533,550],[534,564],[522,560],[514,554]]),
('A-island-southeast-3',[[499,580],[507,579],[521,587],[512,602],[498,601]])]:
    add(fid,'landscaped_island',pts,notes='Visible planted patch; shadow/tree cover makes exact curb uncertain.')
# Shared graph nodes are reused verbatim. Lines indicate physical connectivity, NOT allowed traffic.
west_node=[251,192];south_node=[357,642];east_node=[603,347]
add('A-west-connection','entrance_connection',[[62,116],[99,117],[166,118],[226,122],[252,147],west_node],False,notes='Visible northwest driveway to western street; endpoint shared with west aisle. Not a traffic permission.')
add('A-west-aisle','road_centerline',[west_node,[213,257],[175,326],[139,406],[132,458],[144,512],[161,557]],False,notes='Approximate center of visible west circulation aisle; trees obscure edges.')
add('A-south-connection','entrance_connection',[south_node,[358,673],[369,705],[377,731]],False,notes='Southern driveway connects to Corporate Drive. Centerline approximate.')
add('A-east-connection','entrance_connection',[[574,345],east_node,[632,348]],False,notes='Visible east paved throat; access rules not inferred. Shared east aisle junction.')
add('A-east-aisle','road_centerline',[[619,218],[603,281],east_node,[591,422],[576,495],[555,560],[526,605],[477,641],[412,669],south_node],False,notes='Approximate internal outer circulation path, not lane routing. Junctions reuse exact vertices.')
add('A-south-aisle','road_centerline',[[389,533],[366,576],[340,620],south_node],False,notes='Approximate aisle beside south wing.')
# Parking banks only where stripe rhythm is visible. These lines are row extents, NOT individual stall counts.
for fid,pts in [
('A-row-west-1',[[156,362],[224,240]]),
('A-row-west-2',[[184,365],[245,251]]),
('A-row-north-1',[[368,115],[588,232]]),
('A-row-north-2',[[355,141],[573,257]]),
('A-row-north-3',[[344,167],[558,282]]),
('A-row-south-1',[[399,549],[495,603]]),
('A-row-south-2',[[385,575],[477,626]]),
('A-row-south-3',[[371,603],[438,642]])]:
    add(fid,'parking_row',pts,False,notes='Provisional visible parking-bank extent and orientation only. Faint markings; no inferred stalls or capacity allocation.',confidence='low')
source_relative='../../../images/Mosst updated satelite image.png'
w,h=Image.open(SOURCE).size
annotation=dict(version='7.0.0',flags={'preliminary_review':True},shapes=shapes,imagePath=source_relative,imageData=None,imageHeight=h,imageWidth=w)
(OUT/'annotations.labelme.json').write_text(json.dumps(annotation,indent=2)+'\n')
sources=[]
for path,role in [('images/Mosst updated satelite image.png','primary geometry'),('images/Lot labels.png','lot identification'),('images/apple.png','supporting building evidence; not registered'),('images/google.png','supporting striping evidence; not registered'),('images/zoomed in.png','supporting evidence; not registered'),('research/building-references/lot-a-latest.png','approved geometry crop')]:
    p=ROOT/path
    iw,ih=Image.open(p).size
    sources.append(dict(path=path,role=role,width=iw,height=ih,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),registration={'status':'identity','offset':[0,0]} if 'Mosst' in path else {'status':'unregistered_no_coordinates_transferred'}))
# Verify crop is actually pixel-identical before recording a reliable translation.
crop=Image.open(ROOT/'research/building-references/lot-a-latest.png').convert('RGB')
match=Image.open(SOURCE).convert('RGB').crop((190,180,600,680)).tobytes()==crop.tobytes()
sources[-1]['registration']={'status':'pixel_identical_crop' if match else 'unverified_documented_crop','offset':[190,180],'coordinateTransfer':'x+190,y+180','pixelEqualityVerified':match}
manifest=dict(revision='lot-a-v1-preliminary',status='requires_human_review',coordinateConvention={'origin':'upper-left','x':'right','y':'down','units':'pixels','width':w,'height':h,'scaleToMeters':None,'sceneScale':None,'exportCropOffset':[0,0]},sources=sources,approvedGeometry={'path':'src/lotA.js','preserved':True,'sha256':hashlib.sha256((ROOT/'src/lotA.js').read_bytes()).hexdigest(),'correctionsProposed':False},capacities={'A':411,'B':487,'C':686,'total':1584,'basis':'Commander supplied operational capacity; not image-counted'},annotationMethod='Manually interpreted source-pixel draft generated as editable LabelMe JSON; NOT GUI-traced or segmented automatically',networkJunctions=[{'point':west_node,'features':['A-west-connection','A-west-aisle']},{'point':south_node,'features':['A-south-connection','A-east-aisle','A-south-aisle']},{'point':east_node,'features':['A-east-connection','A-east-aisle']}])
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'{len(shapes)} draft features; crop pixel equality: {match}')
