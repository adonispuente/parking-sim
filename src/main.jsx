import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from './Scene.jsx';
import { openParkingCapacity } from './parkingAvailability.js';
import SundayControls from './SundayControls.jsx';
import SimulationControls from './SimulationControls.jsx';
import RouteSourcesPanel from './RouteSourcesPanel.jsx';
import { serviceOptions, NEXT_SERVICE, formatServiceClock } from './sundayServices.js';
import { serviceCarryOptions } from './serviceCarry.js';
import { SHUTTLE_CAR_EQUIVALENT, TRAFFIC_PRIORITY_ORDER } from './trafficPriority.js';
import { initialLayout, makeItem, validateLayout, deleteItem, stats, STORAGE_KEY, ROLES, WORLD } from './model.js';
import './styles.css';
import { SOURCE_PAIR } from './clearImageSource.js';

import { tracedFeatures, tracedLayout } from './tracedMap.js';
// Same source frame as every polygon, route and control.
import clearPhotoUrl from '../images/Clear Image.png';

const TOOLS = [
  ['select','↖','Select'], ['lot','▱','Lot'], ['spaces','▥','Spaces'],
  ['barricade','▰','Barricade'], ['position','♙','Position'], ['road','═','Road'], ['building','▦','Building'],
];

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('parking-flow-layout-v1');
    if(stored) {
      const raw=JSON.parse(stored);
      if(raw.sourcePair!==SOURCE_PAIR) {
        localStorage.setItem(`${STORAGE_KEY}-before-unified-source`,stored);
        return tracedLayout(raw);
      }
      const parsed=validateLayout(raw);
      return parsed;
    }
  } catch { return initialLayout(); }
  return initialLayout();
}

function App() {
  const [layout,setLayout]=useState(load), [selectedId,setSelectedId]=useState(null);
  const [tool,setTool]=useState('select'), [reference,setReference]=useState(false), [running,setRunning]=useState(false);
  const [presentation,setPresentation]=useState('world');
  const traced=presentation==='trace', world=presentation==='world';
  const [showLabels,setShowLabels]=useState(false), [showOccupancy,setShowOccupancy]=useState(true);
  const [showPhoto,setShowPhoto]=useState(false);
  const [cameraFocus,setCameraFocus]=useState('campus'), [cameraReset,setCameraReset]=useState(0);
  function setTraced(value) { setPresentation(value?'trace':'draft'); }
  function toggleSatellite() { if(!reference)setView('top');setReference(v=>!v); }
  function changePresentation(mode) { setPresentation(mode);setReference(false);setSelectedId(null);setTool('select');setView(mode==='world'?'3d':'top');setZoom(1);setCameraFocus('campus');setCameraReset(v=>v+1); }
  const [trafficRates,setTrafficRates]=useState([18,18,0]), [trafficReset,setTrafficReset]=useState(0);
  const [trafficMode,setTrafficMode]=useState('continuous');
  const [playbackSpeed,setPlaybackSpeed]=useState(5);
  const [seekRequest,setSeekRequest]=useState(null);
  const [playbackState,setPlaybackState]=useState({clock:0,seeking:false,target:0,completed:0,error:''});
  const updatePlayback=patch=>setPlaybackState(state=>({...state,...patch}));
  function invalidateReplay() {
    setRunning(false);
  }
  const [trafficOptions,setTrafficOptions]=useState(()=>{const service=serviceOptions('eleven');return {initialOccupancy:{...service.initialOccupancy},badgePercent:5,phase:'arrival',service:{enabled:true,...service},zonePreferences:{a:'auto',b:'auto',c:'auto'},shuttles:{enabled:true,activeCount:service.activeBuses,bFullPercent:100,randomDwell:true,dwellSeconds:45,cDirection:'auto',bStop:'circuit',dispatchMode:'demand',dispatchDuringDepartures:service.transition}};});
  const [trafficStats,setTrafficStats]=useState({active:0,entered:[0,0],exited:[0,0],waiting:[0,0]});
  const [view,setView]=useState('3d'), [zoom,setZoom]=useState(1), [tab,setTab]=useState('lots'), [showRoutes,setShowRoutes]=useState(false);
  const [message,setMessage]=useState(''), [saved,setSaved]=useState('Saving…');
  const [history,setHistory]=useState([]), [confirmation,setConfirmation]=useState(null);
  const messageTimer=useRef(null);
  const selected=layout.items.find(i=>i.id===selectedId), totals=stats(layout);
  const lots=layout.items.filter(i=>i.type==='lot');
  const positions=layout.items.filter(i=>i.type==='position');
  const openCapacity=openParkingCapacity(lots,trafficStats.occupancy??trafficOptions.initialOccupancy,trafficStats.reserved,trafficStats);

  useEffect(()=>{
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(layout)); setSaved('Saved on this device'); }
    catch { setSaved('Local saving unavailable'); }
  },[layout]);
  useEffect(()=>()=>clearTimeout(messageTimer.current),[]);

  // Commander (2026-11-13): pressing play at 9:00 rolls into 11:00 and then 1:15.
  // The first idle carry checkpoint (arrivals issued, car roads clear) starts the
  // next service at that same minute, keeping parked cars and A's latch.
  const autoCarried=useRef(null);
  useEffect(()=>{
    const service=trafficOptions.service,carry=trafficStats.serviceCarry,currentId=trafficStats.serviceStatus?.id;
    const nextId=NEXT_SERVICE[currentId];
    if(!running||!service?.enabled||trafficOptions.autoContinue===false||!nextId||!carry||service.id!==currentId)return;
    const key=`${currentId}@${carry.minute}`;
    if(autoCarried.current===key)return;
    let patch;
    try { patch=serviceCarryOptions(trafficOptions,trafficStats,nextId,{continuous:true}); } catch { return; }
    autoCarried.current=key;
    setTrafficOptions(o=>({...o,...patch}));
    setTrafficMode('continuous');setTrafficReset(v=>v+1);
    notify(`Continuing into the ${nextId==='final'?'1:15':'11:00'} service at ${formatServiceClock(patch.service.beginMinute)} with parked cars carried.`);
  },[trafficStats,running,trafficOptions]);

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
  function remove() {
    if(!selected) return;
    commit(deleteItem(layout,selected.id)); setSelectedId(null); setTool('select');
  }
  const list = tab==='lots'?lots:tab==='team'?positions:layout.items;

  return <div className={`app ${world?'world-app':''}`}>
    <header className="header">
      <a className="brand" href="./" aria-label="Parking Flow home"><span className="brand-icon">P<span>↗</span></span><span>parking<span className="brand-light">flow</span><small>HOPE CITY / CAMPUS SIMULATOR</small></span></a>
      <div className="project-heading"><span className="eyebrow">YOUR CAMPUS</span><strong>{layout.name}</strong></div>
      <span className={`save-state ${saved==='Local saving unavailable'?'unsaved':''}`}><i/>{saved}</span>
    </header>

    <SimulationControls options={trafficOptions} setOptions={setTrafficOptions} stats={trafficStats}
      running={running} onToggle={()=>setRunning(v=>!v)} speed={playbackSpeed} onSpeed={setPlaybackSpeed}
      onReset={()=>{setRunning(false);setTrafficMode('continuous');setTrafficReset(v=>v+1);}}>
      <div className="map-quick-controls" role="group" aria-label="Map visibility">
        <button aria-pressed={reference} onClick={toggleSatellite}>Satellite overlay</button>
        <button aria-pressed={showRoutes} onClick={()=>setShowRoutes(v=>!v)}>Routes</button>
        <button aria-pressed={showOccupancy} onClick={()=>setShowOccupancy(v=>!v)}>Lot fullness</button>
      </div>
    </SimulationControls>

    <div className="workspace">
      <aside className="sidebar" hidden={world}>
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
        <div className="sidebar-foot"><span className="tiny-label">LABELME · UPDATED TRACE</span><p>{tracedFeatures.length} source-pixel annotations: roof outlines, parking regions, Corporate Drive, roundabouts and shuttle pickup points.<br/><strong>These regions are not counted parking stalls. Capacities remain A 411 · B 487 · C 686 (1,584 total).</strong></p><button className="text-button" onClick={()=>setTraced(!traced)}>{traced?'View editable draft':'View updated trace'} <span>↗</span></button><button className="text-button" onClick={toggleSatellite}>{reference?'Hide source image':'Compare with source image'} <span>↗</span></button><button className="text-button" onClick={()=>setConfirmation({title:'Apply updated LabelMe map?',description:'Replaces the old generated map geometry with the updated source trace. Existing custom objects and lot operating settings remain. Undo can restore this draft.',action:()=>{commit(tracedLayout(layout));setTraced(false);setSelectedId(null);setRunning(false);notify('Updated LabelMe geometry applied. Undo restores the previous draft.');}})}>Apply updated trace to editable map</button></div>
      </aside>

      <main className="map-area">

        <Scene layout={layout} selectedId={selectedId} tool={world||traced?'select':tool} reference={reference} traced={traced} world={world} showLabels={showLabels||!world} showOccupancy={showOccupancy} cameraFocus={cameraFocus} cameraReset={cameraReset} running={running} playbackSpeed={playbackSpeed} seekRequest={seekRequest} onPlaybackState={updatePlayback} onReplayInvalidated={invalidateReplay} trafficRates={trafficRates} trafficReset={trafficReset} trafficMode={trafficMode} trafficOptions={trafficOptions} onTrafficStats={setTrafficStats} view={view} zoom={zoom} showRoutes={showRoutes} onPick={world?()=>{}:setSelectedId} onPlace={world?()=>{}:place}/>
        {view==='top'&&<div className="north"><span>Ｎ</span><div>↑</div></div>}
        <div className="view-controls"><div className="segmented"><button aria-pressed={view==='top'} onClick={()=>setView('top')}>Top</button><button aria-pressed={view==='3d'} onClick={()=>setView('3d')}>3D</button></div><div className="zoom-controls"><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(5,z+0.3))}>+</button><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(0.6,z-0.3))}>−</button><button aria-label="Reset camera" onClick={()=>{setZoom(1);setCameraFocus('campus');setCameraReset(v=>v+1);}}>⌖</button></div></div>
        {world&&<>
          <div className="world-bottom"><div className="world-focus" role="group" aria-label="Camera focus">{[['campus','Campus'],['a','Alpha'],['b','Bravo'],['c','Charlie']].map(([id,title])=><button key={id} aria-pressed={cameraFocus===id} onClick={()=>{setCameraFocus(id);setZoom(id==='campus'?1:2.2);setCameraReset(v=>v+1);}}>{title}</button>)}</div></div>
          {showPhoto&&<figure className="photo-reference" id="clear-photo"><figcaption><strong>Clear satellite photo · reference only</strong><span>Different extent and scale from the approved trace. Not aligned to this map.</span><button aria-label="Close clear photo" onClick={()=>setShowPhoto(false)}>×</button></figcaption><img src={clearPhotoUrl} alt="Clearer satellite photo of the Hope City campus, three upper-row buildings and surrounding lots" loading="lazy"/></figure>}
        </>}
        {!world&&<div className="map-caption"><span className="caption-rule"/><span>{traced?'IMAGE-PIXEL TRACE · NOT TRAFFIC RULES':'SCHEMATIC ONLY · NOT TO SCALE'}</span></div>}
        <div className="map-bottom" hidden={world}>
          <div className="tool-hint">{tool==='select'?'Drag to pan · pinch to zoom · tap to inspect':tool==='move'?'Tap the new location for the selected object':`Tap the map to place ${tool==='spaces'?'a parking row':`a ${tool}`}`}<button disabled={!history.length} onClick={undo} aria-label="Undo last edit">↶ Undo</button></div>
          <div className="toolbar" aria-label="Layout tools">{TOOLS.map(([id,icon,name])=><button key={id} className={tool===id?'chosen':''} aria-pressed={tool===id} onClick={()=>setTool(id)}><span className="tool-icon">{icon}</span><span>{name}</span></button>)}</div>
        </div>
      </main>

      <aside className="traffic-dashboard" aria-label="Traffic control dashboard">
        <details className="dashboard-details"><summary>Flow details & advanced settings</summary>
          <div className="traffic-controls" aria-label="Corporate Drive traffic controls">
            <section className="map-settings" aria-label="Map display settings"><strong>Map display</strong><div className="presentation-switch" role="group" aria-label="Presentation mode">{[['world','3D World'],['trace','Source trace'],['draft','Layout editor']].map(([id,title])=><button key={id} aria-pressed={presentation===id} onClick={()=>changePresentation(id)}>{title}</button>)}</div><div className="world-options"><button aria-pressed={showLabels} onClick={()=>setShowLabels(v=>!v)}>Labels</button><button aria-pressed={showPhoto} aria-controls="clear-photo" onClick={()=>setShowPhoto(v=>!v)}>Clear photo</button></div></section>
            <SundayControls options={trafficOptions} setOptions={setTrafficOptions} stats={trafficStats} onReset={()=>{setRunning(false);setTrafficMode('continuous');setTrafficReset(v=>v+1);}} onRun={()=>setRunning(true)}/>
            <small role="status" aria-label="Playback status">{playbackState.error?`Playback failed: ${playbackState.error}`:playbackState.seeking?`Restoring engine state · ${Math.floor(100*playbackState.completed/Math.max(.05,playbackState.target))}% · pause cancels`:'Forward playback · arrival rates are per simulated minute.'}</small>
            <div className="traffic-phase" role="group" aria-label="Traffic phase">
              {['arrival','departure','mixed'].map(phase=><button disabled={trafficOptions.service?.enabled} key={phase} aria-pressed={!trafficOptions.service?.enabled&&trafficOptions.phase===phase} onClick={()=>setTrafficOptions(o=>({...o,phase}))}>{phase==='arrival'?'Arrivals · stay parked':phase==='departure'?'Departures · release cars':'Mixed manual traffic'}</button>)}
            </div>
            <div className="traffic-rates">{['Feeder · south → north',`Equity Entrance → ${trafficOptions.service?.enabled&&trafficOptions.service.id==='final'?'B (C fallback)':'Lot C'}`,`Equity entrance/exit 2 → ${trafficOptions.service?.enabled&&trafficOptions.service.id==='final'?'B (C fallback)':'Lot C'}`].map((name,index)=><label key={name}>{name}<input disabled={trafficOptions.service?.enabled} aria-label={`${name} arrival rate`} type="range" min="0" max="90" step="6" value={trafficRates[index]} onChange={e=>setTrafficRates(r=>r.map((v,i)=>i===index?Number(e.target.value):v))}/><span>{trafficOptions.service?.enabled?'Scheduled':`${trafficRates[index]} cars/min`}</span></label>)}</div>
            <small>{trafficStats.active} on road · {trafficStats.entered.reduce((a,b)=>a+b,0)} entered · {trafficStats.exited.reduce((a,b)=>a+b,0)} reached lot · {trafficStats.waiting.reduce((a,b)=>a+b,0)} waiting off-map</small>
            <small>Feeder arrivals normally fill A → B → C, with 10% continuing along Corporate to B, then C, even while A is open. {trafficOptions.service?.enabled&&trafficOptions.service.id==='final'?'At 1:15, both Equity approaches use B’s main entrance; C is fallback only.':'Both Equity approaches enter staffed Lot C. If C is unavailable, Equity cars wait outside campus.'}</small>
            <div className={`capacity-status ${trafficStats.atCapacity?'at-capacity':''}`} role="status"><strong>{trafficStats.atCapacity?'General parking at capacity · send arrivals away':'Parking allocation active'}</strong><small>{trafficStats.sentAway??0} sent away · no overflow parking configured. Authorized badge parking is separate.</small></div>
            <small>{Object.values(trafficStats.departed??{}).reduce((a,b)=>a+b,0)} departed campus · {trafficStats.departing??0} exiting now. Cars become ready around their own service dismissal, including the final service. Lots A, B, and C use parking hubs; black permit parking uses its section staging point.</small>
            <small>Lot B exits: North splits between the north and west exits. South uses north; Banana uses west; Pocket uses north.</small>
            <RouteSourcesPanel/>
            <small>Black Permit · badge arrivals fixed at 5% · {trafficStats.badgeParking??0} / 51 parked · {trafficStats.badgeReserved??0} inbound. Included in Lot A's total.</small>
            <small>{Object.values(trafficStats.assignments??{}).reduce((a,b)=>a+b,0)-Object.values(trafficStats.reserved??{}).reduce((a,b)=>a+b,0)} arrivals completed · parked markers show grouped arrivals, not individual traced stalls. Internal aisles and lane widths remain estimated.</small>
            {trafficMode==='demo'&&<button onClick={()=>{setTrafficMode('continuous');setTrafficReset(v=>v+1);setRunning(false);}}>Return to continuous arrivals</button>}
            <section className="capacity-status" aria-label="Standing traffic priority">
              <strong>Right of way: {TRAFFIC_PRIORITY_ORDER.join(' → ')}</strong>
              <small>1 shuttle = at least {SHUTTLE_CAR_EQUIVALENT} cars of priority. Keep buses moving; clear occupied crossings and maintain safe following. Priority does not allow overtaking through a queue.</small>
              <small aria-live="polite">Waiting on-road: {trafficStats.priorityWaiting?.shuttle??0} buses · {trafficStats.priorityWaiting?.departure??0} departures · {trafficStats.priorityWaiting?.arrival??0} arrivals</small>
            </section>
            <details className="coordination-details"><summary>Live traffic coordination</summary>
              {trafficStats.equityClayStop&&<section className="traffic-control" aria-label="Equity Clay three way stop">
                <strong>Equity / Clay · three-way stop</strong>
                <p>{trafficStats.equityClayStop.reason} · {trafficStats.equityClayStop.waiting} at stop lines · {trafficStats.equityClayStop.cleared} cleared</p>
                <small>Two-way approaches. Stop before entering; release one movement after the intersection clears. Shuttle → departure → arrival priority.</small>
              </section>}
              {trafficStats.cEntrance&&<section className="traffic-control" aria-label="Lot C entrance shuttle priority">
                <strong>Lot C entrance · shuttle turns</strong>
                <p>{trafficStats.cEntrance.reason} · {trafficStats.cEntrance.held.length} cars held</p>
                <small>Hold conflicting cars before a shuttle turns. Vehicles already in the turn and cars ahead of the bus keep clearing. Separated movements continue together.</small>
              </section>}
              {trafficStats.cRoundabout&&<section className="traffic-control" aria-label="Lot C roundabout marshal">
                <strong>Lot C roundabout · four-way marshal</strong>
                <p>{trafficStats.cRoundabout.reason} · {trafficStats.cRoundabout.held.length} held</p>
                <small>Shuttles → exits → entries. Separated lanes continue together; occupied movements clear first.</small>
              </section>}
              {trafficStats.northernRadio&&<section className="traffic-control" aria-label="Northern positions radio coordination">
                <strong>Northern positions · shared walkie-talkie</strong>
                <p>{trafficStats.northernRadio.reason} · {trafficStats.northernRadio.heldCars} cars held · {trafficStats.northernRadio.clearingCars} clearing</p>
                <small>B exit #62 · C entrance #63 · C shuttle exit #64. All receive the same fleet locations and release status. Hold only conflicting Corporate traffic; occupied space clears first.</small>
                <small>Clay {trafficStats.northernRadio.clayBackedUp?'backed up · feeder diversion':'flowing · normal B routes'} · {trafficStats.northernRadio.diverted} B cars diverted before launch. Provisional batches of {trafficStats.northernRadio.batchSize}; no moving-car route swaps.</small>
                <small>Radio fleet: {trafficStats.northernRadio.shuttles.map(bus=>`Bus ${bus.number}: ${bus.circuit??'home'} / ${bus.phase}`).join(' · ')}</small>
              </section>}
              {trafficStats.blackPermitControl&&<section className="traffic-control" aria-label="Black Permit shuttle release">
                <strong>Black Permit · shuttle release</strong>
                <p>{trafficStats.blackPermitControl.reason} · {trafficStats.blackPermitControl.waitingBuses} buses approaching · {trafficStats.blackPermitControl.heldArrivals} arrivals · {trafficStats.blackPermitControl.heldDepartures ?? 0} departures held</p>
                <small>Temporarily stop feeder → Corporate → B/C arrivals while buses exit Black Permit. Release after the bus clears; occupied crossings clear first.</small>
              </section>}
              {trafficStats.corporateExitJunction&&<section className="traffic-control" aria-label="Corporate feeder officer">
                <strong>Feeder / Corporate officer · 10 out / 5 in</strong>
                <p>{trafficStats.corporateExitJunction.reason} · {trafficStats.corporateExitJunction.waitingExit} exits / {trafficStats.corporateExitJunction.waitingEntry} entries ready</p>
                <small>Shuttles first. Count actual clearances when both queues compete; an empty approach never delays the other. Corporate stays two-way, with no whole-road alternating hold.</small>
              </section>}
              {trafficStats.feederOfficer&&<section className="traffic-control" aria-label="Feeder exit officer">
                <strong>Lot A feeder exit officer</strong>
                <p>{trafficStats.feederOfficer.reason} · {trafficStats.feederOfficer.waitingExit} A exits waiting · {trafficStats.feederOfficer.passed} cleared</p>
                <small>Provisional exit-merge placement. Shuttles have priority; vehicles already in the merge clear first. Lot A Main Position remains a separate five-car controller.</small>
              </section>}
            </details>
            <section className="shuttle-panel" aria-label="Shuttle fleet controls">
              <strong>Shuttle fleet · 5 buses</strong>
              <small>Home: Lot A pickup/drop-off. 9:00: three active buses. Transitions: all five. B circuit visits South then North pickup before returning home. C circuit visits the roundabout then the directed North/South pickup.</small>
              <label>Shuttle service<select aria-label="Shuttle service" value={trafficOptions.shuttles.enabled?'on':'off'} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,enabled:e.target.value==='on'}}))}><option value="on">Running with traffic</option><option value="off">Return home and hold</option></select></label>
              <label>Dispatch strategy<select aria-label="Shuttle dispatch strategy" value={trafficOptions.shuttles.dispatchMode??'demand'} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,dispatchMode:e.target.value}}))}><option value="demand">Follow estimated pickup demand</option><option value="fixed">Fixed split · comparison mode</option></select></label>
              {trafficOptions.shuttles.dispatchMode==='fixed'&&<label>Switch all buses to C at B occupancy (%)<input aria-label="Shuttle B occupancy threshold" type="number" min="1" max="100" value={trafficOptions.shuttles.bFullPercent} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,bFullPercent:Math.max(1,Math.min(100,Number(e.target.value)||100))}}))}/></label>}
              {trafficStats.shuttleDemand&&<section aria-label="Shuttle pickup demand" className="traffic-control">
                <strong>Pickup demand · {trafficStats.shuttleDemand.source}</strong>
                <small>Estimated riders, not measured queues or boardings. Provisional: 2.5 people/car × 50% riding; 20 estimated service units per circuit/direction. Home is the A hub. Return demand uses car readiness as a proxy.</small>
                {Object.entries(trafficStats.shuttleDemand.areas).map(([id,area])=><div key={id}><strong>{id==='b'?'Bravo · both stops':id==='cNorth'?'Charlie North':'Charlie South'}</strong><small>To church {area.waiting.toHome.toFixed(1)} · home → lot {area.waiting.toLot.toFixed(1)} · {area.committed.buses} buses committed · priority age {Math.floor(area.ageSeconds)}s</small></div>)}
                <small>Last decision: {trafficStats.shuttleDemand.lastDecision.area??'hold at home'} · {trafficStats.shuttleDemand.lastDecision.reason}. Quiet-area safeguard is dispatch priority, not a guaranteed road travel time.</small>
              </section>}
              <label>Active buses (manual mode)<select disabled={trafficOptions.service?.enabled} aria-label="Active shuttle count" value={trafficOptions.shuttles.activeCount} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,activeCount:Number(e.target.value)}}))}>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
              <label>Boarding time<select aria-label="Shuttle boarding variation" value={trafficOptions.shuttles.randomDwell!==false?'random':'fixed'} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,randomDwell:e.target.value==='random'}}))}><option value="random">Varied · 30–60 seconds per stop</option><option value="fixed">Fixed dwell for debugging</option></select></label>
              {trafficOptions.shuttles.randomDwell===false&&<label>Fixed stop dwell (simulation seconds)<input aria-label="Shuttle stop dwell" type="number" min="0" max="120" value={trafficOptions.shuttles.dwellSeconds} onChange={e=>setTrafficOptions(o=>({...o,shuttles:{...o.shuttles,dwellSeconds:Math.max(0,Math.min(120,Number(e.target.value)||0))}}))}/></label>}
              <small>Buses stage independently across the first ~90 seconds. Home dispatches are at least 15 seconds apart; each pickup samples a new boarding delay. Seeded variation repeats on replay, without forcing simultaneous returns.</small>
              <div className="shuttle-roster">{(trafficStats.shuttles??[]).map(bus=><div key={bus.id}><strong>Bus {bus.number}</strong><span>{bus.dwellStop&&bus.stationary?bus.dwellStop:bus.stop??'A home'} · {bus.phase}{bus.trafficWaiting?' · safe traffic hold':''}</span><small>{bus.trips} round trips · {bus.visits} remote stops{bus.stationary&&bus.dwellRemaining>0?` · ${Math.ceil(bus.dwellRemaining)}s boarding / staging`:''}{bus.yieldReason?` · ${bus.yieldReason.replaceAll('-',' ')}`:''}</small></div>)}</div>
              <small>Dispatch updates at home and the shared C roundabout, never mid-leg. Assigned buses count against demand; zero unmet demand holds at home. Breaks and occupied-road controls still apply. Estimates reset with the scenario/carry; actual passenger boarding and onboard counts are not modeled.</small>
            </section>
          </div>
        </details>
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
    <footer className="footer"><span><strong>LAYOUT FIRST.</strong> Confidence follows.</span><span>{totals.marked} drawn spaces <b>·</b> *User-supplied capacities · 1,584 total <b>·</b> Draft v0.1</span><button onClick={()=>setConfirmation({title:'Reset to starter layout?',description:'This replaces your current layout with the provisional screenshot-based starter. Use Undo after resetting to restore the current layout.',action:()=>{commit(initialLayout());setSelectedId(null);setRunning(false);notify('Starter layout restored.');}})}>Reset draft</button><blockquote className="header-verse footer-verse"><cite>Colossians 3:23</cite><p>"Whatever you do, work at it with all your heart, as working for the Lord, not for human masters."</p></blockquote></footer>
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
