import React from 'react';
import StaffingControls from '../StaffingControls.jsx';
import SundayControls from '../SundayControls.jsx';
import RouteSourcesPanel from '../RouteSourcesPanel.jsx';
import { SHUTTLE_CAR_EQUIVALENT, TRAFFIC_PRIORITY_ORDER } from '../trafficPriority.js';
import TrafficCoordination from './TrafficCoordination.jsx';
import ShuttleControls from './ShuttleControls.jsx';

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

  function updateShuttles(patch) {
    setTrafficOptions((options) => ({ ...options, shuttles: { ...options.shuttles, ...patch } }));
  }
  return (
    <aside className="traffic-dashboard" aria-label="Traffic control dashboard">
      <details className="dashboard-details">
        <summary>Flow details & advanced settings</summary>
        <div className="traffic-controls" aria-label="Corporate Drive traffic controls">
          {children}
          <StaffingControls options={trafficOptions} setOptions={setTrafficOptions} onReset={onReset} />
          <SundayControls
            options={trafficOptions}
            setOptions={setTrafficOptions}
            stats={trafficStats}
            onReset={onReset}
            onRun={onRun}
          />
          <small role="status" aria-label="Playback status">
            {playbackState.error
              ? `Playback failed: ${playbackState.error}`
              : playbackState.seeking
                ? `Restoring engine state · ${Math.floor((100 * playbackState.completed) / Math.max(0.05, playbackState.target))}% · pause cancels`
                : 'Forward playback · arrival rates are per simulated minute.'}
          </small>
          <div className="traffic-phase" role="group" aria-label="Traffic phase">
            {['arrival', 'departure', 'mixed'].map((phase) => (
              <button
                disabled={scheduled}
                key={phase}
                aria-pressed={!scheduled && trafficOptions.phase === phase}
                onClick={() => setTrafficOptions((o) => ({ ...o, phase }))}
              >
                {phase === 'arrival'
                  ? 'Arrivals · stay parked'
                  : phase === 'departure'
                    ? 'Departures · release cars'
                    : 'Mixed manual traffic'}
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
                {name}
                <input
                  disabled={scheduled}
                  aria-label={`${name} arrival rate`}
                  type="range"
                  min="0"
                  max="90"
                  step="6"
                  value={trafficRates[index]}
                  onChange={(e) => onChangeRate(index, Number(e.target.value))}
                />
                <span>{scheduled ? 'Scheduled' : `${trafficRates[index]} cars/min`}</span>
              </label>
            ))}
          </div>
          <small>
            {trafficStats.active} on road · {trafficStats.entered.reduce((a, b) => a + b, 0)} entered ·{' '}
            {trafficStats.exited.reduce((a, b) => a + b, 0)} reached lot ·{' '}
            {trafficStats.waiting.reduce((a, b) => a + b, 0)} waiting off-map
          </small>
          <small>
            Feeder arrivals normally fill A → B → C, with 10% continuing along Corporate to B, then C,
            even while A is open.{' '}
            {finalService
              ? 'At 1:15, both Equity approaches use B’s main entrance; C is fallback only.'
              : 'Both Equity approaches enter staffed Lot C. If C is unavailable, Equity cars wait outside campus.'}
          </small>
          <div
            className={`capacity-status ${trafficStats.atCapacity ? 'at-capacity' : ''}`}
            role="status"
          >
            <strong>
              {trafficStats.atCapacity
                ? 'General parking full · arrivals continue via Feeder'
                : 'Parking allocation active'}
            </strong>
            <small>
              {trafficStats.sentAway ?? 0} redirected past campus ·{' '}
              {(trafficStats.throughEntered ?? []).reduce((sum, n) => sum + n, 0) -
                (trafficStats.throughExited ?? []).reduce((sum, n) => sum + n, 0)}{' '}
              passing through · {(trafficStats.overflowWaiting ?? []).reduce((sum, n) => sum + n, 0)}{' '}
              waiting to join the road. Equity arrivals also leave via Feeder. Authorized badge parking
              is separate.
            </small>
          </div>
          <small>
            {Object.values(trafficStats.departed ?? {}).reduce((a, b) => a + b, 0)} departed campus ·{' '}
            {trafficStats.departing ?? 0} exiting now. Cars become ready around their own service
            dismissal, including the final service. Lots A, B, and C use parking hubs; black permit
            parking uses its section staging point.
          </small>
          <small>
            Lot B exits: North splits between the north and west exits. South uses north; Banana uses
            west; Pocket uses north.
          </small>
          <RouteSourcesPanel />
          <small>
            Black Permit · badge arrivals fixed at 5% · {trafficStats.badgeParking ?? 0} / 51 parked ·{' '}
            {trafficStats.badgeReserved ?? 0} inbound. Included in Lot A's total.
          </small>
          <small>
            {Object.values(trafficStats.assignments ?? {}).reduce((a, b) => a + b, 0) -
              Object.values(trafficStats.reserved ?? {}).reduce((a, b) => a + b, 0)}{' '}
            arrivals completed · parked markers show grouped arrivals, not individual traced stalls.
            Internal aisles and lane widths remain estimated.
          </small>
          <section className="capacity-status" aria-label="Standing traffic priority">
            <strong>Right of way: {TRAFFIC_PRIORITY_ORDER.join(' → ')}</strong>
            <small>
              1 shuttle = at least {SHUTTLE_CAR_EQUIVALENT} cars of priority. Keep buses moving; clear
              occupied crossings and maintain safe following. Priority does not allow overtaking through
              a queue.
            </small>
            <small aria-live="polite">
              Waiting on-road: {trafficStats.priorityWaiting?.shuttle ?? 0} buses ·{' '}
              {trafficStats.priorityWaiting?.departure ?? 0} departures ·{' '}
              {trafficStats.priorityWaiting?.arrival ?? 0} arrivals
            </small>
          </section>
          <TrafficCoordination trafficStats={trafficStats} />
          <ShuttleControls
            trafficStats={trafficStats}
            shuttles={trafficOptions.shuttles}
            scheduled={scheduled}
            onUpdateShuttles={updateShuttles}
          />
        </div>
      </details>
    </aside>
  );
}
