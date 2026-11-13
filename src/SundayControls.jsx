import React from 'react';
import { SUNDAY_SERVICES, NEXT_SERVICE, serviceOptions, formatServiceClock } from './sundayServices.js';

const SERVICE_MENU_LABELS={nine:'9:00 AM',eleven:'11:00 AM',easter:'Easter',final:'1:15 PM'};
const SERVICE_MENU_ORDER=['nine','eleven','final','easter'];
import { PARKING_ZONES } from './parkingZones.js';
import { serviceCarryOptions } from './serviceCarry.js';

export function ServiceSelect({options,setOptions,onReset}) {
  const config=options.service??{};
  function preset(id) {
    const s=SUNDAY_SERVICES[id];
    setOptions(o=>({...o,phase:'arrival',service:{enabled:true,...serviceOptions(id)},initialOccupancy:{...s.initialOccupancy},initialZoneOccupancy:undefined,initialServiceCarry:undefined,
      shuttles:{...o.shuttles,activeCount:s.activeBuses,dispatchDuringDepartures:s.transition}}));
    onReset();
  }
  return <label>Service time<select aria-label="Sunday service scenario" value={config.enabled?config.id:'manual'} onChange={e=>{
      if(e.target.value==='manual'){setOptions(o=>({...o,service:{...o.service,enabled:false}}));onReset();}
      else preset(e.target.value);
    }}><option value="manual">Manual</option>{SERVICE_MENU_ORDER.map(id=><option key={id} value={id}>{SERVICE_MENU_LABELS[id]}</option>)}</select></label>;
}

export default function SundayControls({options,setOptions,stats,onReset,onRun}) {
  const config=options.service??{},status=stats.serviceStatus;
  const change=patch=>setOptions(o=>({...o,service:{...o.service,...patch}}));
  const nextService=NEXT_SERVICE[config.id]??null;
  const carryReady=!!nextService&&!!stats.serviceCarry;
  function carryForward() {
    const patch=serviceCarryOptions(options,stats,nextService);
    setOptions(o=>({...o,...patch}));
    onReset();
  }
  return <section className="sunday-panel" aria-label="Service settings and flow">
    <small className="service-parked" aria-label="Current parked cars">{['a','b','c'].map(lot=><span key={lot}>Lot {lot.toUpperCase()}: <b>{stats.occupancy?.[lot]??options.initialOccupancy?.[lot]??0}</b> parked</span>)}</small>
    {config.enabled&&<>
      <div className="service-clock" role="status"><strong>{status?.clock??formatServiceClock(config.beginMinute??SUNDAY_SERVICES[config.id].beginMinute)}</strong><span>{status?.phase??'Ready to start'}</span><small>{status?.issued??0} / {config.demand} arrivals issued · {status?.remaining??config.demand} scheduled</small></div>
      <small>Arrival timing: 75% arrive by service start; the rest come late, with about 95% by 45 minutes after service starts. Late-arrival spacing is provisional, not a measured distribution.</small>
      <small aria-label="Service dismissal times">Current service dismisses {formatServiceClock(status?.dismissalMinute??((SUNDAY_SERVICES[config.id]?.startMinute??540)+75))}.{status?.previousDismissalMinute!=null&&` Previous service dismisses ${formatServiceClock(status.previousDismissalMinute)}.`} Dismissal is 75 minutes after service start.</small>
      {stats.shuttleBreak?.enabled&&<small role="status" aria-label="Service shuttle break">Shuttle break {formatServiceClock(stats.shuttleBreak.startMinute)}–{formatServiceClock(stats.shuttleBreak.endMinute)} · {stats.shuttleBreak.active?'finishing circuits, then holding at A home':(status?.minute??0)>=stats.shuttleBreak.endMinute?'complete · buses running':'scheduled'}. Buses never stop in the roadway for the break.</small>}
      <label>Arriving cars for this service<input aria-label="Service attendance cars" type="number" min="0" max="2500" value={config.demand} onChange={e=>change({demand:Math.max(0,Math.min(2500,Number(e.target.value)||0))})}/></label>
      <label>Equity share of arrivals (%) · minimum 10<input aria-label="Service Equity share" type="number" min="10" max="90" value={config.equityPercent??10} onChange={e=>change({equityPercent:Math.max(10,Math.min(90,Number(e.target.value)||10))})}/></label>
      <small>{config.id==='final'?'At least 10% enter from Equity → B main entrance (C only if B is unavailable). No C stream is planned for 1:15.':'At least 10% enter from Equity → staffed C entrance.'} A separate 10% continue along Corporate → B (or C when B is unavailable), even while A is open. Both shares use total service arrivals. B includes serve-team parking; no separate team headcount is assumed.</small>
      {status&&<small>Scheduled mix: {status.equityCount??0} Equity arrivals · {status.corporateCount??0} Corporate-through arrivals · remainder follows A → B → C.</small>}
      {config.id!=='nine'&&<>
        <label>Early arrivals during first 20 minutes (%)<input aria-label="Early arrival share" type="number" min="0" max="100" value={config.earlyPercent??0} onChange={e=>change({earlyPercent:Math.max(0,Math.min(100,Number(e.target.value)||0))})}/></label>

        <small>Once A closes, early vacancies do not reopen it. Reopening requires dismissal and ≤180 general parked/inbound (badge excluded). B and C have no half-full hold. Manual closures still apply.</small>
        <small>Vary “initial parked” below to represent the previous service. Initial totals distribute using the stated fill order; section values can be set individually.</small>
      </>}
      <div className="traffic-actions"><button onClick={()=>{onReset();onRun();}}>Apply inputs & restart service</button></div>
      {config.id==='easter'&&<small>Easter: the 11:00 transition with Lots A, B and C full when it begins and enough arrivals ({config.demand} cars) to refill every lot after the 9:00 cars leave.</small>}
      {nextService&&<label className="auto-continue"><input type="checkbox" aria-label="Auto-continue to next service" checked={options.autoContinue!==false} onChange={e=>setOptions(o=>({...o,autoContinue:e.target.checked}))}/> Keep playing into the {SERVICE_MENU_LABELS[nextService]} service (carries parked cars automatically, clock keeps running)</label>}
      {nextService&&<><button disabled={!carryReady} onClick={carryForward}>Next service · carry current parked cars</button><small>Available after scheduled arrivals and car road legs finish. Preserves each car's service/readiness and A's latch; the clock never moves backward. Buses stage at home for the new scenario.</small></>}
      <small aria-label="Departure cohort timing">Vehicle-cohort proxy: about 5% per lot are ready 5–10 minutes before dismissal; about 2% in A linger late. Provisional main readiness spread: 25 minutes after dismissal; A late tail: the next 5 minutes. Integer rounding is under one car per lot/cohort. Readiness is not a completed road exit.</small>
      <small>Final service: 2:30 dismissal, ordinary vehicle readiness by 3:00. Near-empty church is the observation target, not zero parked cars. People, return transport and residual cleanup/serve-team headcounts are not modeled yet. No queued cars are removed to meet the clock. Changes apply on restart.</small>
    </>}
  </section>;
}

export function ParkingSectionControls({options,setOptions,stats}) {
  return <section className="sunday-panel" aria-label="Parking sections live occupancy">
    <strong>Parking sections · live occupancy</strong>
    <small>C fills the traced First Half across North + South before the remainder. Provisional training split: First Half343 / remainder343; North343 / South343 overall. No individual stall count was inferred from the image.</small>
    <small>Solid fill = parked fraction, west → east within the traced polygon. Inbound reservations are listed separately. These are operational sections, not invented stalls.</small>
    <div className="zone-occupancy">{PARKING_ZONES.map(zone=>{
      const n=stats.zoneOccupancy?.[zone.id]??options.initialZoneOccupancy?.[zone.id]??0;
      const reserved=stats.zoneReserved?.[zone.id]??0;
      return <div key={zone.id}><strong>{zone.label}</strong><span>{n} / {zone.capacity}{reserved?` + ${reserved} inbound`:''}</span><progress aria-label={`${zone.label} occupancy`} max={zone.capacity} value={n}/></div>;
    })}</div>
    <details><summary>Initial section occupancy</summary><small>Overrides that section on the next restart; other sections retain the distribution from the initial lot total. Clear to restore that distribution.</small>{PARKING_ZONES.map(zone=><label key={zone.id}>{zone.label}<input aria-label={`${zone.label} initial occupancy`} type="number" min="0" max={zone.capacity} value={options.initialZoneOccupancy?.[zone.id]??''} placeholder="Use lot total" onChange={e=>setOptions(o=>({...o,initialZoneOccupancy:{...o.initialZoneOccupancy,[zone.id]:e.target.value===''?undefined:Math.min(zone.capacity,Math.max(0,Number(e.target.value)||0))}}))}/></label>)}</details>
  </section>;
}

export function VolunteerControls({options,setOptions,stats,children}) {
  return <section className="sunday-panel" aria-label="Volunteer section directions">
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
    <details><summary>Departure exit directions</summary><small>These are configurable volunteer policies, not new physical roads. B North splits between the two exits; B South uses the north exit.</small>
      <label>Lot B departures<select aria-label="Lot B departure routing" value={options.departurePolicy?.b??'split'} onChange={e=>setOptions(o=>({...o,departurePolicy:{...o.departurePolicy,b:e.target.value}}))}><option value="split">North 50/50 · South → north · Banana → west · Pocket → north</option><option value="west">Main west exit → Corporate / feeder</option><option value="north">Northern exit → Equity</option></select></label>
      <label>Lot C departures<select aria-label="Lot C departure routing" value={options.departurePolicy?.c??'split'} onChange={e=>setOptions(o=>({...o,departurePolicy:{...o.departurePolicy,c:e.target.value}}))}><option value="split">Both exits · 50/50</option><option value="west">Median exit only (beside C entrance)</option><option value="east">Far-right northeast exit only</option></select></label>
      <small>C arrivals enter through the staffed entrance and park at one of seven hubs. Departures follow the setting above: by default about half use the median exit beside the entrance and half use the northeast exit. At the four-way above the roundabout, the marshal gives shuttles first priority, then exits; separated entering and exiting lanes move together. The far-right northeast exit remains exit-only.</small>
    </details>
    {children}
    {!!stats.routingIssues?.length&&<div className="capacity-status at-capacity"><strong>Route needs review</strong>{stats.routingIssues.map(issue=><small key={issue}>{issue}</small>)}</div>}
  </section>;
}
