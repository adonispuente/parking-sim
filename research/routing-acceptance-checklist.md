# Arrival and departure review checklist

Confirmed by Commander:
- Feeder is northbound only, also after an outbound vehicle merges.
- General feeder allocation: A then B then C; two arrival streams can feed C when A/B are full.
- Black Permit is for badge holders and shuttle buses only.
- A public and Black Permit departures go to the feeder.
- B west-access departures go to the feeder; B north and C departures go east toward Equity.

Review the ten-car demo with empty lots, A full, A+B full, badges 100%, and shuttle vehicles 100%. Compare each crossing with images/HopeCityLayoutVectors.json. Demo dwell is an animation parameter, not an operational parking duration. Initial parked occupancy must not unexpectedly depart.

Do not approve routing based solely on a production build. Check finite coordinates, continuous arrival/departure endpoints, labeled access crossing, no southbound feeder segment, and occupancy conservation. Geometric registration is approximate and must report landmark residuals; existing approved map geometry must not be warped to hide disagreement.

Known out of scope: physical stalls, bus capacity/boarding, right-of-way, calibrated speed, full merge/collision handling. Equity fallback preference beyond C remains provisional.
