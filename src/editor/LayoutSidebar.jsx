import React from 'react';
import { tracedFeatures } from '../tracedMap.js';
import { TOOLS } from './tools.js';

export default function LayoutSidebar({
  world,
  totals,
  openCapacity,
  lots,
  positions,
  items,
  selectedId,
  onSelect,
  onUpdate,
  traced,
  onToggleTrace,
  reference,
  onToggleSatellite,
  onApplyTrace,
}) {
  const [tab, setTab] = React.useState('lots');
  const list = tab === 'lots' ? lots : tab === 'team' ? positions : items;
  const spacesByLot = new Map();
  for (const item of items) {
    if (item.type === 'spaces')
      spacesByLot.set(item.lotId, (spacesByLot.get(item.lotId) ?? 0) + item.count);
  }
  return (
    <aside className="sidebar" hidden={world}>
      <div className="sidebar-intro">
        <span className="eyebrow">01 / BUILD THE FOUNDATION</span>
        <h1>
          A place for
          <br />
          every arrival.
        </h1>
        <p>
          Map your campus. Place your team.
          <br />
          Make the Sunday flow make sense.
        </p>
      </div>
      <div className="stat-row">
        <div>
          <strong>{totals.lots.toString().padStart(2, '0')}</strong>
          <span>parking lots</span>
        </div>
        <div>
          <strong aria-label="Open parking capacity">{openCapacity}</strong>
          <span>open capacity*</span>
        </div>
        <div>
          <strong>{totals.positions.toString().padStart(2, '0')}</strong>
          <span>positions</span>
        </div>
      </div>
      <div className="sidebar-tabs" role="tablist" aria-label="Campus objects">
        {[
          ['lots', 'Lots'],
          ['team', 'Team'],
          ['objects', 'All objects'],
        ].map(([id, name]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {name}
            {id === 'lots' && <span>{lots.length}</span>}
          </button>
        ))}
      </div>
      <div className="object-list" role="tabpanel" aria-label={`${tab} objects`}>
        {list.length === 0 && <p className="empty">Nothing here yet. Choose a tool and tap the map.</p>}
        {list.map((item, index) => (
          <div key={item.id} className={`object-card ${selectedId === item.id ? 'active' : ''}`}>
            <button className="object-select" onClick={() => onSelect(item.id)}>
              <span
                className={`object-symbol ${item.type === 'lot' ? 'lot-symbol' : ''}`}
                style={item.color ? { background: item.color } : undefined}
              >
                {item.type === 'lot'
                  ? String.fromCharCode(65 + index)
                  : item.type === 'position'
                    ? '♙'
                    : (TOOLS.find((t) => t[0] === item.type)?.[1] ?? '·')}
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.type === 'lot'
                    ? `${item.capacity} capacity* · ${spacesByLot.get(item.id) ?? 0} drawn`
                    : item.type === 'position'
                      ? `${item.role} · ${item.assignee || 'Unassigned'}`
                      : item.type === 'spaces'
                        ? `${item.count} drawn spaces`
                        : item.type}
                </small>
              </span>
            </button>
            {item.type === 'lot' && (
              <button
                className={`status ${item.open ? 'open' : 'closed'}`}
                aria-label={`${item.open ? 'Close' : 'Open'} ${item.name}`}
                onClick={() => onUpdate(item.id, { open: !item.open })}
              >
                <i />
                {item.open ? 'Open' : 'Closed'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="sidebar-foot">
        <span className="tiny-label">LABELME · UPDATED TRACE</span>
        <p>
          {tracedFeatures.length} source-pixel annotations: roof outlines, parking regions, Corporate
          Drive, roundabouts and shuttle pickup points.
          <br />
          <strong>
            These regions are not counted parking stalls. Capacities remain A 411 · B 487 · C 686 (1,584
            total).
          </strong>
        </p>
        <button className="text-button" onClick={onToggleTrace}>
          {traced ? 'View editable draft' : 'View updated trace'} <span>↗</span>
        </button>
        <button className="text-button" onClick={onToggleSatellite}>
          {reference ? 'Hide source image' : 'Compare with source image'} <span>↗</span>
        </button>
        <button className="text-button" onClick={onApplyTrace}>
          Apply updated trace to editable map
        </button>
      </div>
    </aside>
  );
}
