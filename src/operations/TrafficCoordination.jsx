import React from 'react';

export default function TrafficCoordination({ trafficStats }) {
  return (
    <details className="coordination-details">
      <summary>Live traffic coordination</summary>
      {trafficStats.equityClayStop && (
        <section className="traffic-control" aria-label="Equity Clay three way stop">
          <strong>Equity / Clay · three-way stop</strong>
          <p>
            {trafficStats.equityClayStop.reason} · {trafficStats.equityClayStop.waiting} at stop
            lines · {trafficStats.equityClayStop.cleared} cleared
          </p>
          <small>
            Two-way approaches. Stop before entering; release one movement after the intersection
            clears. Shuttle → departure → arrival priority.
          </small>
        </section>
      )}
      {trafficStats.cEntrance && (
        <section className="traffic-control" aria-label="Lot C entrance shuttle priority">
          <strong>Lot C entrance · shuttle turns</strong>
          <p>
            {trafficStats.cEntrance.reason} · {trafficStats.cEntrance.held.length} cars held
          </p>
          <small>
            Hold conflicting cars before a shuttle turns. Vehicles already in the turn and cars
            ahead of the bus keep clearing. Separated movements continue together.
          </small>
        </section>
      )}
      {trafficStats.cRoundabout && (
        <section className="traffic-control" aria-label="Lot C roundabout marshal">
          <strong>Lot C roundabout · four-way marshal</strong>
          <p>
            {trafficStats.cRoundabout.reason} · {trafficStats.cRoundabout.held.length} held
          </p>
          <small>
            Shuttles → exits → entries. Separated lanes continue together; occupied movements clear
            first.
          </small>
        </section>
      )}
      {trafficStats.northernRadio && (
        <section className="traffic-control" aria-label="Northern positions radio coordination">
          <strong>Northern positions · shared walkie-talkie</strong>
          <p>
            {trafficStats.northernRadio.reason} · {trafficStats.northernRadio.heldCars} cars held ·{' '}
            {trafficStats.northernRadio.clearingCars} clearing
          </p>
          <small>
            B exit #62 · C entrance #63 · C shuttle exit #64. All receive the same fleet locations
            and release status. Hold only conflicting Corporate traffic; occupied space clears
            first.
          </small>
          <small>
            Clay{' '}
            {trafficStats.northernRadio.clayBackedUp
              ? 'backed up · feeder diversion'
              : 'flowing · normal B routes'}{' '}
            · {trafficStats.northernRadio.diverted} B cars diverted before launch. Provisional
            batches of {trafficStats.northernRadio.batchSize}; no moving-car route swaps.
          </small>
          <small>
            Radio fleet:{' '}
            {trafficStats.northernRadio.shuttles
              .map((bus) => `Bus ${bus.number}: ${bus.circuit ?? 'home'} / ${bus.phase}`)
              .join(' · ')}
          </small>
        </section>
      )}
      {trafficStats.blackPermitControl && (
        <section className="traffic-control" aria-label="Black Permit shuttle release">
          <strong>Black Permit · shuttle release</strong>
          <p>
            {trafficStats.blackPermitControl.reason} ·{' '}
            {trafficStats.blackPermitControl.waitingBuses} buses approaching ·{' '}
            {trafficStats.blackPermitControl.heldArrivals} arrivals ·{' '}
            {trafficStats.blackPermitControl.heldDepartures ?? 0} departures held
          </p>
          <small>
            Temporarily stop feeder → Corporate → B/C arrivals while buses exit Black Permit.
            Release after the bus clears; occupied crossings clear first.
          </small>
        </section>
      )}
      {trafficStats.corporateExitJunction && (
        <section className="traffic-control" aria-label="Corporate feeder officer">
          <strong>Feeder / Corporate officer · 10 out / 5 in</strong>
          <p>
            {trafficStats.corporateExitJunction.reason} ·{' '}
            {trafficStats.corporateExitJunction.waitingExit} exits /{' '}
            {trafficStats.corporateExitJunction.waitingEntry} entries ready
          </p>
          <small>
            Shuttles first. Count actual clearances when both queues compete; an empty approach
            never delays the other. Corporate stays two-way, with no whole-road alternating hold.
          </small>
        </section>
      )}
      {trafficStats.feederOfficer && (
        <section className="traffic-control" aria-label="Feeder exit officer">
          <strong>Lot A feeder exit officer</strong>
          <p>
            {trafficStats.feederOfficer.reason} · {trafficStats.feederOfficer.waitingExit} A exits
            waiting · {trafficStats.feederOfficer.passed} cleared
          </p>
          <small>
            Provisional exit-merge placement. Shuttles have priority; vehicles already in the merge
            clear first. Lot A Main Position remains a separate five-car controller.
          </small>
        </section>
      )}
    </details>
  );
}
