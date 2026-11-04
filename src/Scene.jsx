import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD, previewRoutes } from './model.js';
import referenceUrl from '../Screenshot 2026-11-03 at 4.46.22 PM.png';

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
  ctx.fillText(text.slice(0, 40), 384, 48, 740);
  const map = new THREE.CanvasTexture(canvas); map.userData.generated = true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false }));
  sprite.position.set(x, y, z); sprite.scale.set(size, size / 8, 1); sprite.renderOrder = 10;
  parent.add(sprite);
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
    box(group, w, 0.14, d, item.open ? item.color : '#67736e', 0, 0.11, 0, 0.24);
    line(group, [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[-w/2,-d/2]], item.open ? item.color : '#87928e');
    label(group, `${item.name}  /  ${item.open ? item.capacity + ' spaces*' : 'CLOSED'}`, 0, 1, -d/2 - 2, item.color, 22);
  } else if (item.type === 'building') {
    box(group, w, 2.4, d, '#708d8c', 0, 1.3);
    box(group, w + 0.4, 0.25, d + 0.4, '#a3b4ac', 0, 2.6);
    label(group, item.name, 0, 4, 0, '#f8f5df', 14);
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

export default function Scene({ layout, selectedId, tool, reference, running, view, zoom, onPick, onPlace }) {
  const mount = useRef(null), engine = useRef(null), latest = useRef({});
  const [error, setError] = useState('');
  latest.current = { tool, onPick, onPlace, running };

  useEffect(() => {
    const host = mount.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setError('3D rendering is unavailable in this browser. Enable WebGL or use a recent Safari/Chrome browser. Your layout controls and JSON exports still work.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#143d35'); renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    // Context road follows the curved western drive visible in the source, not an approved traffic route.
    const curve = new THREE.CatmullRomCurve3([[3,47],[24,47],[36,41],[42,33],[42,20],[47,11],[57,7],[72,7]].map(([x,z]) => new THREE.Vector3(x,0.04,z)));
    context.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 70, 1.25, 5, false), new THREE.MeshStandardMaterial({ color: '#52676a' })));
    [[30,57,22,11],[23,71,24,8],[49,74,9,18],[82,76,24,12],[98,66,16,16]].forEach(([x,z,w,d]) => box(context,w,0.7,d,'#365d54',x,0.35,z));
    const objects = new THREE.Group(), traffic = new THREE.Group(); scene.add(objects, traffic);
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
    engine.current={renderer,scene,camera,controls,objects,traffic,source,context,cars:[]};
    let frame;
    const animate = time => {
      frame=requestAnimationFrame(animate); controls.update();
      if(latest.current.running) for(const car of engine.current?.cars ?? []) {
        const t=((time/1000)*0.026+car.phase)%1;
        const pos=car.path.getPointAt(t), ahead=car.path.getPointAt(Math.min(1,t+0.001));
        car.mesh.position.copy(pos); car.mesh.rotation.y=Math.atan2(ahead.x-pos.x,ahead.z-pos.z);
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
    release(e.traffic); e.cars=[];
    previewRoutes(layout).forEach((route,index) => {
      const path = new THREE.CatmullRomCurve3(route.points.map(([x,z]) => new THREE.Vector3(x,0.75,z)),false,'centripetal');
      if(running) line(e.traffic,path.getPoints(100).map(p=>[p.x,p.z]),route.color,0.45);
      for(let n=0;n<3;n++) {
        const mesh=new THREE.Group(); box(mesh,1.3,0.7,2.6,route.color,0,0); box(mesh,1.05,0.4,1.2,'#d9e6e0',0,0.5);
        mesh.visible=running; e.traffic.add(mesh); e.cars.push({mesh,path,phase:n/3+index*0.1});
      }
    });
  },[layout,selectedId,running]);

  useEffect(() => {
    const e=engine.current; if(!e) return;
    e.source.visible=reference; e.context.visible=!reference;
  },[reference]);
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
