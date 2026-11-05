import React from 'react';
import { SUNDAY_SERVICES, serviceOptions, formatServiceClock } from './sundayServices.js';
import { PARKING_ZONES } from './parkingZones.js';

export default function SundayControls({options,setOptions,stats,onReset,onRun}) {
  const config=options.service??{},status=stats.serviceStatus;
  const change=patch=>setOptions(o=>({...o,service:{...o.service,...patch}}));
  function preset(id) {
    const s=SUNDAY_SERVICES[id];
    setOptions(o=>({...o,phase:'arrival',service:{enabled:true,...serviceOptions(id)},initialOccupancy:{...s.initialOccupancy},initialZoneOccupancy:undefined,
      shuttles:{...o.shuttles,activeCount:s.activeBuses,dispatchDuringDepartures:s.transition}}));
    onReset();
  }
  const nextService=config.id==='nine'?'eleven':config.id==='eleven'?'final':null;
  const carryReady=!!nextService&&status?.remaining===0&&(stats.active??0)===0&&(stats.waiting??[]).every(n=>n===0)&&Object.values(stats.reserved??{}).every(n=>n===0);
  function carryForward() {
    const next=SUNDAY_SERVICES[nextService];
    setOptions(o=>({...o,phase:'arrival',service:{enabled:true,...serviceOptions(nextService)},initialOccupancy:{...stats.occupancy},initialZoneOccupancy:{...stats.zoneOccupancy},
      shuttles:{...o.shuttles,activeCount:next.activeBuses,dispatchDuringDepartures:true}}));
    onReset();
  }
  return <section className="sunday-panel" aria-label="Sunday service simulation">
    <strong>Sunday service flow</strong>
    <small>Fixed services: 9:00 · 11:00 · 1:15. Scenario clock uses simulated time and playback speed.</small>
    <label>Simulation schedule<select aria-label="Sunday service scenario" value={config.enabled?config.id:'manual'} onChange={e=>{
      if(e.target.value==='manual'){setOptions(o=>({...o,service:{...o.service,enabled:false}}));onReset();}
      else preset(e.target.value);
    }}><option value="manual">Manual traffic controls</option>{Object.values(SUNDAY_SERVICES).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
    {config.enabled&&<>
      <div className="service-clock" role="status"><strong>{status?.clock??(config.id==='nine'?'8:15':config.id==='eleven'?'10:15':'12:30')}</strong><span>{status?.phase??'Ready to start'}</span><small>{status?.issued??0} / {config.demand} arrivals issued · {status?.remaining??config.demand} scheduled</small></div>
      <small>Arrival target: about 95% by 45 minutes after service starts. Remaining late-arrival timing is provisional, not a measured distribution.</small>
      {stats.shuttleBreak?.enabled&&<small role="status" aria-label="Service shuttle break">Shuttle break {formatServiceClock(stats.shuttleBreak.startMinute)}–{formatServiceClock(stats.shuttleBreak.endMinute)} · {stats.shuttleBreak.active?'finishing circuits, then holding at A home':(status?.minute??0)>=stats.shuttleBreak.endMinute?'complete · buses running':'scheduled'}. Buses never stop in the roadway for the break.</small>}
      <label>Arriving cars for this service<input aria-label="Service attendance cars" type="number" min="0" max="2500" value={config.demand} onChange={e=>change({demand:Math.max(0,Math.min(2500,Number(e.target.value)||0))})}/></label>
      <label>Equity share of arrivals (%) · minimum 10<input aria-label="Service Equity share" type="number" min="10" max="90" value={config.equityPercent??10} onChange={e=>change({equityPercent:Math.max(10,Math.min(90,Number(e.target.value)||10))})}/></label>
      <small>{config.id==='final'?'At least 10% enter from Equity → B main entrance (C only if B is unavailable). No C stream is planned for 1:15.':'At least 10% enter from Equity → staffed C entrance.'} A separate 10% continue along Corporate → B (or C when B is unavailable), even while A is open. Both shares use total service arrivals. B includes serve-team parking; no separate team headcount is assumed.</small>
      {status&&<small>Scheduled mix: {status.equityCount??0} Equity arrivals · {status.corporateCount??0} Corporate-through arrivals · remainder follows A → B → C.</small>}
      {config.id!=='nine'&&<>
        <label>Early arrivals during first 20 minutes (%)<input aria-label="Early arrival share" type="number" min="0" max="100" value={config.earlyPercent??0} onChange={e=>change({earlyPercent:Math.max(0,Math.min(100,Number(e.target.value)||0))})}/></label>
        <label>Main departure window (minutes)<input aria-label="Departure readiness window" type="number" min="5" max="90" value={config.departureWindowMinutes??40} onChange={e=>change({departureWindowMinutes:Math.max(5,Math.min(90,Number(e.target.value)||5))})}/></label>
        <label>People staying longer (%)<input aria-label="Long stayer share" type="number" min="0" max="90" value={config.lingerPercent??15} onChange={e=>change({lingerPercent:Math.max(0,Math.min(90,Number(e.target.value)||0))})}/></label>
        <label>Additional lingering tail (minutes)<input aria-label="Lingering tail minutes" type="number" min="1" max="90" value={config.lingerMinutes??35} onChange={e=>change({lingerMinutes:Math.max(1,Math.min(90,Number(e.target.value)||1))})}/></label>
        <small>A reopens at ≤180 general parked/inbound (badge excluded). B reopens at ≤243 if it began full; partially occupied B stays open. C stays available until capacity. Manual lot closures still apply.</small>
        <div className="gate-status">{['a','b','c'].map(lot=><span key={lot}>Lot {lot.toUpperCase()}: {stats.gateStatus?.[lot]?'departure hold':'arrival gate open'}</span>)}</div>
        <small>Vary “initial parked” below to represent the previous service. Initial totals distribute using the stated fill order; section values can be set individually.</small>
      </>}
      <div className="traffic-actions"><button onClick={()=>{onReset();onRun();}}>Apply inputs & restart service</button></div>
      {nextService&&<><button disabled={!carryReady} onClick={carryForward}>Next service · carry current parked cars</button><small>Available after all scheduled arrivals finish parking. Carries actual section occupancy into the next dismissal window instead of loading a preset. Buses stage at home for the new scenario.</small></>}
      <small>Demand and departure distributions are training inputs, not measured forecasts. Changes above apply on restart. 12:30 dismissal before 1:15 is provisional. Scheduled arrivals replace manual rate sliders.</small>
    </>}
    <strong>Parking sections · live occupancy</strong>
    <small>C fills the traced First Half across North + South before the remainder. Provisional training split: First Half343 / remainder343; North343 / South343 overall. No individual stall count was inferred from the image.</small>
    <small>Solid fill = parked fraction, west → east within the traced polygon. Inbound reservations are listed separately. These are operational sections, not invented stalls.</small>
    <div className="zone-occupancy">{PARKING_ZONES.map(zone=>{
      const n=stats.zoneOccupancy?.[zone.id]??options.initialZoneOccupancy?.[zone.id]??0;
      const reserved=stats.zoneReserved?.[zone.id]??0;
      return <div key={zone.id}><strong>{zone.label}</strong><span>{n} / {zone.capacity}{reserved?` + ${reserved} inbound`:''}</span><progress aria-label={`${zone.label} occupancy`} max={zone.capacity} value={n}/></div>;
    })}</div>
    <details><summary>Initial section occupancy</summary><small>Overrides that section on the next restart; other sections retain the distribution from the initial lot total. Clear to restore that distribution.</small>{PARKING_ZONES.map(zone=><label key={zone.id}>{zone.label}<input aria-label={`${zone.label} initial occupancy`} type="number" min="0" max={zone.capacity} value={options.initialZoneOccupancy?.[zone.id]??''} placeholder="Use lot total" onChange={e=>setOptions(o=>({...o,initialZoneOccupancy:{...o.initialZoneOccupancy,[zone.id]:e.target.value===''?undefined:Math.min(zone.capacity,Math.max(0,Number(e.target.value)||0))}}))}/></label>)}</details>
    <strong>Volunteer section directions</strong>
    <div className="gate-status" role="status" aria-label="Lot A Main Position">
      <strong>Lot A Main Position · three approaches · batches of 5</strong>
      <span>Releasing {({aNorth:'North',aSouth:'South',aMain:'Main inbound'})[stats.aDepartureControl?.activeSide]??'North'} · {stats.aDepartureControl?.passedInBatch??0} / 5 passed</span>
      <span>At/approaching position: North {stats.aDepartureControl?.waiting?.aNorth??0} · South {stats.aDepartureControl?.waiting?.aSouth??0} · Main inbound {stats.aDepartureControl?.waiting?.aMain??0}</span>
      <small>All three approaches share one person. After five cars clear, switch ready approaches by priority: shuttles → departures → arrivals; equal-priority approaches rotate. An occupied position clears first. Black Permit keeps its separate right-side access.</small>
      <small>Temporary bus rule: buses may pass through other buses, but still wait for cars. Staggering and boarding delays remain active.</small>
    </div>
    {['a','b','c'].map(lot=><label key={lot}>Lot {lot.toUpperCase()} destination<select aria-label={`Lot ${lot.toUpperCase()} section direction`} value={options.zonePreferences?.[lot]??'auto'} onChange={e=>setOptions(o=>({...o,zonePreferences:{...o.zonePreferences,[lot]:e.target.value}}))}><option value="auto">Normal fill order</option>{PARKING_ZONES.filter(z=>z.lot===lot&&z.general).map(z=><option key={z.id} value={z.id}>{z.label}</option>)}</select></label>)}
    <small>Direction changes apply to new assignments. Full sections fall back to another eligible section in the same lot. All B arrivals traverse the south aisle first.</small>
    <details><summary>Departure exit directions</summary><small>These are configurable volunteer policies, not new physical roads. Section-based B split is an illustrative default.</small>
      <label>Lot B departures<select aria-label="Lot B departure routing" value={options.departurePolicy?.b??'split'} onChange={e=>setOptions(o=>({...o,departurePolicy:{...o.departurePolicy,b:e.target.value}}))}><option value="split">South / Banana → west; North / Pocket → Equity</option><option value="west">Main west exit → Corporate / feeder</option><option value="north">Northern exit → Equity</option></select></label>
      <label>Lot C departures<select aria-label="Lot C departure routing" value={options.departurePolicy?.c??'split'} onChange={e=>setOptions(o=>({...o,departurePolicy:{...o.departurePolicy,c:e.target.value}}))}><option value="split">Both exits · North → northwest; South → northeast</option><option value="west">Northwest exit → Equity</option><option value="east">Northeast exit → Equity</option></select></label>
      <small>Volunteer control at B's exit, C's entrance and C's exits: shuttles first, then departures, then arrivals. Occupied space must clear before a conflicting movement proceeds. The section-based C split is a configurable dispatch default, not a traced lane rule.</small>
    </details>
    {!!stats.routingIssues?.length&&<div className="capacity-status at-capacity"><strong>Route needs review</strong>{stats.routingIssues.map(issue=><small key={issue}>{issue}</small>)}</div>}
  </section>;
}
