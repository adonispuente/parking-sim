import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from './Scene.jsx';
import { openParkingCapacity } from './parkingAvailability.js';
import SundayControls from './SundayControls.jsx';
import { serviceOptions } from './sundayServices.js';
import { SHUTTLE_CAR_EQUIVALENT, TRAFFIC_PRIORITY_ORDER } from './trafficPriority.js';
import { initialLayout, makeItem, validateLayout, deleteItem, stats, STORAGE_KEY, ROLES, WORLD, upgradeLotAParking } from './model.js';
import './styles.css';
import { upgradeLotADraft } from './lotA.js';
import { upgradeEastCampus, upgradeShuttleAccess } from './eastCampus.js';

import { tracedFeatures, tracedLayout } from './tracedMap.js';

const TOOLS = [
  ['select','↖','Select'], ['lot','▱','Lot'], ['spaces','▥','Spaces'],
  ['barricade','▰','Barricade'], ['position','♙','Position'], ['road','═','Road'], ['building','▦','Building'],
];

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored) {
      const parsed = validateLayout(JSON.parse(stored));
      if (!parsed.lotAParkingRevision) localStorage.setItem(`${STORAGE_KEY}-before-lot-a-parking`, stored);
      if(parsed.tracedMapRevision!==3) localStorage.setItem(`${STORAGE_KEY}-before-c-first-half`,stored);
      return { layout:parsed.tracedMapRevision===3?parsed:tracedLayout(parsed), message:'Using HopeCityLayoutC Updated with the traced C first half; previous layout backed up on this device.' };
    }
  } catch { return { layout:initialLayout(), message:'Saved layout could not be read. Loaded the starter layout; import a backup if you have one.' }; }
  return { layout:tracedLayout(initialLayout()), message:'Loaded HopeCityLayoutC Updated with C first-half flow.' };
}

function App() {
  const [boot] = useState(load);
  const [layout,setLayout]=useState(boot.layout), [selectedId,setSelectedId]=useState(null);
  const [tool,setTool]=useState('select'), [reference,setReference]=useState(false), [running,setRunning]=useState(false);
  const [traced,setTraced]=useState(true);
  const [trafficRates,setTrafficRates]=useState([18,18,0]), [trafficReset,setTrafficReset]=useState(0);
  const [trafficMode,setTrafficMode]=useState('continuous');
  const [playbackSpeed,setPlaybackSpeed]=useState(1);
  const [trafficOptions,setTrafficOptions]=useState({initialOccupancy:{a:0,b:0,c:0},badgePercent:0,phase:'arrival',service:{enabled:true,...serviceOptions('nine')},zonePreferences:{a:'auto',b:'auto',c:'auto'},shuttles:{enabled:true,activeCount:3,bFullPercent:100,randomDwell:true,dwellSeconds:45,cDirection:'auto',bStop:'circuit'}});
  const [trafficStats,setTrafficStats]=useState({active:0,entered:[0,0],exited:[0,0],waiting:[0,0]});
  const [view,setView]=useState('top'), [zoom,setZoom]=useState(1), [tab,setTab]=useState('lots');
  const [message,setMessage]=useState(boot.message), [saved,setSaved]=useState('Saving…');
  const [history,setHistory]=useState([]), [confirmation,setConfirmation]=useState(null);
  const inputRef=useRef(null), messageTimer=useRef(null);
  const selected=layout.items.find(i=>i.id===selectedId), totals=stats(layout);
  const lots=layout.items.filter(i=>i.type==='lot');
  const positions=layout.items.filter(i=>i.type==='position');
  const openCapacity=openParkingCapacity(lots,trafficStats.occupancy??trafficOptions.initialOccupancy,trafficStats.reserved,trafficStats);

  useEffect(()=>{
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(layout)); setSaved('Saved on this device'); }
    catch { setSaved('Not saved · export a backup'); }
  },[layout]);
  useEffect(()=>()=>clearTimeout(messageTimer.current),[]);

  function notify(text) {
    setMessage(text); clearTimeout(messageTimer.current);
    messageTimer.current=setTimeout(()=>setMessage(''),6000);
  }
  function commit(next) {
    setHistory(h=>[...h.slice(-29),layout]); setLayout(next);
  }
  function update(id,patch) {
    commit({...layout,items:layout.items.map(i=>i.id===id?{...i,...patch}:i)});
  }
  function place(x,z) {
    if(tool==='move' && selected) { update(selected.id,{x:+x.toFixed(1),z:+z.toFixed(1)}); setTool('select'); notify('Object moved.'); return; }
    if(tool==='select' || tool==='move') return;
    if(layout.items.length>=400) { notify('Layout limit reached (400 objects).'); return; }
    const object=makeItem(tool,+x.toFixed(1),+z.toFixed(1),selected?.type==='lot'?selected.id:(lots[0]?.id??''));
    commit({...layout,items:[...layout.items,object]}); setSelectedId(object.id); setTool('select');
    notify(`${object.type==='spaces'?'Parking row':'Object'} placed. Adjust it in the inspector.`);
  }
  function choose(id) { setSelectedId(id); setTool('select'); }
  function undo() {
    if(!history.length) return;
    setLayout(history.at(-1)); setHistory(history.slice(0,-1)); setTool('select'); notify('Last edit undone.');
  }
  function exportLayout() {
    const blob=new Blob([JSON.stringify(layout,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), anchor=document.createElement('a');
    anchor.href=url; anchor.download='church-parking-layout.json'; anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000); notify('Layout exported. Keep the JSON as your backup.');
  }
  async function importLayout(event) {
    const file=event.target.files?.[0]; if(!file) return;
    try {
      if(file.size>1_000_000) throw new Error('That file is too large. Layouts must be under 1 MB.');
      const next=validateLayout(JSON.parse(await file.text()));
      setConfirmation({title:'Replace this layout?',description:`Import “${next.name}” (${next.items.length} objects). Your current layout can be restored with Undo.`,action:()=>{commit(next); setSelectedId(null); setRunning(false); notify('Layout imported and saved on this device.');}});
    } catch(error) { notify(error instanceof SyntaxError?'That is not valid JSON. Your current layout has not changed.':error.message); }
    event.target.value='';
  }
  function remove() {
    if(!selected) return;
    commit(deleteItem(layout,selected.id)); setSelectedId(null); setTool('select');
  }
  const list = tab==='lots'?lots:tab==='team'?positions:layout.items;

  return <div className="app">
    <header className="header">
      <a className="brand" href="./" aria-label="Parking Flow home"><span className="brand-icon">P<span>↗</span></span><span>parking<span className="brand-light">flow</span><small>THE LAYOUT WORKSHOP</small></span></a>
      <div className="project-heading"><span className="eyebrow">YOUR CAMPUS</span><strong>{layout.name}</strong></div>
      <blockquote className="header-verse"><cite>Colossians 3:23</cite><p>"Whatever you do, work at it with all your heart, as working for the Lord, not for human masters."</p></blockquote>
      <div className="header-actions"><span className={`save-state ${saved.startsWith('Not')?'unsaved':''}`}><i/>{saved}</span><button className="button subtle" onClick={()=>inputRef.current.click()}>Import</button><button className="button dark" onClick={exportLayout}>Export layout <span>↗</span></button></div>
      <input ref={inputRef} hidden type="file" accept=".json,application/json" aria-label="Import layout JSON" onChange={importLayout}/>
    </header>

    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-intro"><span className="eyebrow">01 / BUILD THE FOUNDATION</span><h1>A place for<br/>every arrival.</h1><p>Map your campus. Place your team.<br/>Make the Sunday flow make sense.</p></div>
        <div className="stat-row"><div><strong>{totals.lots.toString().padStart(2,'0')}</strong><span>parking lots</span></div><div><strong aria-label="Open parking capacity">{openCapacity}</strong><span>open capacity*</span></div><div><strong>{totals.positions.toString().padStart(2,'0')}</strong><span>positions</span></div></div>
        <div className="sidebar-tabs" role="tablist" aria-label="Campus objects">{[['lots','Lots'],['team','Team'],['objects','All objects']].map(([id,name])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{name}{id==='lots'&&<span>{lots.length}</span>}</button>)}</div>
        <div className="object-list" role="tabpanel" aria-label={`${tab} objects`}>
          {list.length===0&&<p className="empty">Nothing here yet. Choose a tool and tap the map.</p>}
          {list.map((item,index)=><div key={item.id} className={`object-card ${selectedId===item.id?'active':''}`}>
            <button className="object-select" onClick={()=>choose(item.id)}><span className={`object-symbol ${item.type==='lot'?'lot-symbol':''}`} style={item.color?{background:item.color}:undefined}>{item.type==='lot'?String.fromCharCode(65+index):item.type==='position'?'♙':(TOOLS.find(t=>t[0]===item.type)?.[1]??'·')}</span><span><strong>{item.name}</strong><small>{item.type==='lot'?`${item.capacity} capacity* · ${layout.items.filter(i=>i.type==='spaces'&&i.lotId===item.id).reduce((n,i)=>n+i.count,0)} drawn`:item.type==='position'?`${item.role} · ${item.assignee||'Unassigned'}`:item.type==='spaces'?`${item.count} drawn spaces`:item.type}</small></span></button>
            {item.type==='lot'&&<button className={`status ${item.open?'open':'closed'}`} aria-label={`${item.open?'Close':'Open'} ${item.name}`} onClick={()=>update(item.id,{open:!item.open})}><i/>{item.open?'Open':'Closed'}</button>}
          </div>)}
        </div>
        <div className="sidebar-foot"><span className="tiny-label">LABELME · UPDATED TRACE</span><p>{tracedFeatures.length} source-pixel annotations: roof outlines, parking regions, Corporate Drive, roundabouts and shuttle pickup points.<br/><strong>These regions are not counted parking stalls. Capacities remain A 411 · B 487 · C 686 (1,584 total).</strong></p><button className="text-button" onClick={()=>setTraced(!traced)}>{traced?'View editable draft':'View updated trace'} <span>↗</span></button><button className="text-button" onClick={()=>setReference(!reference)}>{reference?'Hide source image':'Compare with source image'} <span>↗</span></button><button className="text-button" onClick={()=>setConfirmation({title:'Apply updated LabelMe map?',description:'Replaces the old generated map geometry with the updated source trace. Existing custom objects and lot operating settings remain. Export a backup first; Undo can restore this draft.',action:()=>{commit(tracedLayout(layout));setTraced(false);setSelectedId(null);setRunning(false);notify('Updated LabelMe geometry applied. Undo restores the previous draft.');}})}>Apply updated trace to editable map</button></div>
      </aside>

      <main className="map-area">

        <div className="map-topline"><div><span className="map-dot"/><strong>Campus canvas</strong><span className="map-top-tag">{traced?'LABELME TRACE':'EDITABLE DRAFT'}</span></div><button className="map-button reference-button" aria-pressed={traced} onClick={()=>setTraced(!traced)}>▧ <span>{traced?'Editable draft':'Updated trace'}</span></button></div>
        <Scene layout={layout} selectedId={selectedId} tool={traced?'select':tool} reference={reference} traced={traced} running={running} playbackSpeed={playbackSpeed} trafficRates={trafficRates} trafficReset={trafficReset} trafficMode={trafficMode} trafficOptions={trafficOptions} onTrafficStats={setTrafficStats} view={view} zoom={zoom} onPick={setSelectedId} onPlace={place}/>
        <div className="north"><span>Ｎ</span><div>↑</div></div>
        <div className="view-controls"><div className="segmented"><button aria-pressed={view==='top'} onClick={()=>setView('top')}>Top</button><button aria-pressed={view==='3d'} onClick={()=>setView('3d')}>3D</button></div><div className="zoom-controls"><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(5,z+0.3))}>+</button><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(0.6,z-0.3))}>−</button><button aria-label="Reset camera" onClick={()=>{setZoom(1);setView(v=>v==='top'?'3d':'top');requestAnimationFrame(()=>setView('top'));}}>⌖</button></div></div>
        <div className="map-caption"><span className="caption-rule"/><span>{traced?'IMAGE-PIXEL TRACE · NOT TRAFFIC RULES':'SCHEMATIC ONLY · NOT TO SCALE'}</span></div>
        <div className="map-bottom">
          <div className="tool-hint">{tool==='select'?'Drag to pan · pinch to zoom · tap to inspect':tool==='move'?'Tap the new location for the selected object':`Tap the map to place ${tool==='spaces'?'a parking row':`a ${tool}`}`}<button disabled={!history.length} onClick={undo} aria-label="Undo last edit">↶ Undo</button></div>
          <div className="toolbar" aria-label="Layout tools">{TOOLS.map(([id,icon,name])=><button key={id} className={tool===id?'chosen':''} aria-pressed={tool===id} onClick={()=>setTool(id)}><span className="tool-icon">{icon}</span><span>{name}</span></button>)}</div>
        </div>
      </main>

      <aside className="traffic-dashboard" aria-label="Traffic control dashboard">
          <div className="traffic-controls" aria-label="Corporate Drive traffic controls">
            <strong>Campus traffic · {trafficMode==='demo'?'10-car parking demo':'capacity-based routing'}</strong>
            <div className="playback-bar">
              <label>Playback speed<select aria-label="Playback speed" value={playbackSpeed} onChange={e=>setPlaybackSpeed(Number(e.target.value))}>{[1,2,3,4,5,10,20].map(speed=><option key={speed} value={speed}>{speed}×{speed===1?' · normal':''}</option>)}</select></label>
              <button className="button dark" onClick={()=>setRunning(!running)}>{running?'Pause traffic':'Start traffic'}</button>
            </div>
            <section className="capacity-status" aria-label="Standing traffic priority">
              <strong>Right of way: {TRAFFIC_PRIORITY_ORDER.join(' → ')}</strong>
              <small>1 shuttle = at least {SHUTTLE_CAR_EQUIVALENT} cars of priority. Keep buses moving; clear occupied crossings and maintain safe following. Priority does not allow overtaking through a queue.</small>
              <small aria-live="polite">Waiting on-road: {trafficStats.priorityWaiting?.shuttle??0} buses · {trafficStats.priorityWaiting?.departure??0} departures · {trafficStats.priorityWaiting?.arrival??0} arrivals</small>
            </section>
            <SundayControls options={trafficOptions} setOptions={setTrafficOptions} stats={trafficStats} onReset={()=>{setRunning(false);setTrafficMode('continuous');setTrafficReset(v=>v+1);}} onRun={()=>setRunning(true)}/>
            <small>Cars and arrivals run at {playbackSpeed}× simulation time. Arrival rates are per simulated minute.</small>
            <div className="traffic-phase" role="group" aria-label="Traffic phase">
              {['arrival','departure','mixed'].map(phase=><button disabled={trafficOptions.service?.enabled} key={phase} aria-pressed={!trafficOptions.service?.enabled&&trafficOptions.phase===phase} onClick={()=>setTrafficOptions(o=>({...o,phase}))}>{phase==='arrival'?'Arrivals · stay parked':phase==='departure'?'Departures · release cars':'Mixed manual traffic'}</button>)}
            </div>
            <div className="traffic-rates">{['Feeder · south → north',`Equity Entrance → ${trafficOptions.service?.enabled&&trafficOptions.service.id==='final'?'B (C fallback)':'Lot C'}`,`Equity entrance/exit 2 → ${trafficOptions.service?.enabled&&trafficOptions.service.id==='final'?'B (C fallback)':'Lot C'}`].map((name,index)=><label key={name}>{name}<input disabled={trafficOptions.service?.enabled} aria-label={`${name} arrival rate`} type="range" min="0" max="90" step="6" value={trafficRates[index]} onChange={e=>setTrafficRates(r=>r.map((v,i)=>i===index?Number(e.target.value):v))}/><span>{trafficOptions.service?.enabled?'Scheduled':`${trafficRates[index]} cars/min`}</span></label>)}</div>
            <small>{trafficStats.active} on road · {trafficStats.entered.reduce((a,b)=>a+b,0)} entered · {trafficStats.exited.reduce((a,b)=>a+b,0)} reached lot · {trafficStats.waiting.reduce((a,b)=>a+b,0)} waiting off-map</small>
            <small>Feeder arrivals normally fill A → B → C, with 10% continuing along Corporate to B, then C, even while A is open. {trafficOptions.service?.enabled&&trafficOptions.service.id==='final'?'At 1:15, both Equity approaches use B’s main entrance; C is fallback only.':'Both Equity approaches enter staffed Lot C. If C is unavailable, Equity cars wait outside campus.'}</small>
            <div className={`capacity-status ${trafficStats.atCapacity?'at-capacity':''}`} role="status"><strong>{trafficStats.atCapacity?'General parking at capacity · send arrivals away':'Parking allocation active'}</strong><small>{trafficStats.sentAway??0} sent away · no overflow parking configured. Authorized badge parking is separate.</small></div>
            <small>{Object.values(trafficStats.departed??{}).reduce((a,b)=>a+b,0)} departed campus · {trafficStats.departing??0} exiting now. Service transitions release the previous service's cars at varied times across all three lots. Parking locations are section staging points, not invented individual stalls.</small>
            <section className="shuttle-panel" aria-label="Shuttle fleet controls">
              <strong>Shuttle fleet · 5 buses</strong>
              <small>Home: Lot A pickup/drop-off. 9:00: three active buses. Transitions: all five. B circuit visits South then North pickup before returning home. C circuit visits the roundabout then the directed North/South pickup.</small>
              <label>Shuttle service<select aria-label="Shuttle service" value={trafficOptions.shuttles.enabled?'on':'off'} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,enabled:e.target.value==='on'}}))}><option value="on">Running with traffic</option><option value="off">Return home and hold</option></select></label>
              <label>Switch all buses to C at B occupancy (%)<input aria-label="Shuttle B occupancy threshold" type="number" min="1" max="100" value={trafficOptions.shuttles.bFullPercent} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,bFullPercent:Math.max(1,Math.min(100,Number(e.target.value)||100))}}))}/></label>
              <label>Active buses (manual mode)<select disabled={trafficOptions.service?.enabled} aria-label="Active shuttle count" value={trafficOptions.shuttles.activeCount} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,activeCount:Number(e.target.value)}}))}>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
              <label>C roundabout volunteer direction<select aria-label="C shuttle direction" value={trafficOptions.shuttles.cDirection} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,cDirection:e.target.value}}))}><option value="auto">Where more cars are parked</option><option value="north">C North</option><option value="south">C South</option><option value="rotate">Alternate North / South</option></select></label>
              <label>Boarding time<select aria-label="Shuttle boarding variation" value={trafficOptions.shuttles.randomDwell!==false?'random':'fixed'} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,randomDwell:e.target.value==='random'}}))}><option value="random">Varied · 30–60 seconds per stop</option><option value="fixed">Fixed dwell for debugging</option></select></label>
              {trafficOptions.shuttles.randomDwell===false&&<label>Fixed stop dwell (simulation seconds)<input aria-label="Shuttle stop dwell" type="number" min="0" max="120" value={trafficOptions.shuttles.dwellSeconds} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,dwellSeconds:Math.max(0,Math.min(120,Number(e.target.value)||0))}}))}/></label>}
              <small>Buses stage independently across the first ~90 seconds. Home dispatches are at least 15 seconds apart; each pickup samples a new boarding delay. Seeded variation repeats on replay, without forcing simultaneous returns.</small>
              <strong role="status">{trafficStats.shuttleDispatch??'Service dispatch ready'}</strong>
              <div className="shuttle-roster">{(trafficStats.shuttles??[]).map(bus=><div key={bus.id}><strong>Bus {bus.number}</strong><span>{bus.dwellStop&&bus.stationary?bus.dwellStop:bus.stop??'A home'} · {bus.phase}{bus.trafficWaiting?' · safe traffic hold':''}</span><small>{bus.trips} round trips · {bus.visits} remote stops{bus.stationary&&bus.dwellRemaining>0?` · ${Math.ceil(bus.dwellRemaining)}s boarding / staging`:''}{bus.yieldReason?` · ${bus.yieldReason.replaceAll('-',' ')}`:''}</small></div>)}</div>
              <small>Dispatch updates at home, never mid-trip. Two-way Corporate lanes share queues by travel direction. Internal aisles remain estimates; passenger boarding, swept turns and passenger counts are not modeled.</small>
            </section>
            <div className="traffic-rates">{['a','b','c'].map(id=><label key={id}>Lot {id.toUpperCase()} initial parked<input type="number" min="0" max={{a:411,b:487,c:686}[id]} value={trafficOptions.initialOccupancy[id]} onChange={e=>{const value=Math.max(0,Math.min({a:411,b:487,c:686}[id],Number(e.target.value)||0));setTrafficOptions(o=>({...o,initialOccupancy:{...o.initialOccupancy,[id]:value}}));setRunning(false);setTrafficReset(v=>v+1);}}/><span>{trafficStats.occupancy?.[id]??trafficOptions.initialOccupancy[id]} parked · {trafficStats.reserved?.[id]??0} inbound</span></label>)}</div>
            <label>Badge vehicles (%) <input type="number" min="0" max="100" value={trafficOptions.badgePercent} onChange={e=>{setTrafficOptions(o=>({...o,badgePercent:Math.max(0,Math.min(100,Number(e.target.value)||0))}));setRunning(false);setTrafficReset(v=>v+1);}}/></label>
            <small>Black Permit: {trafficStats.badgeParking??0} / 51 badges parked · {trafficStats.badgeReserved??0} inbound. Reserved for badges within A's 411; general A has 360 spaces. General total 1,533 + 51 badge = 1,584.</small>
            <div className="traffic-actions">{[['Empty lots',{a:0,b:0,c:0}],['A full',{a:411,b:0,c:0}],['A + B full',{a:411,b:487,c:0}],['All lots full',{a:411,b:487,c:686}]].map(([name,initialOccupancy])=><button key={name} onClick={()=>{setTrafficOptions(o=>({...o,initialOccupancy}));setTrafficReset(v=>v+1);setRunning(false);}}>{name}</button>)}</div>
            <small>{Object.values(trafficStats.assignments??{}).reduce((a,b)=>a+b,0)-Object.values(trafficStats.reserved??{}).reduce((a,b)=>a+b,0)} arrivals completed · parked markers show grouped arrivals, not individual traced stalls. Internal aisles and lane widths remain estimated.</small>
            {trafficMode==='demo'&&<button onClick={()=>{setTrafficMode('continuous');setTrafficReset(v=>v+1);setRunning(false);}}>Return to continuous arrivals</button>}
            <div className="traffic-actions"><button onClick={()=>setRunning(!running)}>{running?'Pause traffic':'Start traffic'}</button><button onClick={()=>{setRunning(false);setTrafficReset(v=>v+1);setTrafficStats({active:0,entered:[0,0],exited:[0,0],waiting:[0,0]});}}>Reset traffic</button></div>
          </div>
      </aside>

      {selected&&<aside className="inspector" aria-label="Object inspector">
        <div className="inspector-head"><div><span className="eyebrow">OBJECT DETAILS</span><h2>{selected.type==='spaces'?'Parking row':selected.type[0].toUpperCase()+selected.type.slice(1)}</h2></div><button className="icon-button" onClick={()=>{setSelectedId(null);setTool('select');}} aria-label="Close inspector">×</button></div>
        <div className="inspector-body">
          <label>Name<input maxLength={200} value={selected.name} onChange={e=>update(selected.id,{name:e.target.value})}/></label>
          {selected.type==='lot'&&<><div className="field-pair"><NumberField label="Capacity" value={selected.capacity} min={0} max={1000} integer onChange={v=>update(selected.id,{capacity:v})}/><label>Lot color<input type="color" value={selected.color} onChange={e=>update(selected.id,{color:e.target.value})}/></label></div><button className={`lot-toggle ${selected.open?'enabled':''}`} onClick={()=>update(selected.id,{open:!selected.open})}>{selected.open?'● Open to arrivals':'○ Closed to arrivals'}<span>Toggle</span></button><p className="field-note">A: 411 · B: 487 · C: 686. Total: 1,584, supplied by you. Drawn spaces are approximate and counted separately.</p></>}
          {selected.type==='spaces'&&<><NumberField label="Spaces in this row" value={selected.count} min={1} max={50} integer onChange={v=>update(selected.id,{count:v})}/><label>Assigned lot<select value={selected.lotId} onChange={e=>update(selected.id,{lotId:e.target.value})}><option value="">Unassigned</option>{lots.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label></>}
          {selected.type==='position'&&<><label>Role<select value={selected.role} onChange={e=>update(selected.id,{role:e.target.value})}>{[...new Set([...ROLES,selected.role])].map(role=><option key={role}>{role}</option>)}</select></label><label>Volunteer<input maxLength={200} placeholder="Assign a name" value={selected.assignee} onChange={e=>update(selected.id,{assignee:e.target.value})}/></label><label>Role instructions<textarea rows={3} maxLength={2000} placeholder="What should this person do, and why?" value={selected.notes} onChange={e=>update(selected.id,{notes:e.target.value})}/></label></>}
          <div className="section-label">PLACEMENT <span>IMAGE-RELATIVE UNITS</span></div>
          <div className="field-pair"><NumberField label="X · east" value={selected.x} min={0} max={WORLD.width} onChange={v=>update(selected.id,{x:v})}/><NumberField label="Y · south" value={selected.z} min={0} max={WORLD.height} onChange={v=>update(selected.id,{z:v})}/></div>
          <div className="field-pair"><NumberField label={selected.type==='spaces'?'Stall width':'Width'} value={selected.width} min={0.4} max={113} onChange={v=>update(selected.id,{width:v})}/><NumberField label="Depth" value={selected.depth} min={0.4} max={92} onChange={v=>update(selected.id,{depth:v})}/></div>
          <NumberField label="Rotation (degrees)" value={selected.rotation} min={-360} max={360} onChange={v=>update(selected.id,{rotation:v})}/>
          {selected.points&&<p className="field-note">Satellite-traced shape. Position and rotation move the entire trace; width and depth describe its bounds, not a shape-resizing control.</p>}
          <button className={`button move-button ${tool==='move'?'moving':''}`} onClick={()=>setTool(tool==='move'?'select':'move')}>{tool==='move'?'Cancel move':'⌖ Move on map'}</button>
          <button className="delete-button" onClick={remove}>Delete {selected.type==='spaces'?'row':selected.type}</button>
        </div>
      </aside>}
    </div>
    <footer className="footer"><span><strong>LAYOUT FIRST.</strong> Confidence follows.</span><span>{totals.marked} drawn spaces <b>·</b> *User-supplied capacities · 1,584 total <b>·</b> Draft v0.1</span><button onClick={()=>setConfirmation({title:'Reset to starter layout?',description:'This replaces your current layout with the provisional screenshot-based starter. Export a backup first, or use Undo after resetting.',action:()=>{commit(initialLayout());setSelectedId(null);setRunning(false);notify('Starter layout restored.');}})}>Reset draft</button></footer>
    {message&&<div className="toast" role="status">{message}<button aria-label="Dismiss message" onClick={()=>setMessage('')}>×</button></div>}
    {confirmation&&<div className="modal-backdrop"><section className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><h2 id="confirm-title">{confirmation.title}</h2><p id="confirm-description">{confirmation.description}</p><div><button className="button subtle" autoFocus onClick={()=>setConfirmation(null)}>Cancel</button><button className="button dark" onClick={()=>{confirmation.action();setConfirmation(null);}}>Replace layout</button></div></section></div>}
  </div>;
}

function NumberField({label,value,min,max,integer,onChange}) {
  const [draft,setDraft]=useState(String(value));
  useEffect(()=>setDraft(String(value)),[value]);
  return <label>{label}<input type="number" inputMode={integer?'numeric':'decimal'} min={min} max={max} step={integer?1:0.1} value={draft} onChange={event=>{
    const raw=event.target.value; setDraft(raw);
    if(raw==='') return;
    const n=Number(raw);
    if(Number.isFinite(n)&&n>=min&&n<=max&&(!integer||Number.isInteger(n))) onChange(n);
  }} onBlur={()=>setDraft(String(value))}/></label>;
}

createRoot(document.getElementById('root')).render(<App/>);
