import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from './Scene.jsx';
import { initialLayout, makeItem, validateLayout, deleteItem, stats, STORAGE_KEY, ROLES, WORLD } from './model.js';
import './styles.css';

const TOOLS = [
  ['select','↖','Select'], ['lot','▱','Lot'], ['spaces','▥','Spaces'],
  ['barricade','▰','Barricade'], ['position','♙','Position'], ['road','═','Road'], ['building','▦','Building'],
];

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored) return { layout:validateLayout(JSON.parse(stored)), message:'Restored your saved layout.' };
  } catch { return { layout:initialLayout(), message:'Saved layout could not be read. Loaded the starter layout; import a backup if you have one.' }; }
  return { layout:initialLayout(), message:'' };
}

function App() {
  const [boot] = useState(load);
  const [layout,setLayout]=useState(boot.layout), [selectedId,setSelectedId]=useState(null);
  const [tool,setTool]=useState('select'), [reference,setReference]=useState(false), [running,setRunning]=useState(false);
  const [view,setView]=useState('top'), [zoom,setZoom]=useState(1), [tab,setTab]=useState('lots');
  const [message,setMessage]=useState(boot.message), [saved,setSaved]=useState('Saving…');
  const [history,setHistory]=useState([]), [confirmation,setConfirmation]=useState(null);
  const inputRef=useRef(null), messageTimer=useRef(null);
  const selected=layout.items.find(i=>i.id===selectedId), totals=stats(layout);
  const lots=layout.items.filter(i=>i.type==='lot');
  const positions=layout.items.filter(i=>i.type==='position');

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
      <div className="header-actions"><span className={`save-state ${saved.startsWith('Not')?'unsaved':''}`}><i/>{saved}</span><button className="button subtle" onClick={()=>inputRef.current.click()}>Import</button><button className="button dark" onClick={exportLayout}>Export layout <span>↗</span></button></div>
      <input ref={inputRef} hidden type="file" accept=".json,application/json" aria-label="Import layout JSON" onChange={importLayout}/>
    </header>

    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-intro"><span className="eyebrow">01 / BUILD THE FOUNDATION</span><h1>A place for<br/>every arrival.</h1><p>Map your campus. Place your team.<br/>Make the Sunday flow make sense.</p></div>
        <div className="stat-row"><div><strong>{totals.lots.toString().padStart(2,'0')}</strong><span>parking lots</span></div><div><strong>{totals.capacity}</strong><span>open capacity*</span></div><div><strong>{totals.positions.toString().padStart(2,'0')}</strong><span>positions</span></div></div>
        <div className="sidebar-tabs" role="tablist" aria-label="Campus objects">{[['lots','Lots'],['team','Team'],['objects','All objects']].map(([id,name])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{name}{id==='lots'&&<span>{lots.length}</span>}</button>)}</div>
        <div className="object-list" role="tabpanel" aria-label={`${tab} objects`}>
          {list.length===0&&<p className="empty">Nothing here yet. Choose a tool and tap the map.</p>}
          {list.map((item,index)=><div key={item.id} className={`object-card ${selectedId===item.id?'active':''}`}>
            <button className="object-select" onClick={()=>choose(item.id)}><span className={`object-symbol ${item.type==='lot'?'lot-symbol':''}`} style={item.color?{background:item.color}:undefined}>{item.type==='lot'?String.fromCharCode(65+index):item.type==='position'?'♙':(TOOLS.find(t=>t[0]===item.type)?.[1]??'·')}</span><span><strong>{item.name}</strong><small>{item.type==='lot'?`${item.capacity} capacity* · ${layout.items.filter(i=>i.type==='spaces'&&i.lotId===item.id).reduce((n,i)=>n+i.count,0)} drawn`:item.type==='position'?`${item.role} · ${item.assignee||'Unassigned'}`:item.type==='spaces'?`${item.count} drawn spaces`:item.type}</small></span></button>
            {item.type==='lot'&&<button className={`status ${item.open?'open':'closed'}`} aria-label={`${item.open?'Close':'Open'} ${item.name}`} onClick={()=>update(item.id,{open:!item.open})}><i/>{item.open?'Open':'Closed'}</button>}
          </div>)}
        </div>
        <div className="sidebar-foot"><span className="tiny-label">WORKING REFERENCE</span><p>Traced from your campus screenshot.<br/><strong>Boundaries & capacities need confirmation.</strong></p><button className="text-button" onClick={()=>setReference(!reference)}>{reference?'Hide source image':'Compare with source image'} <span>↗</span></button></div>
      </aside>

      <main className="map-area">
        <div className="map-topline"><div><span className="map-dot"/><strong>Campus canvas</strong><span className="map-top-tag">EDITABLE DRAFT</span></div><button className="map-button reference-button" aria-pressed={reference} onClick={()=>setReference(!reference)}>▧ <span>{reference?'Schematic':'Source overlay'}</span></button></div>
        <Scene layout={layout} selectedId={selectedId} tool={tool} reference={reference} running={running} view={view} zoom={zoom} onPick={setSelectedId} onPlace={place}/>
        <div className="north"><span>Ｎ</span><div>↑</div></div>
        <div className="view-controls"><div className="segmented"><button aria-pressed={view==='top'} onClick={()=>setView('top')}>Top</button><button aria-pressed={view==='3d'} onClick={()=>setView('3d')}>3D</button></div><div className="zoom-controls"><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(5,z+0.3))}>+</button><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(0.6,z-0.3))}>−</button><button aria-label="Reset camera" onClick={()=>{setZoom(1);setView(v=>v==='top'?'3d':'top');requestAnimationFrame(()=>setView('top'));}}>⌖</button></div></div>
        <div className="map-caption"><span className="caption-rule"/><span>SCHEMATIC ONLY · NOT TO SCALE</span></div>
        <div className="map-bottom">
          <div className="tool-hint">{tool==='select'?'Drag to pan · pinch to zoom · tap to inspect':tool==='move'?'Tap the new location for the selected object':`Tap the map to place ${tool==='spaces'?'a parking row':`a ${tool}`}`}<button disabled={!history.length} onClick={undo} aria-label="Undo last edit">↶ Undo</button></div>
          <div className="toolbar" aria-label="Layout tools">{TOOLS.map(([id,icon,name])=><button key={id} className={tool===id?'chosen':''} aria-pressed={tool===id} onClick={()=>setTool(id)}><span className="tool-icon">{icon}</span><span>{name}</span></button>)}</div>
          <div className="preview-bar"><div><span className="preview-icon">⇢</span><span><strong>See the movement</strong><small>Illustrative routes, not approved traffic flow</small></span></div><button className={running?'preview-running':''} onClick={()=>setRunning(!running)}>{running?'■ Stop preview':'▶ Preview flow'}</button></div>
        </div>
      </main>

      {selected&&<aside className="inspector" aria-label="Object inspector">
        <div className="inspector-head"><div><span className="eyebrow">OBJECT DETAILS</span><h2>{selected.type==='spaces'?'Parking row':selected.type[0].toUpperCase()+selected.type.slice(1)}</h2></div><button className="icon-button" onClick={()=>{setSelectedId(null);setTool('select');}} aria-label="Close inspector">×</button></div>
        <div className="inspector-body">
          <label>Name<input maxLength={200} value={selected.name} onChange={e=>update(selected.id,{name:e.target.value})}/></label>
          {selected.type==='lot'&&<><div className="field-pair"><NumberField label="Capacity (estimate)" value={selected.capacity} min={0} max={1000} integer onChange={v=>update(selected.id,{capacity:v})}/><label>Lot color<input type="color" value={selected.color} onChange={e=>update(selected.id,{color:e.target.value})}/></label></div><button className={`lot-toggle ${selected.open?'enabled':''}`} onClick={()=>update(selected.id,{open:!selected.open})}>{selected.open?'● Open to arrivals':'○ Closed to arrivals'}<span>Toggle</span></button><p className="field-note">Capacity is a planning estimate. Drawn spaces are counted separately; neither is verified against the site.</p></>}
          {selected.type==='spaces'&&<><NumberField label="Spaces in this row" value={selected.count} min={1} max={50} integer onChange={v=>update(selected.id,{count:v})}/><label>Assigned lot<select value={selected.lotId} onChange={e=>update(selected.id,{lotId:e.target.value})}><option value="">Unassigned</option>{lots.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label></>}
          {selected.type==='position'&&<><label>Role<select value={selected.role} onChange={e=>update(selected.id,{role:e.target.value})}>{[...new Set([...ROLES,selected.role])].map(role=><option key={role}>{role}</option>)}</select></label><label>Volunteer<input maxLength={200} placeholder="Assign a name" value={selected.assignee} onChange={e=>update(selected.id,{assignee:e.target.value})}/></label><label>Role instructions<textarea rows={3} maxLength={2000} placeholder="What should this person do, and why?" value={selected.notes} onChange={e=>update(selected.id,{notes:e.target.value})}/></label></>}
          <div className="section-label">PLACEMENT <span>IMAGE-RELATIVE UNITS</span></div>
          <div className="field-pair"><NumberField label="X · east" value={selected.x} min={0} max={WORLD.width} onChange={v=>update(selected.id,{x:v})}/><NumberField label="Y · south" value={selected.z} min={0} max={WORLD.height} onChange={v=>update(selected.id,{z:v})}/></div>
          <div className="field-pair"><NumberField label={selected.type==='spaces'?'Stall width':'Width'} value={selected.width} min={0.4} max={113} onChange={v=>update(selected.id,{width:v})}/><NumberField label="Depth" value={selected.depth} min={0.4} max={92} onChange={v=>update(selected.id,{depth:v})}/></div>
          <NumberField label="Rotation (degrees)" value={selected.rotation} min={-360} max={360} onChange={v=>update(selected.id,{rotation:v})}/>
          <button className={`button move-button ${tool==='move'?'moving':''}`} onClick={()=>setTool(tool==='move'?'select':'move')}>{tool==='move'?'Cancel move':'⌖ Move on map'}</button>
          <button className="delete-button" onClick={remove}>Delete {selected.type==='spaces'?'row':selected.type}</button>
        </div>
      </aside>}
    </div>
    <footer className="footer"><span><strong>LAYOUT FIRST.</strong> Confidence follows.</span><span>{totals.marked} drawn spaces <b>·</b> *Sample capacities <b>·</b> Draft v0.1</span><button onClick={()=>setConfirmation({title:'Reset to starter layout?',description:'This replaces your current layout with the provisional screenshot-based starter. Export a backup first, or use Undo after resetting.',action:()=>{commit(initialLayout());setSelectedId(null);setRunning(false);notify('Starter layout restored.');}})}>Reset draft</button></footer>
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
