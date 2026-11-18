import React from 'react';
import { tracedFeatures } from '../tracedMap.js';
import { TOOLS } from './tools.js';
import { TOTAL_LOT_CAPACITY, formatCount, lotCapacitySummary } from '../format.js';

const TABS = [
  ['lots', 'Lots'],
  ['team', 'Team'],
  ['objects', 'All objects'],
];

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
  const tabRefs = React.useRef({});
  // WAI-ARIA tabs: arrow keys / Home / End move between tabs.
  function onTabKey(event) {
    const order = TABS.map(([id]) => id);
    const index = order.indexOf(tab);
    const next = {
      ArrowRight: order[(index + 1) % order.length],
      ArrowLeft: order[(index - 1 + order.length) % order.length],
      Home: order[0],
      End: order.at(-1),
    }[event.key];
    if (!next) return;
    event.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  }
  const list = tab === 'lots' ? lots : tab === 'team' ? positions : items;
  const spacesByLot = new Map();
  for (const item of items) {
    if (item.type === 'spaces')
      spacesByLot.set(item.lotId, (spacesByLot.get(item.lotId) ?? 0) + item.count);
  }
  return (
    <aside className="sidebar" hidden={world}>
      <div className="sidebar-intro">
        <span className="eyebrow">Layout editor</span>
        <h2>A place for every arrival.</h2>
        <p>Map your campus. Place your team. Make the Sunday flow make sense.</p>
      </div>
      <div className="stat-row">
        <div>
          <strong>{totals.lots.toString().padStart(2, '0')}</strong>
          <span>parking lots</span>
        </div>
        <div>
          <strong aria-label="Open parking capacity">{formatCount(openCapacity)}</strong>
          <span>open capacity*</span>
        </div>
        <div>
          <strong>{totals.positions.toString().padStart(2, '0')}</strong>
          <span>positions</span>
        </div>
      </div>
      <div className="sidebar-tabs" role="tablist" aria-label="Campus objects">
        {TABS.map(([id, name]) => (
          <button
            key={id}
            id={`tab-${id}`}
            ref={(el) => (tabRefs.current[id] = el)}
            role="tab"
            aria-selected={tab === id}
            aria-controls="object-panel"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={onTabKey}
          >
            {name}
            {id === 'lots' && <span className="count-badge">{lots.length}</span>}
          </button>
        ))}
      </div>
      <div
        className="object-list"
        id="object-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {list.length === 0 && (
          <p className="empty">Nothing here yet. Choose a tool and tap the map.</p>
        )}
        {list.map((item, index) => (
          <div key={item.id} className={`object-card ${selectedId === item.id ? 'active' : ''}`}>
            <button className="object-select" onClick={() => onSelect(item.id)}>
              <span
                className={`object-symbol ${item.type === 'lot' ? 'lot-symbol' : ''}`}
                aria-hidden="true"
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
                <i aria-hidden="true" />
                {item.open ? 'Open' : 'Closed'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="sidebar-foot">
        <span className="eyebrow">LabelMe · updated trace</span>
        <p>
          {tracedFeatures.length} source-pixel annotations: roof outlines, parking regions,
          Corporate Drive, roundabouts and shuttle pickup points.
          <br />
          <strong>
            These regions are not counted parking stalls. Capacities remain {lotCapacitySummary()} (
            {formatCount(TOTAL_LOT_CAPACITY)} total).
          </strong>
        </p>
        <button className="text-button" onClick={onToggleTrace}>
          {traced ? 'View Editable Draft' : 'View Updated Trace'}
        </button>
        <button className="text-button" onClick={onToggleSatellite}>
          {reference ? 'Hide Source Image' : 'Compare With Source Image'}
        </button>
        <button className="text-button" onClick={onApplyTrace}>
          Apply Updated Trace to Editable Map
        </button>
      </div>
    </aside>
  );
}
