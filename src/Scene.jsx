import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD } from './model.js';
import { createCampusTraffic, createTenCarDemo } from './traffic.js';
import { createSeekablePlayback } from './playback.js';
import { captureTrafficFrame } from './playbackFrames.js';
import { SHUTTLE_STOPS } from './shuttleRoutes.js';
import { PARKING_ZONES } from './parkingZones.js';
import { ZONE_STAGING } from './parkingRoutes.js';
import { makeOccupancyFillPieces } from './occupancyFill.js';
import { C_ZONE_PIECES } from './cParkingGeometry.js';
import { VECTOR_ROUTES } from './vectorRoutes.js';
import { A_DEPARTURE_MERGE } from './lotAControl.js';
import referenceUrl from '../images/Clear Image.png';
import { STAFF_POSITIONS } from './clearImageSource.js';
import { tracedFeatures, traceWorldPoint } from './tracedMap.js';
import { VEHICLE_ROUTE_CATALOG, catalogSummary, routeDiagnostics, subscribeRouteRuntime } from './vehicleRouteCatalog.js';
import { createVehicleVisual, createVolunteerVisual } from './worldActors.js';
import { worldSurfaceMaterial } from './presentationMaterials.js';
import { createPresentationPavement } from './presentationPavement.js';
import { createPresentationLots, REPLACED_WORLD_SURFACES } from './presentationLots.js';
import { createBuildingModel } from './buildingModels.js';
import { MAIN_POSITION_RESOLUTION, FEEDER_OFFICER_POSITION, C_HUB_POSITIONS } from './positions/index.js';
import { C_HUBS, C_FOUR_WAY } from './cHubSource.js';
import { roadAnchoredRoute } from './roadAnchoredRoutes.js';
import { EQUITY_CLAY_STOP_POSITION } from './equityClayStop.js';
import { overlayDisplay, overlaySummary, CONFIDENCE_COLORS, PROBLEM_COLOR } from './layoutOverlayView.js';
import { exitTraceOverlay, EXIT_TRACE_COLOR } from './exitPathOverlayView.js';

// M3 S3: read-only layout overlay (images/layout-overlay.json), built once per load.
const LAYOUT_VIEW = overlayDisplay();
const EXIT_TRACE_VIEW = exitTraceOverlay();

function release(group) {
  group.traverse(object => {
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => {
      if (!material) return;
      if (material.map?.userData?.generated) material.map.dispose();
      material.dispose();
    });
  });
  group.clear();
}

function box(parent, w, h, d, color, x = 0, y = 0, z = 0, opacity = 1) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9, transparent: opacity < 1, opacity }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function label(parent, text, x, y, z, color = '#e9f0e9', size = 13) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.font = '600 33px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#122e29'; ctx.shadowBlur = 10; ctx.fillStyle = color;
  const draw=value=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillText(value.slice(0,40),384,48,740);};
  draw(text);
  const map = new THREE.CanvasTexture(canvas); map.userData.generated = true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false }));
  sprite.userData.isLabel = true;
  sprite.position.set(x, y, z); sprite.scale.set(size, size / 8, 1); sprite.renderOrder = 10;
  sprite.userData.setText=value=>{draw(value);map.needsUpdate=true;};
  parent.add(sprite);
  return sprite;
}

function line(parent, points, color, y = 0.3) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, y, z)));
  const mesh = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  parent.add(mesh);
}

function drawItem(item, selected, world = false) {
  const group = new THREE.Group();
  group.position.set(item.x, 0, item.z); group.rotation.y = -item.rotation * Math.PI / 180;
  group.userData.id = item.id;
  const { width: w, depth: d } = item;
  if (world && item.type === 'surface' && REPLACED_WORLD_SURFACES.includes(item.id)) {
    return group; // World-only replacement preserves NoMedians gaps; diagnostic source stays unchanged.
  }
  if (item.type === 'lot') {
    if (world) return group; // Region bounds are not rectangular pavement.
    if (item.points) {
      line(group, [...item.points,item.points[0]], item.open ? item.color : '#87928e', .24);
    } else {
      box(group, w, 0.14, d, item.open ? item.color : '#67736e', 0, 0.11, 0, 0.24);
      line(group, [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[-w/2,-d/2]], item.open ? item.color : '#87928e');
    }
    label(group, `${item.name}  /  ${item.open ? item.capacity + ' spaces*' : 'CLOSED'}`, 0, 1, -d/2 - 2, item.color, 22);
  } else if (item.type === 'surface') {
    const shape = new THREE.Shape(item.points.map(([x,z]) => new THREE.Vector2(x,-z)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI/2);
    const presented = world ? worldSurfaceMaterial(item.id) : null;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color:presented?.color ?? (world?(/blocked off/i.test(item.name)?'#68715d':'#606a69'):item.color), roughness:presented?.roughness ?? 1, side:THREE.DoubleSide}));
    mesh.position.y = item.elevation;
    mesh.receiveShadow = true;
    group.add(mesh);
  } else if (item.type === 'building' && item.masses) {
    item.masses.forEach(mass => {
      const shape = new THREE.Shape(mass.points.map(([x,z]) => new THREE.Vector2(x,-z)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: mass.height, bevelEnabled: false });
      geometry.rotateX(-Math.PI/2);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: mass.color, roughness: .95 }));
      mesh.position.y = .2; group.add(mesh);
      line(group, [...mass.points, mass.points[0]], '#777b70', mass.height + .22);
    });
    label(group, 'Lot A · roof heights estimated', 0, 4, -item.depth/2-2, '#f8f5df', 16);
  } else if (item.type === 'building' && item.points) {
    // World view: source-grounded roof masses on the exact approved footprint;
    // falls back to the generic slab if the footprint no longer matches a profile.
    const model = world ? createBuildingModel(item) : null;
    if (model) {
      group.add(model);
      label(group, item.name, 0, 4, 0, '#f8f5df', 14);
      return group;
    }
    const shape = new THREE.Shape(item.points.map(([x,z]) => new THREE.Vector2(x,-z)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false });
    geometry.rotateX(-Math.PI/2);
    const mesh = new THREE.Mesh(geometry, [
      new THREE.MeshStandardMaterial({ color: world?'#eee9d8':'#a3b4ac', roughness: .88 }),
      new THREE.MeshStandardMaterial({ color: world?'#b7b9aa':'#a3b4ac', roughness: .95 }),
    ]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.y = .2; group.add(mesh);
    if (world) line(group, [...item.points,item.points[0]], '#faf4e2', 2.62);
    label(group, item.name, 0, 4, 0, '#f8f5df', 14);
  } else if (item.type === 'building') {
    box(group, w, 2.4, d, '#708d8c', 0, 1.3);
    box(group, w + 0.4, 0.25, d + 0.4, '#a3b4ac', 0, 2.6);
    label(group, item.name, 0, 4, 0, '#f8f5df', 14);
  } else if (item.type === 'road' && item.points) {
    const curve = new THREE.CatmullRomCurve3(item.points.map(([x,z]) => new THREE.Vector3(x,0,z)), false, 'centripetal');
    const samples = curve.getPoints(180), vertices = [], indices = [];
    samples.forEach((p, index) => {
      const tangent = samples[Math.min(index+1, samples.length-1)].clone().sub(samples[Math.max(0,index-1)]).normalize();
      const normal = new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar((item.roadWidth ?? 2.2)/2);
      const elevation=item.elevation ?? .07;
      vertices.push(p.x+normal.x,elevation,p.z+normal.z,p.x-normal.x,elevation,p.z-normal.z);
      if(index < samples.length-1) { const n=index*2; indices.push(n,n+2,n+1,n+1,n+2,n+3); }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:world?worldSurfaceMaterial(item.id).color:(item.access?'#67777a':'#46585e'),side:THREE.DoubleSide})));
    // Edge lines describe pavement, not permitted travel directions.
    [-1,1].forEach(side => line(group,samples.map((p,index) => {
      const t=samples[Math.min(index+1,samples.length-1)].clone().sub(samples[Math.max(0,index-1)]).normalize();
      return [p.x-t.z*(item.roadWidth??2.2)/2*side,p.z+t.x*(item.roadWidth??2.2)/2*side];
    }), '#a2aaa1', (item.elevation ?? .07)+.02));
    if(item.id.startsWith('shuttle-') && item.id.endsWith('-loop')) label(group,item.name,0,1.2,0,'#ffe3a1',13);
  } else if (item.type === 'road') {
    box(group, w, 0.07, d, world?worldSurfaceMaterial(item.id).color:'#52676a', 0, 0.05);
    for (let x = -w/2 + 1; x < w/2; x += 3) box(group, 1.3, 0.03, 0.1, '#b0b9a8', x, 0.11);
  } else if (item.type === 'spaces') {
    const length = item.count * w;
    box(group, length, 0.05, d, '#729286', 0, 0.27, 0, 0.2);
    for (let n = 0; n <= item.count; n++) box(group, 0.09, 0.06, d, '#e0e9c5', -length/2 + n*w, 0.32);
    box(group, length, 0.06, 0.09, '#e0e9c5', 0, 0.32, -d/2);
  } else if (item.type === 'barricade') {
    box(group, w, 0.9, d, '#ed9d58', 0, 0.85);
    for (let x = -w/2 + 0.5; x < w/2; x += 1) box(group, 0.35, 0.94, d + 0.04, '#fff0cf', x, 0.85);
    box(group, 0.4, 0.5, 1.1, '#243e39', -w/3, 0.25); box(group, 0.4, 0.5, 1.1, '#243e39', w/3, 0.25);
  } else if (item.type === 'position') {
    if (world) {
      group.add(createVolunteerVisual());
      label(group, item.role, 0, 3.8, 0, '#f8d58d', 13);
      return group;
    }
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.16, 24), new THREE.MeshStandardMaterial({ color: '#f2c36b' }));
    ring.position.y = 0.25; group.add(ring);
    box(group, 0.6, 1.4, 0.5, '#fcf1d7', 0, 1);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), new THREE.MeshStandardMaterial({ color: '#fcf1d7' }));
    head.position.y = 2; group.add(head);
    label(group, item.role, 0, 3.8, 0, '#f8d58d', 13);
  }
  if (selected) {
    // A fixed local footprint is clearer than including the sprite labels.
    const ww = item.type === 'spaces' ? item.count*w : w;
    line(group, [[-ww/2-0.6,-d/2-0.6],[ww/2+0.6,-d/2-0.6],[ww/2+0.6,d/2+0.6],[-ww/2-0.6,d/2+0.6],[-ww/2-0.6,-d/2-0.6]], '#ffffff', 0.6);
  }
  return group;
}

export default function Scene({ layout, selectedId, tool, reference, traced = false, world = false, showLabels = true, showOccupancy = true, cameraFocus = 'campus', cameraReset = 0, running, playbackSpeed = 5, seekRequest, onPlaybackState, onReplayInvalidated, trafficRates, trafficReset, trafficMode, trafficOptions, onTrafficStats, view, zoom, showRoutes = false, onPick, onPlace }) {
  const mount = useRef(null), engine = useRef(null), latest = useRef({});
  const consumedSeek = useRef(null);
  const [error, setError] = useState('');
  const replayInputs = {
    rates: trafficRates ?? [18,18,0],
    lots: layout.items.filter(i=>i.type==='lot').map(i=>({id:i.id,open:i.open})),
    phase: trafficOptions?.phase ?? 'arrival', shuttles: trafficOptions?.shuttles ?? {},
    zonePreferences: trafficOptions?.zonePreferences ?? {}, departurePolicy: trafficOptions?.departurePolicy ?? {},
  };
  const inputKey = JSON.stringify(replayInputs);
  latest.current = { tool, onPick, onPlace, running, playbackSpeed, onTrafficStats, onPlaybackState, onReplayInvalidated, replayInputs };

  useEffect(() => {
    const host = mount.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setError('3D rendering is unavailable in this browser. Enable WebGL or use a recent Safari/Chrome browser. Your layout controls and JSON exports still work.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor('#b8c7bb'); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.localClippingEnabled=true;
    renderer.domElement.setAttribute('aria-label', 'Interactive church site. Select an object, or choose a tool and tap the map to place it.');
    renderer.domElement.setAttribute('role', 'img');
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#e8f1ff', '#63785a', 2));
    const sun = new THREE.DirectionalLight('#fff1d4', 2.8); sun.position.set(-20, 80, -25);
    sun.target.position.set(WORLD.width/2,0,WORLD.height/2);
    sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-90,right:90,top:90,bottom:-90,near:1,far:220});
    sun.shadow.bias=-.001; sun.shadow.normalBias=.12;
    scene.add(sun,sun.target);
    const camera = new THREE.OrthographicCamera(-60, 60, 50, -50, 0.1, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; controls.enableDamping = true;
    controls.minZoom = 0.6; controls.maxZoom = 5;
    controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI/2.35;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.PAN; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, WORLD.height), new THREE.MeshStandardMaterial({ color: '#87977a', roughness:1 }));
    ground.rotation.x = -Math.PI/2; ground.position.set(WORLD.width/2, -0.08, WORLD.height/2); scene.add(ground);
    ground.receiveShadow=true;
    const base=box(scene,WORLD.width,1.5,WORLD.height,'#566c5b',WORLD.width/2,-.86,WORLD.height/2);
    const texture = new THREE.TextureLoader().load(referenceUrl, () => { texture.colorSpace = THREE.SRGBColorSpace; }, undefined, () => setError('The reference image could not load. The schematic editor is still available.'));
    const source = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, WORLD.height), new THREE.MeshBasicMaterial({ map: texture }));
    source.rotation.x = -Math.PI/2; source.position.set(WORLD.width/2, 0.01, WORLD.height/2); source.visible = false; scene.add(source);
    const context = new THREE.Group(); scene.add(context);
    const traces = new THREE.Group(); scene.add(traces);
    const traceColors = { building: '#ffda76', road: '#60d5e7', route:'#9b8b80', position:'#ffe08a', 'allocation-mask':'#e5d16b', roundabout: '#ffa55b', pickup: '#ff86bd', 'parking-area': '#c4f174' };
    tracedFeatures.forEach(feature => {
      if(feature.canonicalIndex!==feature.index)return;
      const color = traceColors[feature.category];
      let points = feature.points;
      if (feature.shapeType === 'circle') {
        const [[cx, cz], [ex, ez]] = points;
        const radius = Math.hypot(ex - cx, ez - cz);
        points = Array.from({ length: 64 }, (_, i) => [cx + radius * Math.cos(i * Math.PI / 32), cz + radius * Math.sin(i * Math.PI / 32)]);
      }
      if (feature.shapeType === 'point') {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(.38, 12, 8), new THREE.MeshBasicMaterial({ color, depthTest: false }));
        marker.position.set(points[0][0], .55, points[0][1]); traces.add(marker);
      } else {
        line(traces, feature.shapeType==='polygon'?[...points,points[0]]:points, color, .52);
      }
      const center = feature.shapeType === 'circle' || feature.shapeType === 'point' ? points[0] :
        [points.reduce((v,p) => v + p[0], 0) / points.length, points.reduce((v,p) => v + p[1], 0) / points.length];
      label(traces, `${feature.id} · ${feature.label}`, center[0], .95, center[1], color, 11);
    });

    const objects = new THREE.Group(), traffic = new THREE.Group(), parkedMarkers = new THREE.Group(), staffing = new THREE.Group(), shuttleStops = new THREE.Group(), occupancyFills=new THREE.Group();
    scene.add(objects, traffic, parkedMarkers, staffing, shuttleStops, occupancyFills);
    // One grouped marker per section, or per hub in C. Departures update counts
    // without reallocating geometry/material/texture ownership.
    const parkedByZone=new Map();
    for(const zone of [...PARKING_ZONES.filter(z=>z.lot!=='c'),...C_HUBS.map(h=>({id:h.id,point:h.point,name:`C Hub ${h.sourceIndex-50}`}))]) {
      const [x,z]=traceWorldPoint(zone.point??ZONE_STAGING[zone.id]);
      const marker=new THREE.Group();marker.position.set(x,.6,z);marker.visible=false;
      box(marker,.65,.35,1.35,'#e3c673');
      box(marker,.52,.22,.62,'#e2ece8',0,.26,-.1);
      const name=zone.name??zone.id;
      const caption=label(marker,`${name} · 0 parked*`,0,2,0,'#ffda76',12);
      parkedMarkers.add(marker);parkedByZone.set(zone.id,{marker,caption,name,count:0});
    }
    const zoneFills=[];
    for(const zone of PARKING_ZONES) {
      const feature=tracedFeatures.find(f=>f.label.toLowerCase()===zone.label.toLowerCase());
      const pieces=C_ZONE_PIECES[zone.id]?.map(ring=>ring.map(traceWorldPoint))??(feature?[feature.points]:[]);
      if(!pieces.length)continue;
      // Disjoint polygon pieces preserve the intersection of North/South and
      // First Half, without filling the C building or the unselected remainder.
      const vertices=[];
      for(const points of pieces) {
        const triangles=THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(...p)),[]);
        for(const ids of triangles)for(const id of ids)vertices.push(points[id][0],0,points[id][1]);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      const plane=new THREE.Plane(new THREE.Vector3(-1,0,0),0);
      const material=new THREE.MeshBasicMaterial({color:zone.half==='first'?'#e5d16b':zone.general?'#83ce71':'#d0a1ee',transparent:true,opacity:.46,depthWrite:false,side:THREE.DoubleSide,clippingPlanes:[plane]});
      const mesh=new THREE.Mesh(geometry,material);mesh.position.y=.47;mesh.visible=false;occupancyFills.add(mesh);
      zoneFills.push({zone,mesh,plane,cutoff:makeOccupancyFillPieces(pieces)});
    }
    SHUTTLE_STOPS.forEach(stop=>{
      const [x,z]=traceWorldPoint(stop.point);
      const marker=new THREE.Mesh(new THREE.RingGeometry(.6,.85,24),new THREE.MeshBasicMaterial({color:'#e8a5ff',side:THREE.DoubleSide}));
      marker.rotation.x=-Math.PI/2;marker.position.set(x,.7,z);shuttleStops.add(marker);
      label(shuttleStops,stop.id==='home'?'SHUTTLE HOME · A':stop.label,x,1.5,z-1.5,'#e8a5ff',13);
    });
    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0,1,0),0);
    let down;
    const pointerDown = event => { down = { x: event.clientX, y: event.clientY, time: performance.now() }; };
    const pointerUp = event => {
      if (!down || Math.hypot(event.clientX-down.x,event.clientY-down.y)>7 || performance.now()-down.time>600) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1);
      ray.setFromCamera(pointer,camera);
      const point = ray.ray.intersectPlane(plane,new THREE.Vector3());
      if (!point || point.x<0 || point.x>WORLD.width || point.z<0 || point.z>WORLD.height) return;
      if (latest.current.tool !== 'select') { latest.current.onPlace(point.x,point.z); return; }
      const hits = ray.intersectObjects(objects.children,true);
      let id = null;
      for (const hit of hits) {
        let parent=hit.object;
        while(parent && !parent.userData.id) parent=parent.parent;
        if (parent) { id=parent.userData.id; break; }
      }
      latest.current.onPick(id);
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    const resize = () => {
      const w=host.clientWidth, h=host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w,h);
      const aspect=w/h, span=Math.max(105,125/aspect);
      camera.left=-span*aspect/2; camera.right=span*aspect/2; camera.top=span/2; camera.bottom=-span/2;
      camera.updateProjectionMatrix();
    };
    const observer=new ResizeObserver(resize); observer.observe(host); resize();
    const simulation=createCampusTraffic();
    // Optional vehicle-route overlay: green candidate (geometric only, not field-
    // confirmed), orange provisional, purple proposal, red open/no-return or unbound.
    // Labels are static, so they state ELIGIBILITY only ("eligible" / "guidance OFF").
    // What the simulation actually built is in the dashboard "Route sources" panel and
    // canvas[data-route-catalog], both refreshed on every runtime change.
    const routeOverlay=new THREE.Group();routeOverlay.visible=false;scene.add(routeOverlay);
    line(routeOverlay,[...C_FOUR_WAY,C_FOUR_WAY[0]].map(traceWorldPoint),'#ffe08a',.68);
    for(const hub of C_HUBS) {
      const [x,z]=traceWorldPoint(hub.point);
      const marker=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),new THREE.MeshBasicMaterial({color:'#7cf09a',depthTest:false}));
      marker.position.set(x,.7,z);routeOverlay.add(marker);
      label(routeOverlay,`C Hub ${hub.sourceIndex-50}`,x,1.6,z,'#7cf09a',10);
    }
    const routeColors={source:'#7cf09a',guidance:'#ffb347',candidate:'#7cf09a',provisional:'#ffb347',proposal:'#c58cff',unbound:'#ff5d5d'};
    const eligibility=new Map(routeDiagnostics().zones.map(z=>[z.routeId,z.eligible]));
    for(const route of VEHICLE_ROUTE_CATALOG.routes) {
      if(route.shapeType!=='linestrip')continue;
      if(!route.points.length)continue;
      const open=route.diagnostics.some(d=>['open-end','no-return'].includes(d.code));
      const color=open?'#ff5d5d':routeColors[route.status]??'#ffffff';
      const pts=route.points.map(traceWorldPoint);
      if(route.shapeType==='point') {
        const marker=new THREE.Mesh(new THREE.SphereGeometry(.5,12,8),new THREE.MeshBasicMaterial({color,depthTest:false}));
        marker.position.set(pts[0][0],.7,pts[0][1]);routeOverlay.add(marker);
      } else {
        // Dim registered evidence; bright cyan is a road-anchored comparison,
        // not a claim that a new runtime route or swept-clearance check is live.
        line(routeOverlay,pts,'#9b8b80',.61);

      }
      const runtimeNote=route.runtime?' · source evidence':'';
      label(routeOverlay,`${route.id} · ${route.status}${runtimeNote}`,pts.at(-1)[0],1.3,pts.at(-1)[1],color,9);
    }
    // M3 S3 layout overlay: a child of routeOverlay, so the existing Routes toggle shows/hides it
    // and release(scene) disposes it. Display only; routing reads layoutOverlay.js directly.
    // Distinct grammar from route lines: translucent fills, dashed rule outlines, chevrons.
    const layoutGroup=new THREE.Group();layoutGroup.name='layout-overlay';routeOverlay.add(layoutGroup);
    const LY=.66;
    const overlayLine=(pts,color,dashed=false)=>{
      const geometry=new THREE.BufferGeometry().setFromPoints(pts.map(([x,z])=>new THREE.Vector3(x,LY,z)));
      const material=dashed?new THREE.LineDashedMaterial({color,dashSize:1.1,gapSize:.7,depthTest:false}):new THREE.LineBasicMaterial({color,depthTest:false});
      const mesh=new THREE.Line(geometry,material);if(dashed)mesh.computeLineDistances();mesh.renderOrder=6;layoutGroup.add(mesh);
    };
    for(const f of LAYOUT_VIEW.features) {
      if(f.ring) {
        const ring=f.ring.map(traceWorldPoint);
        // Shape is drawn in XY then laid flat: rotation.x=-PI/2 maps shape y=-z back to world z.
        const shape=new THREE.Shape(ring.map(([x,z])=>new THREE.Vector2(x,-z)));
        const fill=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:f.color,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
        fill.rotation.x=-Math.PI/2;fill.position.y=LY-.01;fill.renderOrder=5;layoutGroup.add(fill);
        overlayLine([...ring,ring[0]],f.color,f.dashed);
      }
      if(f.path) overlayLine(f.path.map(traceWorldPoint),f.color,f.dashed);
      if(f.point) {
        // Diamond, not a circle: shuttle stops already use pink rings.
        const [x,z]=traceWorldPoint(f.point);
        const marker=new THREE.Mesh(new THREE.RingGeometry(.45,.8,4),new THREE.MeshBasicMaterial({color:f.color,side:THREE.DoubleSide,depthTest:false}));
        marker.rotation.x=-Math.PI/2;marker.position.set(x,LY,z);marker.renderOrder=6;layoutGroup.add(marker);
      }
      for(const chevronPts of f.arrows) overlayLine(chevronPts.map(traceWorldPoint),f.color);
      const [lx,lz]=traceWorldPoint(f.labelAt);
      // Larger than route tags (9) so the runtime/advisory status and meaning stay readable.
      label(layoutGroup,f.label,lx,1.7,lz-1.4,f.color,15);
      label(layoutGroup,f.meaning,lx,1.6,lz+.6,f.color,12);
    }
    // Drawn exit traces (images/ExitPathsAndC.json): a child of routeOverlay, so the
    // existing Routes toggle shows/hides it and release(scene) disposes it. Display only;
    // exact drawn points, no direction implied, no roundabout-as-road shapes.
    const exitGroup=new THREE.Group(); exitGroup.name='exit-trace-overlay'; routeOverlay.add(exitGroup);
    for(const l of EXIT_TRACE_VIEW.lines) {
      const geometry=new THREE.BufferGeometry().setFromPoints(l.worldPoints.map(([x,z])=>new THREE.Vector3(x,.63,z)));
      const mesh=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:EXIT_TRACE_COLOR,depthTest:false}));
      mesh.renderOrder=7; mesh.userData.exitTraceId=l.id; exitGroup.add(mesh);
      label(exitGroup,l.tag,l.labelAt[0],1.2,l.labelAt[1],EXIT_TRACE_COLOR,7);
    }
    // Init-time inventory only; the live count is dataset.exitTraceLive, read on every toggle.
    renderer.domElement.dataset.exitTraceOverlay=JSON.stringify({file:EXIT_TRACE_VIEW.file,total:EXIT_TRACE_VIEW.total,counts:EXIT_TRACE_VIEW.counts,activated:EXIT_TRACE_VIEW.activated,initLines:exitGroup.children.filter(o=>o.isLine).length});
    renderer.domElement.dataset.layoutOverlay=JSON.stringify(overlaySummary(LAYOUT_VIEW));
    renderer.domElement.dataset.routeCatalog=JSON.stringify(catalogSummary());
    const stopRouteRuntime=subscribeRouteRuntime(()=>{renderer.domElement.dataset.routeCatalog=JSON.stringify(catalogSummary());});
    for(const {id,label:name,point:pixel} of [...STAFF_POSITIONS,...C_HUB_POSITIONS]) {
      const [x,z]=traceWorldPoint(pixel);
      staffing.add(drawItem({id:`${id}-volunteer`,type:'position',x,z,width:1,depth:1,rotation:0,role:name},false,true));
      label(staffing,name,x,4,z-3,'#ffe08a',17);
    }
    const [stopX,stopZ]=traceWorldPoint(EQUITY_CLAY_STOP_POSITION);
    label(staffing,'Equity / Clay · 3-way STOP',stopX,4,stopZ,'#ffb6a5',17);
    engine.current={renderer,scene,camera,controls,objects,traffic,parkedMarkers,parkedByZone,staffing,shuttleStops,occupancyFills,ground,base,source,context,traces,routeOverlay,simulation,carMeshes:new Map(),zoneFills};
    let frame, previousTime, lastReport=0;
    const animate = time => {
      frame=requestAnimationFrame(animate); controls.update();
      const dt=previousTime===undefined?0:(time-previousTime)/1000; previousTime=time;
      const e=engine.current;
      if(e?.playback && latest.current.running) {
        const work=e.playback.advance(dt,latest.current.playbackSpeed);
        work?.catch(error=>latest.current.onPlaybackState?.({error:error.message,seeking:false}));
        e.simulation=e.playback.simulation;
      }
      if(e) {
        for(const fill of e.zoneFills) {
          const occupied=e.simulation.zoneOccupancy[fill.zone.id]??0;
          if(fill.occupied!==occupied){fill.mesh.visible=occupied>0;fill.plane.constant=fill.cutoff(occupied/fill.zone.capacity);fill.occupied=occupied;}
        }
        for(const [zone,entry] of e.parkedByZone) {
          const count=(zone.startsWith('c-hub-')?e.simulation.cHubOccupancy?.[zone]:e.simulation.zoneOccupancy[zone])??0;
          if(entry.count===count)continue;
          entry.marker.visible=count>0;entry.caption.userData.setText(`${entry.name} · ${count} parked*`);entry.count=count;
        }
        const displayed=[...e.simulation.cars];
        for(const bus of e.simulation.shuttles??[]) {
          if(displayed.some(car=>car.id===bus.id))continue;
          const stop=SHUTTLE_STOPS.find(s=>s.id===(bus.dwellStop??(bus.phase==='remote-dwell'?bus.stop:'home')))??SHUTTLE_STOPS[0];
          displayed.push({id:bus.id,fleetBus:true,shuttle:true,busNumber:bus.number,stationary:bus.stationary??stop.point});
        }
        const active=new Set(displayed.map(c=>c.id));
        for(const [id,mesh] of e.carMeshes) if(!active.has(id)) { release(mesh); e.traffic.remove(mesh); e.carMeshes.delete(id); }
        for(const car of displayed) {
          let mesh=e.carMeshes.get(car.id);
          if(!mesh) {
            mesh=createVehicleVisual(car);
            e.traffic.add(mesh); e.carMeshes.set(car.id,mesh);
          }
          if(car.stationary){const [x,z]=traceWorldPoint(car.stationary);mesh.position.set(x,.6,z);continue;}
          const lane=e.simulation.lanes[car.lane], t=Math.min(1,car.distance/lane.length);
          const pos=lane.path.getPointAt(t), tangent=lane.path.getTangentAt(t);
          mesh.position.copy(pos); mesh.rotation.y=Math.atan2(tangent.x,tangent.z);
        }
        if(time-lastReport>500) {
          renderer.domElement.dataset.simulationSeconds=String(e.simulation.clock);
          renderer.domElement.dataset.seeking=String(e.playback?.seeking??false);
          renderer.domElement.dataset.trafficFrame=JSON.stringify(e.simulation.cars.slice(0,12).map(car=>({id:car.id,lane:car.lane,distance:car.distance})));
          renderer.domElement.dataset.replayHistory=JSON.stringify(e.playback?.historyInfo??{});
          latest.current.onPlaybackState?.({...e.playback?.progress,clock:e.playback?.clock??e.simulation.clock,seeking:e.playback?.seeking??false});
          renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);
          renderer.domElement.dataset.positionResolution=JSON.stringify(MAIN_POSITION_RESOLUTION);
          renderer.domElement.dataset.feederOfficer=JSON.stringify(e.simulation.feederOfficer??null);
          latest.current.onTrafficStats?.({cRoundabout:e.simulation.cRoundabout?structuredClone(e.simulation.cRoundabout):null,cHubOccupancy:{...e.simulation.cHubOccupancy},active:e.simulation.cars.filter(c=>!c.fleetBus).length,entered:[...e.simulation.entered],exited:[...e.simulation.exited],waiting:[...e.simulation.waiting],occupancy:{...e.simulation.occupancy},reserved:{...e.simulation.reserved},assignments:{...e.simulation.assignments},parked:{...e.simulation.parked},overflow:e.simulation.overflow,sentAway:e.simulation.sentAway,atCapacity:e.simulation.atCapacity,departed:{...e.simulation.departed},departing:e.simulation.cars.filter(car=>car.phase==='departing').length,badgeParking:e.simulation.badgeParking,badgeReserved:e.simulation.badgeReserved,zoneOccupancy:{...e.simulation.zoneOccupancy},zoneReserved:{...e.simulation.zoneReserved},serviceStatus:e.simulation.serviceStatus,serviceCarry:e.simulation.serviceCarry,shuttleBreak:e.simulation.shuttleBreak,gateStatus:e.simulation.gateStatus,routingIssues:e.simulation.routingIssues,aDepartureControl:e.simulation.aDepartureControl?{...e.simulation.aDepartureControl,waiting:{...e.simulation.aDepartureControl.waiting},totalPassed:{...e.simulation.aDepartureControl.totalPassed}}:null,feederOfficer:e.simulation.feederOfficer?{...e.simulation.feederOfficer}:null,corporateExitJunction:e.simulation.corporateExitJunction?{...e.simulation.corporateExitJunction}:null,northernRadio:e.simulation.northernRadio?structuredClone(e.simulation.northernRadio):null,blackPermitControl:e.simulation.blackPermitControl?{...e.simulation.blackPermitControl}:null,equityClayStop:e.simulation.equityClayStop?{...e.simulation.equityClayStop}:null,priorityWaiting:{...e.simulation.priorityWaiting},shuttleDispatch:e.simulation.shuttleDispatchMode,shuttleDemand:e.simulation.shuttleDemand?structuredClone(e.simulation.shuttleDemand):null,shuttles:(e.simulation.shuttles??[]).map(bus=>{const moving=e.simulation.cars.find(c=>c.id===bus.id);return {...bus,dwellRemaining:moving?0:Math.max(0,bus.readyAt-e.simulation.clock),trafficWaiting:moving?.trafficWaiting??false,yieldReason:moving?.yieldReason??null};})});
          lastReport=time;
        }
      }
      renderer.render(scene,camera);
    };
    frame=requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); stopRouteRuntime();
      renderer.domElement.removeEventListener('pointerdown',pointerDown); renderer.domElement.removeEventListener('pointerup',pointerUp);
      engine.current?.playback?.cancel();
      release(scene); texture.dispose(); renderer.dispose(); renderer.domElement.remove(); engine.current=null;
    };
  }, []);

  useEffect(() => {
    const e=engine.current; if(!e) return;
    release(e.objects);
    layout.items.filter(item=>!world||!item.id.startsWith('staff-')).forEach(item => e.objects.add(drawItem(item,item.id===selectedId,world)));
    if(world) e.objects.add(createPresentationPavement()); // M4: S5 patches visible without Routes; display only.
    if(world) e.objects.add(createPresentationLots()); // Approved even-odd coverage, never simulation pavement.
    e.renderer.shadowMap.needsUpdate=true;
  },[layout,selectedId,world]);

  useEffect(()=>{
    const e=engine.current; if(!e) return;
    e.playback?.cancel();
    const origin=structuredClone(trafficOptions);
    const factory=()=>trafficMode==='demo'?createTenCarDemo(structuredClone(origin)):createCampusTraffic(structuredClone(origin));
    e.playback=createSeekablePlayback(factory,latest.current.replayInputs,{captureFrame:captureTrafficFrame});
    release(e.traffic); e.carMeshes.clear(); e.simulation=e.playback.simulation;
    latest.current.onPlaybackState?.({clock:0,seeking:false,target:0,completed:0,error:''});
    // Counts are refreshed from the new simulation on the next animation frame;
    // keep the existing section-marker resources alive across service resets.
  },[trafficReset,trafficMode]);

  useEffect(()=>{
    const e=engine.current;
    if(!e?.playback || !e.playback.setInputs(replayInputs))return;
    e.simulation=e.playback.simulation;
    release(e.traffic);e.carMeshes.clear();
    latest.current.onPlaybackState?.({clock:0,seeking:false,target:0,completed:0,error:''});
    latest.current.onReplayInvalidated?.();
  },[inputKey]);

  useEffect(()=>{engine.current?.playback?.cancel();},[running,playbackSpeed]);

  useEffect(()=>{
    const e=engine.current;
    if(!e?.playback || !seekRequest || consumedSeek.current===seekRequest)return;
    consumedSeek.current=seekRequest;
    let active=true;
    const controller=e.playback;
    controller.seek(seekRequest.seconds,progress=>{
      if(active)latest.current.onPlaybackState?.({...progress,error:''});
    }).then(applied=>{
      if(!active||!applied||engine.current!==e||e.playback!==controller)return;
      e.simulation=controller.simulation;
      release(e.traffic);e.carMeshes.clear();
      latest.current.onPlaybackState?.({clock:controller.clock,seeking:false,error:''});
    }).catch(error=>{
      if(active)latest.current.onPlaybackState?.({seeking:false,error:error.message});
    });
    return ()=>{active=false;controller.cancel();};
  },[seekRequest,trafficReset,trafficMode,inputKey]);

  useEffect(() => {
    const e=engine.current; if(!e) return;
    e.source.visible=reference || traced; e.context.visible=!reference && !traced;
    e.traces.visible=traced;
    e.objects.visible=!traced && !(world && reference);
    e.base.visible=world;
    e.renderer.setClearColor(world?'#b8c7bb':'#143d35');
    e.traffic.visible=true;
    e.controls.enableRotate=world && view!=='top';
    e.controls.minPolarAngle=view==='top'?0:.15;
    e.controls.mouseButtons.LEFT=world && view!=='top'?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN;
    e.controls.touches.ONE=world && view!=='top'?THREE.TOUCH.ROTATE:THREE.TOUCH.PAN;
    e.renderer.shadowMap.needsUpdate=true;
  },[reference,traced,world,view]);
  useEffect(()=>{
    const e=engine.current;if(!e)return;
    for(const root of [e.objects,e.staffing,e.shuttleStops,e.parkedMarkers])root.traverse(o=>{
      if(o.userData.isLabel)o.visible=showLabels;
    });
    e.occupancyFills.visible=showOccupancy;
    e.parkedMarkers.visible=showOccupancy;
  },[showLabels,showOccupancy,world,layout,selectedId]);
  useEffect(() => {
    const e=engine.current; if(!e) return;
    const focus=layout.items.find(i=>i.id===`lot-${cameraFocus}`);
    const x=focus?.x??WORLD.width/2,z=focus?.z??WORLD.height/2;
    e.controls.target.set(x,0,z);
    if(view==='top') { e.camera.position.set(x,130,z+.01); e.camera.up.set(0,0,-1); }
    else { e.camera.up.set(0,1,0); e.camera.position.set(x+16,92,z+88); }
    e.camera.lookAt(e.controls.target); e.controls.update();
  },[view,cameraFocus,cameraReset]);
  useEffect(() => {
    const e=engine.current;
    if(!e||!showRoutes||e.routeOverlay.userData.anchorsBuilt)return;
    // Path joins can require A*. Build comparison overlays only when requested,
    // once per scene, not during initial service startup or every animation frame.
    for(const route of VEHICLE_ROUTE_CATALOG.routes) {
      if(route.shapeType!=='linestrip')continue;
      const anchored=roadAnchoredRoute(route.id);
      if(anchored.applied)line(e.routeOverlay,anchored.points.map(traceWorldPoint),'#57e0ed',.65);
    }
    e.routeOverlay.userData.anchorsBuilt=true;
  },[showRoutes]);
  useEffect(() => { const e=engine.current; if(e) { e.camera.zoom=zoom; e.camera.updateProjectionMatrix(); } },[zoom]);
  useEffect(() => {
    const e=engine.current; if(!e) return;
    e.routeOverlay.visible=showRoutes;
    e.renderer.domElement.dataset.routeOverlay=String(showRoutes);
    e.renderer.domElement.dataset.routeCatalog=JSON.stringify(catalogSummary());
    let exitLines=0; e.routeOverlay.traverse(o=>{ if(o.isLine&&o.userData.exitTraceId) exitLines++; });
    e.renderer.domElement.dataset.exitTraceLive=JSON.stringify({routes:showRoutes,groupVisible:e.routeOverlay.visible,lines:exitLines});
  },[showRoutes]);
  const swatch=(color,text,dashed=false)=><li key={text}><span className={`swatch${dashed?' dashed':''}`} style={{borderColor:color,background:dashed?'transparent':color}}/>{text}</li>;
  return <div className={`scene ${tool!=='select'?'placing':''}`} ref={mount}>{error && <div className="webgl-error" role="alert">{error}</div>}
    {showRoutes&&<aside className="layout-legend" aria-label="Layout overlay legend" data-layout-legend>
      <strong>Layout overlay</strong>
      <small>{LAYOUT_VIEW.file} · {LAYOUT_VIEW.features.length} features · {LAYOUT_VIEW.ok?'check OK':`${LAYOUT_VIEW.problems.length} problem${LAYOUT_VIEW.problems.length===1?'':'s'}`}</small>
      <ul>
        {swatch(CONFIDENCE_COLORS.confirmed,'confirmed')}
        {swatch(CONFIDENCE_COLORS.estimated,'estimated')}
        {swatch(CONFIDENCE_COLORS.unknown,'unknown')}
        {swatch(PROBLEM_COLOR,'problem (npm run layout:check)')}
        {swatch('#4d5a55','dashed = rule area, not a road',true)}
      </ul>
      <strong>Drawn exit traces</strong>
      <small>{EXIT_TRACE_VIEW.file} · {EXIT_TRACE_VIEW.total} drawn · A{EXIT_TRACE_VIEW.counts.a} B{EXIT_TRACE_VIEW.counts.b} C{EXIT_TRACE_VIEW.counts.c} · {EXIT_TRACE_VIEW.activated.length} in traffic use</small>
      <ul>{swatch(EXIT_TRACE_COLOR,'drawn exit geometry; traffic use listed above')}</ul>
      <small>runtime = changes traffic · advisory = drawn only. Chevrons = travel direction. Route lines keep their colours.</small>
    </aside>}
  </div>;
}
