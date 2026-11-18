import React from 'react';

export default function ShuttleControls({ trafficStats, shuttles, scheduled, onUpdateShuttles }) {
  return (
    <section className="shuttle-panel" aria-label="Shuttle fleet controls">
      <strong>Shuttle fleet · 5 buses</strong>
      <small>
        Home: Lot A pickup/drop-off. 9:00: three active buses. Transitions: all five. B circuit
        visits South then North pickup before returning home. C circuit visits the roundabout then
        the directed North/South pickup.
      </small>
      <label>
        Shuttle service
        <select
          aria-label="Shuttle service"
          value={shuttles.enabled ? 'on' : 'off'}
          onChange={(e) => onUpdateShuttles({ enabled: e.target.value === 'on' })}
        >
          <option value="on">Running with traffic</option>
          <option value="off">Return home and hold</option>
        </select>
      </label>
      <label>
        Dispatch strategy
        <select
          aria-label="Shuttle dispatch strategy"
          value={shuttles.dispatchMode ?? 'demand'}
          onChange={(e) => onUpdateShuttles({ dispatchMode: e.target.value })}
        >
          <option value="demand">Follow incoming cars & waiting riders</option>
          <option value="fixed">Fixed split · comparison mode</option>
        </select>
      </label>
      {shuttles.dispatchMode === 'fixed' && (
        <label>
          Switch all buses to C at B occupancy (%)
          <input
            aria-label="Shuttle B occupancy threshold"
            type="number"
            min="1"
            max="100"
            value={shuttles.bFullPercent}
            onChange={(e) =>
              onUpdateShuttles({
                bFullPercent: Math.max(1, Math.min(100, Number(e.target.value) || 100)),
              })
            }
          />
        </label>
      )}
      {trafficStats.shuttleDemand && (
        <section aria-label="Shuttle pickup demand" className="traffic-control">
          <strong>Pickup demand · {trafficStats.shuttleDemand.source}</strong>
          <small>
            Estimated riders, not measured queues or boardings. Provisional: 2.5 people/car × 50%
            riding; 20 estimated service units per circuit/direction. Home is the A hub. Incoming
            cars reserve pickup demand before parking; B and C share the fleet in proportion to
            demand, with C North/South combined for lot allocation. Return demand uses car readiness
            as a proxy.
          </small>
          {shuttles.dispatchMode !== 'fixed' && trafficStats.shuttleDemand.arrivalFocus === 'c' && (
            <small>
              All arrivals are going to Charlie: every available shuttle heads to C as it becomes
              free.
            </small>
          )}
          <small aria-label="Shuttle fleet allocation">
            Buses assigned: Bravo {trafficStats.shuttleDemand.areas.b.committed.buses} · Charlie{' '}
            {trafficStats.shuttleDemand.areas.cNorth.committed.buses +
              trafficStats.shuttleDemand.areas.cSouth.committed.buses}{' '}
            total
          </small>
          {Object.entries(trafficStats.shuttleDemand.areas).map(([id, area]) => (
            <div key={id}>
              <strong>
                {id === 'b'
                  ? 'Bravo · both stops'
                  : id === 'cNorth'
                    ? 'Charlie North'
                    : 'Charlie South'}
              </strong>
              <small>
                To church {area.waiting.toHome.toFixed(1)} · {area.incomingCars ?? 0} cars incoming
                · home → lot {area.waiting.toLot.toFixed(1)} · {area.committed.buses} buses
                committed · priority age {Math.floor(area.ageSeconds)}s
              </small>
            </div>
          ))}
          <small>
            Last decision: {trafficStats.shuttleDemand.lastDecision.area ?? 'hold at home'} ·{' '}
            {trafficStats.shuttleDemand.lastDecision.reason}. Quiet-area safeguard is dispatch
            priority, not a guaranteed road travel time.
          </small>
        </section>
      )}
      <label>
        Active buses (manual mode)
        <select
          disabled={scheduled}
          aria-label="Active shuttle count"
          value={shuttles.activeCount}
          onChange={(e) => onUpdateShuttles({ activeCount: Number(e.target.value) })}
        >
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label>
        Boarding time
        <select
          aria-label="Shuttle boarding variation"
          value={shuttles.randomDwell !== false ? 'random' : 'fixed'}
          onChange={(e) => onUpdateShuttles({ randomDwell: e.target.value === 'random' })}
        >
          <option value="random">Varied · 30–60 seconds per stop</option>
          <option value="fixed">Fixed dwell for debugging</option>
        </select>
      </label>
      {shuttles.randomDwell === false && (
        <label>
          Fixed stop dwell (simulation seconds)
          <input
            aria-label="Shuttle stop dwell"
            type="number"
            min="0"
            max="120"
            value={shuttles.dwellSeconds}
            onChange={(e) =>
              onUpdateShuttles({
                dwellSeconds: Math.max(0, Math.min(120, Number(e.target.value) || 0)),
              })
            }
          />
        </label>
      )}
      <small>
        Buses stage independently across the first ~90 seconds. Home dispatches are at least 15
        seconds apart; each pickup samples a new boarding delay. Seeded variation repeats on replay,
        without forcing simultaneous returns.
      </small>
      <div className="shuttle-roster">
        {(trafficStats.shuttles ?? []).map((bus) => (
          <div key={bus.id}>
            <strong>Bus {bus.number}</strong>
            <span>
              {bus.dwellStop && bus.stationary ? bus.dwellStop : (bus.stop ?? 'A home')} ·{' '}
              {bus.phase}
              {bus.trafficWaiting ? ' · safe traffic hold' : ''}
            </span>
            <small>
              {bus.trips} round trips · {bus.visits} remote stops
              {bus.stationary && bus.dwellRemaining > 0
                ? ` · ${Math.ceil(bus.dwellRemaining)}s boarding / staging`
                : ''}
              {bus.yieldReason ? ` · ${bus.yieldReason.replaceAll('-', ' ')}` : ''}
            </small>
          </div>
        ))}
      </div>
      <small>
        Dispatch updates at home and the shared C roundabout, never mid-leg. Assigned buses count
        against demand; zero unmet demand holds at home. Breaks and occupied-road controls still
        apply. Estimates reset with the scenario/carry; actual passenger boarding and onboard counts
        are not modeled.
      </small>
    </section>
  );
}
