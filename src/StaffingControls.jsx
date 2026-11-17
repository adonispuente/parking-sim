import React from 'react';
import { POSITIONS, C_HUB_POSITIONS } from './positions/index.js';

const effects={
  aMain:'Removes five-car turns at Main.',
  aExitOfficer:'Removes the staffed Feeder exit release.',
  corporateOfficer:'Removes the 10-out / 5-in turns and Alpha-to-Bravo diversion.',
  permitOfficer:'Removes advance traffic holds for Black Permit shuttles.',
  bEntrance:'Removes the passage counter and radio member. This position has no separate traffic hold in the current model.',
  bExit:'Removes backup-based diversion to the west exit.',
  cEntrance:'Removes advance traffic holds for entrance shuttle turns.',
  cExit:'Removes coordinated traffic holds for returning C shuttles.',
  cRoundabout:'Removes the four-way marshal’s release control.',
};
export default function StaffingControls({options,setOptions,onReset}) {
  const positions=[...POSITIONS,...C_HUB_POSITIONS];
  const count=positions.filter(p=>options.staffing?.[p.id]!==false).length;
  const change=patch=>{setOptions(o=>({...o,staffing:{...o.staffing,...patch}}));onReset();};
  return <section className="sunday-panel staffing-panel" aria-label="Position staffing">
    <strong>Position staffing · {count} / {positions.length} staffed</strong>
    <small>Uncheck a position to leave it unstaffed. Changes restart and pause the simulation. Roads stay open; drivers still follow vehicles ahead, yield at conflicts, and obey the Equity / Clay stop. These are illustrative staffing scenarios, not measured predictions.</small>
    <div className="staffing-actions"><button onClick={()=>change(Object.fromEntries(positions.map(p=>[p.id,true])))}>Staff all positions</button><button onClick={()=>change(Object.fromEntries(positions.map(p=>[p.id,false])))}>Leave all unstaffed</button></div>
    {positions.map(p=><label className="staffing-position" key={p.id}>
      <input type="checkbox" aria-label={`Staff ${p.title}`} checked={options.staffing?.[p.id]!==false} onChange={e=>change({[p.id]:e.target.checked})}/>
      <span><strong>{p.title}</strong><small>{effects[p.id]}</small></span>
    </label>)}
  </section>;
}
