import React, { useEffect, useState } from 'react';
import { routeDiagnostics, subscribeRouteRuntime } from './vehicleRouteCatalog.js';
import { MAIN_POSITION_RESOLUTION, FEEDER_OFFICER_POSITION, OVERLAY_POSITIONS } from './positions/index.js';
import { overlayDisplay } from './layoutOverlayView.js';
const LAYOUT_VIEW = overlayDisplay();
export default function RouteSourcesPanel() {
  const [d,setD]=useState(()=>routeDiagnostics());
  useEffect(()=>{const stop=subscribeRouteRuntime(()=>setD(routeDiagnostics()));setD(routeDiagnostics());return stop;},[]);
  return <details className="route-sources" aria-label="Route sources diagnostics">
    <summary>Route sources · Clear Image unified source</summary>
    <dl>
      <dt>Source pair</dt><dd data-route-diag="source">Clear Image.png + EverythingClearImage.json · 1374×1118 · {d.source.shapes}/65 bound shapes</dd>
      <dt>Revision</dt><dd>{d.source.sourcePair}; old spatial saves migrate operating settings only</dd>
      <dt>Integrity</dt><dd data-route-diag="integrity">{d.integrity.ok?'ok':'FAILED'} · index + exact label + type binding</dd>
      <dt>Coordinate frame</dt><dd data-route-diag="registration">Identity registration · one uniform source→world scale; no affine fit or legacy map</dd>
      <dt>Main Position</dt><dd data-route-diag="main-position">{MAIN_POSITION_RESOLUTION.source} · [{MAIN_POSITION_RESOLUTION.point.map(n=>n.toFixed(2)).join(', ')}] · all three approaches, five actual clears</dd>
      <dt>Feeder officer</dt><dd>Canonical source #58 · [{FEEDER_OFFICER_POSITION.map(n=>n.toFixed(2)).join(', ')}]; admission distances remain provisional simulation settings</dd>
      <dt>Routes</dt><dd>Source driving prefixes are live. Row zigzags are parking guidance, not a tour. Purple potential C exits remain proposals. Cyan = source-composed arrival centerlines before the runtime right-hand lane offset (street segments drive slightly right of cyan), muted = original source lines.</dd>
      <dt>Derived geometry</dt><dd>{d.connectors.length} cached obstacle-checked centerline connectors. Not surveyed aisles or swept-body clearance.</dd>
    </dl>
    <table data-route-diag="zones"><thead><tr><th>Zone</th><th>Source route</th><th>Built provenance</th></tr></thead><tbody>{d.zones.map(z=><tr key={`${z.zone}-${z.uses[0].road}`}><td>{z.zone}</td><td>#{z.routeId}</td><td>{z.uses[0].road}: {z.uses[0].source}</td></tr>)}</tbody></table>
    <ul>{d.gaps.map(g=><li key={g}>{g}</li>)}</ul>
    <h4>Layout overlay</h4>
    <dl>
      <dt>File</dt><dd data-route-diag="layout-overlay">{LAYOUT_VIEW.file} · {LAYOUT_VIEW.features.length} features · {LAYOUT_VIEW.ok?'geometry check OK':`${LAYOUT_VIEW.problems.length} geometry problem(s)`}</dd>
      <dt>Meaning</dt><dd>Runtime features change traffic; advisory ones are drawn only. Shown on the map with Routes on. Re-check after drawing: npm run layout:check.</dd>
    </dl>
    <table className="layout-features" data-route-diag="layout-features"><thead><tr><th>Feature</th><th>Status</th><th>Confidence · evidence</th><th>Meaning</th></tr></thead><tbody>{LAYOUT_VIEW.features.map(f=><tr key={f.id}><td>{f.id}</td><td>{f.status}</td><td style={{color:f.problem?'#c4251f':undefined}}>{f.confidence} · {f.evidence}{f.problem?` · ${f.problems.join('; ')}`:''}</td><td>{f.meaning}</td></tr>)}</tbody></table>
    <h4>Map-defined positions · advisory only</h4>
    <p>Staffed is a description of the proposed role, not an active worker. These points create no traffic holds or radio members.</p>
    <dl data-route-diag="overlay-positions">{OVERLAY_POSITIONS.map(p=><React.Fragment key={p.id}>
      <dt>{p.id} · {p.title}</dt><dd data-overlay-position={p.id}>{p.staffed?'staffed metadata':'unstaffed'} · {p.status} · inactive · {p.confidence} · {p.evidence}. {p.duty} {p.implemented}</dd>
    </React.Fragment>)}</dl>
    {LAYOUT_VIEW.warnings.length>0&&<ul>{LAYOUT_VIEW.warnings.map(w=><li key={w}>{w}</li>)}</ul>}
    <small>Runtime record v{d.runtimeVersion}. Source coordinates are authoritative; connection safety remains simulated, not field-certified.</small>
  </details>;
}
