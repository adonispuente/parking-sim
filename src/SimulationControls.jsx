import React from 'react';
import { ServiceSelect } from './SundayControls.jsx';
import { PLAYBACK_SPEEDS } from './playback.js';
import { formatServiceClock } from './sundayServices.js';
import { LOT_CAPACITY } from './parkingZones.js';

export default function SimulationControls({options,setOptions,stats,running,onToggle,speed,onSpeed,onReset}) {
  const service=options.service;
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
  </section>;
}
