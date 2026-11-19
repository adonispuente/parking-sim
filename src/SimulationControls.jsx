import React, { useEffect, useState } from 'react';
import { ServiceSelect, SERVICE_MENU_LABELS, SERVICE_MENU_ORDER } from './SundayControls.jsx';
import { PLAYBACK_SPEEDS } from './playback.js';
import {
  configuredServiceOptions,
  updateServiceInputs,
  formatServiceClock,
} from './sundayServices.js';
import { LOT_CAPACITY } from './parkingZones.js';
import { TOTAL_LOT_CAPACITY, formatCount } from './format.js';

export default function SimulationControls({
  options,
  setOptions,
  stats,
  running,
  onToggle,
  speed,
  onSpeed,
  onReset,
}) {
  const service = options.service;
  const [editService, setEditService] = useState(service?.id ?? 'nine');
  const activeId = stats.serviceStatus?.id ?? service?.id;
  useEffect(() => {
    if (activeId) setEditService(activeId);
  }, [activeId]);
  const arrivals = configuredServiceOptions(options, editService);
  const changeArrivals = (patch) => {
    setOptions((o) => updateServiceInputs(o, editService, patch));
    onReset();
  };
  return (
    <section className="simulation-controls" aria-label="Start and configure traffic">
      <div className="simulation-primary">
        <ServiceSelect options={options} setOptions={setOptions} onReset={onReset} />
        <div className="primary-transport">
          <button
            className="start-traffic"
            aria-label={running ? 'Pause traffic' : 'Start traffic'}
            onClick={onToggle}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              {running ? (
                <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" />
              ) : (
                <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
              )}
            </svg>
            {running ? 'Pause' : 'Start'}
            <span className="start-detail"> traffic</span>
          </button>
          <button className="button secondary" aria-label="Reset traffic" onClick={onReset}>
            Reset
          </button>
        </div>
        <label>
          Speed
          <select value={speed} onChange={(e) => onSpeed(Number(e.target.value))}>
            {PLAYBACK_SPEEDS.map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
        <output className="simulation-clock" aria-label="Simulation time">
          <strong>
            {service?.enabled
              ? (stats.serviceStatus?.clock ?? formatServiceClock(service.beginMinute))
              : 'Manual'}
          </strong>
          <span>{running ? 'Running' : 'Paused'}</span>
        </output>
      </div>
      {/* Collapsed by default so the map stays above the fold; the summary shows the key values. */}
      <details className="scenario-inputs">
        <summary>
          <span>Scenario inputs</span>
          <span className="panel-meta">
            {service?.enabled ? `${formatCount(arrivals.demand)} cars · ` : ''}A{' '}
            {options.initialOccupancy.a} · B {options.initialOccupancy.b} · C{' '}
            {options.initialOccupancy.c} parked
          </span>
          <svg className="chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </summary>
        <div className="scenario-body">
          <fieldset className="initial-parking">
            <legend>Initial parked</legend>
            {['a', 'b', 'c'].map((id) => (
              <label key={id}>
                Lot {id.toUpperCase()}
                <input
                  aria-label={`Lot ${id.toUpperCase()} initial parked`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={LOT_CAPACITY[id]}
                  value={options.initialOccupancy[id]}
                  onChange={(e) => {
                    const value = Math.max(
                      0,
                      Math.min(LOT_CAPACITY[id], Math.floor(Number(e.target.value) || 0)),
                    );
                    setOptions((o) => ({
                      ...o,
                      initialServiceCarry: undefined,
                      initialOccupancy: { ...o.initialOccupancy, [id]: value },
                    }));
                    onReset();
                  }}
                />
              </label>
            ))}
          </fieldset>
          {service?.enabled && (
            <fieldset className="arrival-settings">
              <legend>Incoming traffic · changes restart the simulation</legend>
              <label>
                Service to configure
                <select value={editService} onChange={(e) => setEditService(e.target.value)}>
                  {SERVICE_MENU_ORDER.map((id) => (
                    <option key={id} value={id}>
                      {SERVICE_MENU_LABELS[id]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Total incoming cars <strong>{arrivals.demand}</strong>
                <input
                  type="range"
                  min="0"
                  max="2500"
                  step="1"
                  value={arrivals.demand}
                  onChange={(e) => changeArrivals({ demand: Number(e.target.value) })}
                />
              </label>
              <label>
                Equity arrivals{' '}
                <strong>
                  {arrivals.equityPercent}%{arrivals.equityPercent === 10 ? ' (default)' : ''} ·{' '}
                  {Math.ceil((arrivals.demand * arrivals.equityPercent) / 100)} cars
                </strong>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="1"
                  value={arrivals.equityPercent}
                  onChange={(e) => changeArrivals({ equityPercent: Number(e.target.value) })}
                />
              </label>
              {Object.values(stats.serviceTraffic ?? {}).map((totals) => (
                <small key={totals.id} aria-label={`${totals.label} arrival accounting`}>
                  <strong>
                    {totals.label}: {totals.demand} incoming cars
                  </strong>{' '}
                  · {totals.scheduled} still scheduled · {totals.waiting} waiting off-map ·{' '}
                  {totals.onRoad} heading to parking · {totals.reachedParking} reached parking ·{' '}
                  {totals.turnedAway} redirected past campus ({totals.passingThrough ?? 0} passing
                  through · {totals.waitingToPass ?? 0} waiting to join Feeder)
                </small>
              ))}
              {arrivals.demand > TOTAL_LOT_CAPACITY && (
                <small>
                  Campus has {formatCount(TOTAL_LOT_CAPACITY)} parking spaces. Excess cars queue or
                  continue past campus via Feeder; they cannot all park at once.
                </small>
              )}
              <small>
                {stats.serviceStatus?.label ?? service.label}: {stats.serviceStatus?.issued ?? 0} /{' '}
                {stats.serviceStatus?.demand ?? service.demand} issued · {stats.entered?.[0] ?? 0}{' '}
                Feeder / {(stats.entered?.[1] ?? 0) + (stats.entered?.[2] ?? 0)} Equity entered this
                run. Settings carry into each service.
              </small>
            </fieldset>
          )}
        </div>
      </details>
    </section>
  );
}
