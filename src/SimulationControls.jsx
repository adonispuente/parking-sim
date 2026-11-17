import React, { useEffect, useState } from 'react';
import { ServiceSelect } from './SundayControls.jsx';
import { PLAYBACK_SPEEDS } from './playback.js';
import { configuredServiceOptions, updateServiceInputs, formatServiceClock } from './sundayServices.js';
import { LOT_CAPACITY } from './parkingZones.js';

export default function SimulationControls({options,setOptions,stats,running,onToggle,speed,onSpeed,onReset,children}) {
  const service=options.service;
  const [editService,setEditService]=useState(service?.id??'nine');
  const activeId=stats.serviceStatus?.id??service?.id;
  useEffect(()=>{if(activeId)setEditService(activeId);},[activeId]);
  const arrivals=configuredServiceOptions(options,editService);
  const changeArrivals=patch=>{
    setOptions(o=>updateServiceInputs(o,editService,patch));
    onReset();
  };
  return <section className="simulation-controls" aria-label="Start and configure traffic">
    <div className="simulation-primary">
      <ServiceSelect options={options} setOptions={setOptions} onReset={onReset}/>
      <div className="primary-transport">
        <button className="start-traffic" aria-label={running?'Pause traffic':'Start traffic'} aria-pressed={running} onClick={onToggle}>{running?'Pause':'Start'}<span className="start-detail"> traffic</span><span aria-hidden="true">{running?'Ⅱ':'▶'}</span></button>
        <button className="reset-traffic" aria-label="Reset traffic" onClick={onReset}>Reset</button>
      </div>
      <label>Speed<select aria-label="Playback speed" value={speed} onChange={e=>onSpeed(Number(e.target.value))}>
        {PLAYBACK_SPEEDS.map(value=><option key={value} value={value}>{value}×</option>)}
      </select></label>
      <output className="simulation-clock" aria-label="Simulation time" aria-live="off">
        <strong>{service?.enabled?(stats.serviceStatus?.clock??formatServiceClock(service.beginMinute)):'Manual'}</strong>
        <span>{running?'Running':'Paused'}</span>
      </output>
    </div>
    <fieldset className="initial-parking"><legend>Initial parked</legend>
      {['a','b','c'].map(id=><label key={id}>Lot {id.toUpperCase()}<input aria-label={`Lot ${id.toUpperCase()} initial parked`} type="number" inputMode="numeric" min="0" max={LOT_CAPACITY[id]}
        value={options.initialOccupancy[id]} onChange={e=>{
          const value=Math.max(0,Math.min(LOT_CAPACITY[id],Math.floor(Number(e.target.value)||0)));
          setOptions(o=>({...o,initialServiceCarry:undefined,initialOccupancy:{...o.initialOccupancy,[id]:value}}));
          onReset();
        }}/></label>)}
    </fieldset>
    {service?.enabled&&<fieldset className="arrival-settings"><legend>Incoming traffic · changes restart the simulation</legend>
      <label>Service to configure<select aria-label="Arrival settings service" value={editService} onChange={e=>setEditService(e.target.value)}>
        <option value="nine">9:00 AM</option><option value="eleven">11:00 AM</option><option value="final">1:15 PM</option><option value="easter">Easter</option>
      </select></label>
      <label>Total incoming cars <strong>{arrivals.demand}</strong><input aria-label="Total incoming cars" type="range" min="0" max="2500" step="1" value={arrivals.demand} onChange={e=>changeArrivals({demand:Number(e.target.value)})}/></label>
      <label>Equity arrivals <strong>{arrivals.equityPercent}%{arrivals.equityPercent===10?' (default)':''} · {Math.ceil(arrivals.demand*arrivals.equityPercent/100)} cars</strong><input aria-label="Equity arrivals percentage" type="range" min="10" max="90" step="1" value={arrivals.equityPercent} onChange={e=>changeArrivals({equityPercent:Number(e.target.value)})}/></label>
      {Object.values(stats.serviceTraffic??{}).map(totals=><small key={totals.id} aria-label={`${totals.label} arrival accounting`}>
        <strong>{totals.label}: {totals.demand} incoming cars</strong> · {totals.scheduled} still scheduled · {totals.waiting} waiting off-map · {totals.onRoad} on road · {totals.reachedParking} reached parking · {totals.turnedAway} turned away
      </small>)}
      {arrivals.demand>Object.values(LOT_CAPACITY).reduce((sum,n)=>sum+n,0)&&<small>Campus has {Object.values(LOT_CAPACITY).reduce((sum,n)=>sum+n,0).toLocaleString()} parking spaces. Excess demand is counted as waiting or turned away; it cannot all park at once.</small>}
      <small role="status">{stats.serviceStatus?.label??service.label}: {stats.serviceStatus?.issued??0} / {stats.serviceStatus?.demand??service.demand} issued · {stats.entered?.[0]??0} Feeder / {(stats.entered?.[1]??0)+(stats.entered?.[2]??0)} Equity entered this run. Settings carry into each service.</small>
    </fieldset>}
    {children}
  </section>;
}
