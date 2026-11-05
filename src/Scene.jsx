import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD } from './model.js';
import { createCampusTraffic, createTenCarDemo } from './traffic.js';
import { advancePlayback } from './playback.js';
import { SHUTTLE_STOPS } from './shuttleRoutes.js';
import { PARKING_ZONES } from './parkingZones.js';
import { ZONE_STAGING } from './parkingRoutes.js';
import { makeOccupancyFillPieces } from './occupancyFill.js';
import { C_ZONE_PIECES } from './cParkingGeometry.js';
import { VECTOR_ROUTES } from './vectorRoutes.js';
import { A_DEPARTURE_MERGE } from './lotAControl.js';
import referenceUrl from '../images/HopeCityLayout.png';
import { tracedFeatures, traceWorldPoint } from './tracedMap.js';

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

function drawItem(item, selected) {
  const group = new THREE.Group();
  group.position.set(item.x, 0, item.z); group.rotation.y = -item.rotation * Math.PI / 180;
  group.userData.id = item.id;
  const { width: w, depth: d } = item;
  if (item.type === 'lot') {
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
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color:item.color, roughness:1, side:THREE.DoubleSide}));
    mesh.position.y = item.elevation;
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
    const shape = new THREE.Shape(item.points.map(([x,z]) => new THREE.Vector2(x,-z)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false });
    geometry.rotateX(-Math.PI/2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#a3b4ac', roughness: .9 }));
    mesh.position.y = .2; group.add(mesh);
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
    group.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:item.access?'#67777a':'#46585e',side:THREE.DoubleSide})));
    // Edge lines describe pavement, not permitted travel directions.
    [-1,1].forEach(side => line(group,samples.map((p,index) => {
      const t=samples[Math.min(index+1,samples.length-1)].clone().sub(samples[Math.max(0,index-1)]).normalize();
      return [p.x-t.z*(item.roadWidth??2.2)/2*side,p.z+t.x*(item.roadWidth??2.2)/2*side];
    }), '#a2aaa1', (item.elevation ?? .07)+.02));
    if(item.id.startsWith('shuttle-') && item.id.endsWith('-loop')) label(group,item.name,0,1.2,0,'#ffe3a1',13);
  } else if (item.type === 'road') {
    box(group, w, 0.07, d, '#52676a', 0, 0.05);
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

export default function Scene({ layout, selectedId, tool, reference, traced = false, running, playbackSpeed = 1, trafficRates, trafficReset, trafficMode, trafficOptions, onTrafficStats, view, zoom, onPick, onPlace }) {
  const mount = useRef(null), engine = useRef(null), latest = useRef({});
  const [error, setError] = useState('');
  latest.current = { tool, onPick, onPlace, running, playbackSpeed, trafficRates, onTrafficStats, layout, phase:trafficOptions?.phase??'arrival', shuttles:trafficOptions?.shuttles, zonePreferences:trafficOptions?.zonePreferences, departurePolicy:trafficOptions?.departurePolicy };

  useEffect(() => {
    const host = mount.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setError('3D rendering is unavailable in this browser. Enable WebGL or use a recent Safari/Chrome browser. Your layout controls and JSON exports still work.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#143d35'); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled=true;
    renderer.domElement.setAttribute('aria-label', 'Interactive church site. Select an object, or choose a tool and tap the map to place it.');
    renderer.domElement.setAttribute('role', 'img');
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#386755', 2.6));
    const sun = new THREE.DirectionalLight('#fff4d8', 2); sun.position.set(-40, 90, 30); scene.add(sun);
    const camera = new THREE.OrthographicCamera(-60, 60, 50, -50, 0.1, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; controls.enableDamping = true;
    controls.minZoom = 0.6; controls.maxZoom = 5;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.PAN; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, WORLD.height), new THREE.MeshStandardMaterial({ color: '#205346' }));
    ground.rotation.x = -Math.PI/2; ground.position.set(WORLD.width/2, -0.08, WORLD.height/2); scene.add(ground);
    const texture = new THREE.TextureLoader().load(referenceUrl, () => { texture.colorSpace = THREE.SRGBColorSpace; }, undefined, () => setError('The reference image could not load. The schematic editor is still available.'));
    const source = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, WORLD.height), new THREE.MeshBasicMaterial({ map: texture }));
    source.rotation.x = -Math.PI/2; source.position.set(WORLD.width/2, 0.01, WORLD.height/2); source.visible = false; scene.add(source);
    const context = new THREE.Group(); scene.add(context);
    const traces = new THREE.Group(); scene.add(traces);
    const traceColors = { building: '#ffda76', road: '#60d5e7', roundabout: '#ffa55b', pickup: '#ff86bd', 'parking-area': '#c4f174' };
    tracedFeatures.forEach(feature => {
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
        line(traces, [...points, points[0]], color, .52);
      }
      const center = feature.shapeType === 'circle' || feature.shapeType === 'point' ? points[0] :
        [points.reduce((v,p) => v + p[0], 0) / points.length, points.reduce((v,p) => v + p[1], 0) / points.length];
      label(traces, `${feature.id} · ${feature.label}`, center[0], .95, center[1], color, 11);
    });

    const objects = new THREE.Group(), traffic = new THREE.Group(), parkedMarkers = new THREE.Group(), staffing = new THREE.Group(), shuttleStops = new THREE.Group(), occupancyFills=new THREE.Group();
    scene.add(objects, traffic, parkedMarkers, staffing, shuttleStops, occupancyFills);
    // One persistent grouped marker per section. Departures change counts,
    // not geometry/material/texture ownership for every parking section.
    const parkedByZone=new Map();
    for(const zone of PARKING_ZONES) {
      const [x,z]=traceWorldPoint(ZONE_STAGING[zone.id]);
      const marker=new THREE.Group();marker.position.set(x,.6,z);marker.visible=false;
      box(marker,.65,.35,1.35,'#e3c673');
      box(marker,.52,.22,.62,'#e2ece8',0,.26,-.1);
      const caption=label(marker,`${zone.id} · 0 parked*`,0,2,0,'#ffda76',12);
      parkedMarkers.add(marker);parkedByZone.set(zone.id,{marker,caption,count:0});
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
    for(const [id,name,pixel] of [
      ['a-batch','LOT A MAIN POSITION · 5 CAR BATCHES',A_DEPARTURE_MERGE],
      ['c-entrance','C · ENTRANCE CONTROL',VECTOR_ROUTES.arrival.cWest.at(-1)],
      ['b-exit','B · EXIT CONTROL',VECTOR_ROUTES.departure.bWest[0]],
      ['b-north-exit','B · NORTH EXIT CONTROL',VECTOR_ROUTES.departure.bNorth[0]],
      ['c-exit-1','C · EXIT 1 CONTROL',VECTOR_ROUTES.departure.cWest[0]],
      ['c-exit-2','C · EXIT 2 CONTROL',VECTOR_ROUTES.departure.cEast[0]],
    ]) {
      const [x,z]=traceWorldPoint(pixel);
      staffing.add(drawItem({id:`${id}-volunteer`,type:'position',x:x-1.5,z,width:1,depth:1,rotation:0,role:name}));
      label(staffing,name,x,4,z-3,'#ffe08a',17);
    }
    engine.current={renderer,scene,camera,controls,objects,traffic,parkedMarkers,parkedByZone,staffing,source,context,traces,simulation,carMeshes:new Map(),zoneFills};
    let frame, previousTime, lastReport=0;
    const animate = time => {
      frame=requestAnimationFrame(animate); controls.update();
      const dt=previousTime===undefined?0:(time-previousTime)/1000; previousTime=time;
      const e=engine.current;
      if(e) {e.simulation.setPhase(latest.current.phase);e.simulation.setShuttleConfig?.(latest.current.shuttles??{});e.simulation.setZonePreferences?.(latest.current.zonePreferences??{});e.simulation.setDeparturePolicy?.(latest.current.departurePolicy??{});}
      if(e && latest.current.running) advancePlayback(e.simulation,dt,latest.current.playbackSpeed,latest.current.trafficRates ?? [18,18,0],latest.current.layout.items.filter(i=>i.type==='lot'));
      if(e) {
        for(const fill of e.zoneFills) {
          const occupied=e.simulation.zoneOccupancy[fill.zone.id]??0;
          if(fill.occupied!==occupied){fill.mesh.visible=occupied>0;fill.plane.constant=fill.cutoff(occupied/fill.zone.capacity);fill.occupied=occupied;}
        }
        for(const [zone,entry] of e.parkedByZone) {
          const count=e.simulation.zoneOccupancy[zone]??0;
          if(entry.count===count)continue;
          entry.marker.visible=count>0;entry.caption.userData.setText(`${zone} · ${count} parked*`);entry.count=count;
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
            mesh=new THREE.Group();
            if(car.fleetBus) {
              box(mesh,.88,.7,2.9,'#c985e5');box(mesh,.74,.25,2.4,'#f8efff',0,.47,0);
              box(mesh,.7,.25,.12,'#344859',0,.27,1.46);
              label(mesh,`BUS ${car.busNumber}`,0,2,0,'#ffffff',7);
            } else {
              box(mesh,.65,.35,1.35,car.badge?'#ffda76':car.source===0?'#70d5bd':'#60d5e7');
              box(mesh,.52,.22,.62,'#e2ece8',0,.26,-.1);
              box(mesh,.5,.1,.1,'#ffffff',0,.05,.64);
            }
            e.traffic.add(mesh); e.carMeshes.set(car.id,mesh);
          }
          if(car.stationary){const [x,z]=traceWorldPoint(car.stationary);mesh.position.set(x,.6,z);continue;}
          const lane=e.simulation.lanes[car.lane], t=Math.min(1,car.distance/lane.length);
          const pos=lane.path.getPointAt(t), tangent=lane.path.getTangentAt(t);
          mesh.position.copy(pos); mesh.rotation.y=Math.atan2(tangent.x,tangent.z);
        }
        if(time-lastReport>500) {
          latest.current.onTrafficStats?.({active:e.simulation.cars.filter(c=>!c.fleetBus).length,entered:[...e.simulation.entered],exited:[...e.simulation.exited],waiting:[...e.simulation.waiting],occupancy:{...e.simulation.occupancy},reserved:{...e.simulation.reserved},assignments:{...e.simulation.assignments},parked:{...e.simulation.parked},overflow:e.simulation.overflow,sentAway:e.simulation.sentAway,atCapacity:e.simulation.atCapacity,departed:{...e.simulation.departed},departing:e.simulation.cars.filter(car=>car.phase==='departing').length,badgeParking:e.simulation.badgeParking,badgeReserved:e.simulation.badgeReserved,zoneOccupancy:{...e.simulation.zoneOccupancy},zoneReserved:{...e.simulation.zoneReserved},serviceStatus:e.simulation.serviceStatus,shuttleBreak:e.simulation.shuttleBreak,gateStatus:e.simulation.gateStatus,routingIssues:e.simulation.routingIssues,aDepartureControl:e.simulation.aDepartureControl?{...e.simulation.aDepartureControl,waiting:{...e.simulation.aDepartureControl.waiting},totalPassed:{...e.simulation.aDepartureControl.totalPassed}}:null,priorityWaiting:{...e.simulation.priorityWaiting},shuttleDispatch:e.simulation.shuttleDispatchMode,shuttles:(e.simulation.shuttles??[]).map(bus=>{const moving=e.simulation.cars.find(c=>c.id===bus.id);return {...bus,dwellRemaining:moving?0:Math.max(0,bus.readyAt-e.simulation.clock),trafficWaiting:moving?.trafficWaiting??false,yieldReason:moving?.yieldReason??null};})});
          lastReport=time;
        }
      }
      renderer.render(scene,camera);
    };
    frame=requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',pointerDown); renderer.domElement.removeEventListener('pointerup',pointerUp);
      release(scene); texture.dispose(); renderer.dispose(); renderer.domElement.remove(); engine.current=null;
    };
  }, []);

  useEffect(() => {
    const e=engine.current; if(!e) return;
    release(e.objects);
    layout.items.forEach(item => e.objects.add(drawItem(item,item.id===selectedId)));
  },[layout,selectedId]);

  useEffect(()=>{
    const e=engine.current; if(!e) return;
    release(e.traffic); e.carMeshes.clear(); e.simulation=trafficMode==='demo'?createTenCarDemo(trafficOptions):createCampusTraffic(trafficOptions);
    // Counts are refreshed from the new simulation on the next animation frame;
    // keep the existing section-marker resources alive across service resets.
  },[trafficReset,trafficMode]);

  useEffect(() => {
    const e=engine.current; if(!e) return;
    e.source.visible=reference || traced; e.context.visible=!reference && !traced;
    e.traces.visible=traced;
    e.objects.visible=!traced;
    e.traffic.visible=true;
  },[reference,traced]);
  useEffect(() => {
    const e=engine.current; if(!e) return;
    e.controls.target.set(56.8,0,45.9);
    if(view==='top') { e.camera.position.set(56.8,130,45.91); e.camera.up.set(0,0,-1); }
    else { e.camera.up.set(0,1,0); e.camera.position.set(66.8,120,130); }
    e.camera.lookAt(e.controls.target); e.controls.update();
  },[view]);
  useEffect(() => { const e=engine.current; if(e) { e.camera.zoom=zoom; e.camera.updateProjectionMatrix(); } },[zoom]);
  return <div className={`scene ${tool!=='select'?'placing':''}`} ref={mount}>{error && <div className="webgl-error" role="alert">{error}</div>}</div>;
}
