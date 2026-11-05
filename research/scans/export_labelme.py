"""Export reviewable LabelMe polygons/linestrips in unchanged source pixels.
Usage: python export_labelme.py annotation.json output_directory
Requires Pillow. No LabelMe internal API dependency.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from html import escape
from PIL import Image, ImageDraw

COLORS = {'roof_section': '#ff595e', 'ground_pavement': '#ffca3a', 'lot_envelope': '#00c4ff', 'landscaped_island': '#63df78', 'road_centerline': '#b58cff', 'entrance_connection': '#ff9c42', 'parking_row': '#f19aff', 'shuttle_pavement': '#ffffff', 'road_pavement': '#b58cff'}

def cross(a, b, c):
    return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])

def on(a, b, p):
    return abs(cross(a,b,p)) < 1e-8 and min(a[0],b[0]) <= p[0] <= max(a[0],b[0]) and min(a[1],b[1]) <= p[1] <= max(a[1],b[1])

def intersects(a,b,c,d):
    return (cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0) or any((on(a,b,c),on(a,b,d),on(c,d,a),on(c,d,b)))

def export(annotation, out):
    annotation = Path(annotation).resolve()
    raw = json.loads(annotation.read_text())
    source = (annotation.parent / raw['imagePath']).resolve()
    image = Image.open(source).convert('RGB')
    w,h = image.size
    if (w,h) != (raw['imageWidth'], raw['imageHeight']):
        raise ValueError('Annotation dimensions differ from original image')
    features = []
    ids = set()
    for shape in raw['shapes']:
        if shape['shape_type'] not in ('polygon','linestrip','line'):
            raise ValueError('Use polygons or linestrips, not rasterized masks/circles')
        meta = json.loads(shape.get('description') or '{}')
        fid = meta.get('id', shape['label'])
        if fid in ids:
            raise ValueError('Duplicate ID: '+fid)
        ids.add(fid)
        pts = [list(p) for p in shape['points']]
        if any(len(p)!=2 or not all(isinstance(n,(int,float)) and math.isfinite(n) for n in p) or not (0<=p[0]<w and 0<=p[1]<h) for p in pts):
            raise ValueError('Invalid/out-of-frame coordinates: '+fid)
        polygon = shape['shape_type']=='polygon'
        if polygon and pts[0]==pts[-1]:
            pts.pop()
        if len(pts)<(3 if polygon else 2):
            raise ValueError('Insufficient points: '+fid)
        if any(a==b for a,b in zip(pts,pts[1:])):
            raise ValueError('Duplicate adjacent vertices: '+fid)
        if polygon:
            if abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(pts,pts[1:]+pts[:1])))<1e-8:
                raise ValueError('Zero area: '+fid)
            edges=list(zip(pts,pts[1:]+pts[:1]))
            for i,(a,b) in enumerate(edges):
                for j,(c,d) in enumerate(edges):
                    if j<=i+1 or (i==0 and j==len(edges)-1): continue
                    if intersects(a,b,c,d): raise ValueError('Self intersection: '+fid)
            pts.append(pts[0][:])
        features.append(dict(id=fid,lot=meta.get('lot','A'),featureType=meta['featureType'],geometry={'type':'Polygon' if polygon else 'LineString','coordinates':pts},sourceImage=raw['imagePath'],confidence=meta.get('confidence','low'),evidence=meta.get('evidence','visual_interpretation'),notes=meta.get('notes',''),uncertain=meta.get('uncertain',True)))
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    payload={'schemaVersion':'1.0','coordinateFrame':'source-image-pixels','imageWidth':w,'imageHeight':h,'features':features}
    (out/'features.json').write_text(json.dumps(payload,indent=2)+'\n')
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">','<title>Lot A source-pixel vector trace — preliminary review</title>']
    draw=ImageDraw.Draw(image)
    for f in features:
        pts=f['geometry']['coordinates']; color=COLORS.get(f['featureType'],'#ffffff')
        # The SVG intentionally has no resampled image; overlay.png uses original pixels.
        dash=' stroke-dasharray="6 4"' if f['uncertain'] else ''
        tag='polygon' if f['geometry']['type']=='Polygon' else 'polyline'
        coords=' '.join(f'{x},{y}' for x,y in pts)
        svg.append(f'<g id="{escape(f["id"])}"><title>{escape(f["notes"])}</title><{tag} points="{coords}" fill="none" stroke="{color}" stroke-width="2"{dash}/><text x="{pts[0][0]+3}" y="{pts[0][1]-3}" font-size="10" fill="{color}">{escape(f["id"])}</text></g>')
        for a,b in zip(pts,pts[1:]):
            if not f['uncertain']: draw.line((tuple(a),tuple(b)),fill=color,width=2);continue
            length=math.dist(a,b)
            for start in range(0,math.ceil(length),10):
                t=start/max(length,1);u=min(start+6,length)/max(length,1)
                draw.line((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u),fill=color,width=2)
        draw.text((pts[0][0]+3,pts[0][1]-12),f['id'],fill=color,stroke_width=1,stroke_fill='black')
    svg.append('</svg>')
    (out/'trace.svg').write_text('\n'.join(svg)+'\n')
    image.save(out/'overlay.png')
    report={'status':'pass','features':len(features),'imageSize':[w,h],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'checks':['original image dimensions','finite in-frame coordinates','unique IDs','closed exported polygon rings','nonzero polygon area','polygon self-intersection'],'limitations':['No automatic proof of real-world accuracy','No inferred traffic permissions','Shared edges and network junctions require explicit source review']}
    (out/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('annotation');parser.add_argument('output');args=parser.parse_args();export(args.annotation,args.output)
