import React from 'react';
import StaffingControls from '../StaffingControls.jsx';
import SundayControls from '../SundayControls.jsx';
import RouteSourcesPanel from '../RouteSourcesPanel.jsx';
import { SHUTTLE_CAR_EQUIVALENT, TRAFFIC_PRIORITY_ORDER } from '../trafficPriority.js';
import TrafficCoordination from './TrafficCoordination.jsx';
import ShuttleControls from './ShuttleControls.jsx';
import PanelSection from './PanelSection.jsx';

const sum = (values) => values.reduce((a, b) => a + b, 0);

const PHASE_LABELS = {
  arrival: 'Arrivals · stay parked',
  departure: 'Departures · release cars',
  mixed: 'Mixed manual traffic',
};

/**
 * Right-hand operations panel. Each concern is its own collapsible section so
 * the live status stays visible while detailed settings stay out of the way.
 */
export default function TrafficDashboard({
  trafficOptions,
  setTrafficOptions,
  trafficStats,
  trafficRates,
  onChangeRate,
  onReset,
  onRun,
  playbackState,
  children,
}) {
  const scheduled = trafficOptions.service?.enabled;
  const serviceId = trafficStats.serviceStatus?.id ?? trafficOptions.service?.id;
  const finalService = scheduled && serviceId === 'final';
  const unstaffedCount = Object.values(trafficOptions.staffing ?? {}).filter(
    (v) => v === false,
  ).length;

  function updateShuttles(patch) {
    setTrafficOptions((options) => ({ ...options, shuttles: { ...options.shuttles, ...patch } }));
  }
  return (
    <aside className="traffic-dashboard" aria-label="Operations">
      <PanelSection title="Map display" defaultOpen>
        {children}
      </PanelSection>

      <PanelSection title="Live flow" defaultOpen>
        <div className="flow-stats" aria-label="Live traffic counts">
          <div>
            <strong>{trafficStats.active}</strong>
            <span>on road</span>
          </div>
          <div>
            <strong>{sum(trafficStats.entered)}</strong>
            <span>entered</span>
          </div>
          <div>
            <strong>{sum(trafficStats.exited)}</strong>
            <span>reached lot</span>
          </div>
          <div>
            <strong>{sum(trafficStats.waiting)}</strong>
            <span>waiting off-map</span>
          </div>
        </div>
        <div className={`callout ${trafficStats.atCapacity ? 'warning' : ''}`}>
          <strong>
            {trafficStats.atCapacity
              ? 'General parking full · arrivals continue via Feeder'
              : 'Parking allocation active'}
          </strong>
          <small>
            {trafficStats.sentAway ?? 0} redirected past campus ·{' '}
            {sum(trafficStats.throughEntered ?? []) - sum(trafficStats.throughExited ?? [])} passing
            through · {sum(trafficStats.overflowWaiting ?? [])} waiting to join the road. Equity
            arrivals also leave via Feeder. Authorized badge parking is separate.
          </small>
        </div>
        <small>
          {sum(Object.values(trafficStats.departed ?? {}))} departed campus ·{' '}
          {trafficStats.departing ?? 0} exiting now ·{' '}
          {sum(Object.values(trafficStats.assignments ?? {})) -
            sum(Object.values(trafficStats.reserved ?? {}))}{' '}
          arrivals completed
        </small>
        <small>
          Black Permit · badge arrivals fixed at 5% · {trafficStats.badgeParking ?? 0} / 51 parked ·{' '}
          {trafficStats.badgeReserved ?? 0} inbound. Included in Lot A’s total.
        </small>
        <div className="callout">
          <strong>Right of way: {TRAFFIC_PRIORITY_ORDER.join(' → ')}</strong>
          <small>
            Waiting on-road: {trafficStats.priorityWaiting?.shuttle ?? 0} buses ·{' '}
            {trafficStats.priorityWaiting?.departure ?? 0} departures ·{' '}
            {trafficStats.priorityWaiting?.arrival ?? 0} arrivals
          </small>
          <small>
            1 shuttle = at least {SHUTTLE_CAR_EQUIVALENT} cars of priority. Keep buses moving; clear
            occupied crossings and maintain safe following. Priority does not allow overtaking
            through a queue.
          </small>
        </div>
        <small role="status" aria-label="Playback status">
          {playbackState.error
            ? `Playback failed: ${playbackState.error}. Reset traffic to try again.`
            : playbackState.seeking
              ? `Restoring engine state · ${Math.floor((100 * playbackState.completed) / Math.max(0.05, playbackState.target))}% · pause cancels`
              : 'Forward playback · arrival rates are per simulated minute.'}
        </small>
      </PanelSection>

      <PanelSection title="Service schedule" defaultOpen>
        <SundayControls
          options={trafficOptions}
          setOptions={setTrafficOptions}
          stats={trafficStats}
          onReset={onReset}
          onRun={onRun}
        />
      </PanelSection>

      <PanelSection title="Manual traffic" meta={scheduled ? 'Scheduled' : 'Manual'}>
        {scheduled && (
          <p className="panel-note">
            A service schedule is driving arrivals. Choose <strong>Manual</strong> in Service time
            to set the phase and arrival rates yourself.
          </p>
        )}
        <div className="choice-list" role="group" aria-label="Traffic phase">
          {Object.entries(PHASE_LABELS).map(([phase, label]) => (
            <button
              disabled={scheduled}
              key={phase}
              aria-pressed={!scheduled && trafficOptions.phase === phase}
              onClick={() => setTrafficOptions((o) => ({ ...o, phase }))}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="traffic-rates">
          {[
            'Feeder · south → north',
            `Equity Entrance → ${finalService ? 'B (C fallback)' : 'Lot C'}`,
            `Equity entrance/exit 2 → ${finalService ? 'B (C fallback)' : 'Lot C'}`,
          ].map((name, index) => (
            <label key={index}>
              <span>{name}</span>
              <output>{scheduled ? 'Scheduled' : `${trafficRates[index]} cars/min`}</output>
              <input
                disabled={scheduled}
                type="range"
                min="0"
                max="90"
                step="6"
                value={trafficRates[index]}
                onChange={(e) => onChangeRate(index, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </PanelSection>

      <PanelSection
        title="Staffing"
        meta={unstaffedCount ? `${unstaffedCount} unstaffed` : 'All staffed'}
      >
        <StaffingControls
          options={trafficOptions}
          setOptions={setTrafficOptions}
          onReset={onReset}
        />
      </PanelSection>

      <PanelSection title="Shuttles">
        <ShuttleControls
          trafficStats={trafficStats}
          shuttles={trafficOptions.shuttles}
          scheduled={scheduled}
          onUpdateShuttles={updateShuttles}
        />
      </PanelSection>

      <PanelSection title="Live coordination">
        <TrafficCoordination trafficStats={trafficStats} />
      </PanelSection>

      <PanelSection title="Routing assumptions">
        <small>
          Feeder arrivals normally fill A → B → C, with 10% continuing along Corporate to B, then C,
          even while A is open.{' '}
          {finalService
            ? 'At 1:15, both Equity approaches use B’s main entrance; C is fallback only.'
            : 'Both Equity approaches enter staffed Lot C. If C is unavailable, Equity cars wait outside campus.'}
        </small>
        <small>
          Cars become ready around their own service dismissal, including the final service. Lots A,
          B, and C use parking hubs; black permit parking uses its section staging point.
        </small>
        <small>
          Lot B exits: North splits between the north and west exits. South uses north; Banana uses
          west; Pocket uses north.
        </small>
        <small>
          Parked markers show grouped arrivals, not individual traced stalls. Internal aisles and
          lane widths remain estimated.
        </small>
      </PanelSection>

      <PanelSection title="Route sources" meta="Diagnostics">
        <RouteSourcesPanel />
      </PanelSection>
    </aside>
  );
}
