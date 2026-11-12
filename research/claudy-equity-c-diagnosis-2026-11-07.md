# CLAUDYBEAR — F1 shuttle drop, Corporate-on-F1 gated measurement, Equity/C head-on lock (2026-11-07)

Status: DIAGNOSIS ONLY. No src/ or tests/ change this run. Live source verified against
`claudy-feeder-middle-after.sha256` (77 entries, 0 mismatches) after all work.
All runtime comparisons used throwaway copies of src/ under research/claudy-tmp-*; both were deleted after use (confirmed absent).

## 1. F1 shuttle-trip drop (final 289 -> 282, eleven 58 -> 54)
- No shuttle leg touches Feeder (shape 54): `claudy-feeder-shuttle-probe.mjs` -> 0 legs on Feeder. F1 cannot crowd shuttles geometrically.
- bWest departure geometry is unchanged off Feeder except a <=4.7 px transition at the Feeder edge (37.5, 527.8): `claudy-feeder-offlane-diff-probe.mjs`.
- Final-service shuttle stopped time 1,445 s -> 1,946 s (`claudy-shuttle-delay-probe.mjs`, before = pre-F1 traffic.js copy, after = live). The increase is shuttles yielding to `Departure · bWest` at cells (540,260) and (540,320): the Corporate #61 shared stretch, not Feeder.
- Departure completion timing is identical at 60 s resolution for a/b/c (50/90/100 %: a 1080/3180/4500, b 1260/3540/5280, c 1200/3480/4860) in both (`claudy-departure-timing-probe.mjs`).
- Conclusion: the drop is a timing knock-on through the Corporate #60/#61 stretch (different interleaving), not an F1 geometry defect. F1 gives no departure-speed benefit in final; its benefit is eleven entry +20 and west 3 -> 2. Cost: ~2.4 % final shuttle trips. Acceptance remains SPARTAN's call.

## 2. Gated measurement: parked Corporate own-occupant release ON TOP of aSouth + F1 (throwaway copy, not applied)
Runner `spartan-continuation-traffic.mjs enabled`, raw `claudy-corp-on-f1-traffic.jsonl`:

| Service | Retained (F1) | Corporate release on F1 | Corporate release on Main-only (rejected 11-06) |
|---|---|---|---|
| Nine | 950/950, 0 stalled, west 0 | 950/950, 0, west 0 | 950/950, 0, west 0 |
| Eleven entered | 251 | **443** | 258 |
| Eleven stalled | 73 | 158 | 150 |
| Eleven west | 2 | 3 | 7 |
| Eleven departed a/b/c | 360/298/103 | 360/305/**64** | 244/–/– (A) |
| Eleven shuttle trips | 54 | **83** | – |
| Final | 300/300, 0, west 0, trips 282 | 300/300, 0, west 0, trips 286 | 300/300, 0 |

- The aSouth and F1 fixes now matter: the Lot A South 299/1150 jam and the Feeder 416/1172 jam do NOT appear. The Feeder mouth (F2) does not appear either.
- All 158 eleven stalls trace to ONE cycle (`claudy-corp-on-f1-eleven-all-stalls.json`; probe chain cap of 40 splits long queues into apparent separate "terminals"; their heads all chain back into this queue).
- Still not acceptable: stalled 73 -> 158, C departures 103 -> 64, west 2 -> 3. Release stays PARKED.

## 3. Equity/C lock (same lock as 887/1207/599 on 11-06; now 700/1029/750)
- 700 `Departure · bNorth · bNorth` (1032.5,1096.9) yields clear-occupied to 1029 `Arrival · Equity entrance/exit 2 -> C staffed entrance` (1032.7,1098.7); 1029 yields clear-occupied to 750 (1022.3,1065.8) queued behind 700; 750 safe-following 700. 11-06: 887 cWest dep (1030.8,1097.1) / 1207 same arrival (1032.7,1099.4) / 599 bNorth (1022.3,1066.1). Same place, same structure.
- `claudy-equity-c-opposing-probe.mjs`: on (1032.6,1105.7) -> (1040.1,1075.3) the e2CWest arrival and bNorth / cWest / cEast departures run head-on (alignment -1) at 0.03-0.12 world separation vs 0.9 limit, 12-13 samples (~32 px).
- `claudy-equity-c-pavement-probe.mjs`: (1032.6,1105.7), (1033.5,1098), (1035,1090), (1037,1083) are on NO mapped polygon (onStreet false, mapped pavement false, inside none of 65 shapes), 29/21/13/6 px from Equity Drive (shape 55). keepRight only offsets on-street points, so both directions keep the same centreline there. That is a head-on stalemate the existing cycle-breaker correctly refuses to waive (real body overlap + same-lane following).
- This is a map-coverage gap on the Equity entrance/exit 2 connector into C, not a collision-rule bug.

## Fix options (none implemented)
A. Two-way connector: treat this connector as two-way pavement and offset each direction (e.g. TWO_WAY keep-right on these points), with the obstacle check; needs the real driveway to fit two cars.
B. Single-lane connector with alternating control: one direction at a time on the ~32 px stretch, exiting traffic first (Commander's exit-priority rule), arrivals hold before the connector until it is clear.
C. Commander adds/corrects the connector polygon in the traced JSON; then the existing keep-right logic applies without special code.
Which one is right depends on whether Equity entrance/exit 2 into C is wide enough for two-way traffic in real life. Question asked of the Commander.

## Next (owner CLAUDYBEAR)
1. Implement the chosen Equity/C connector option + production-path coverage BEFORE checks.
2. Then re-measure the parked Corporate release on top (gated, throwaway copy first).
3. F2 Feeder keep-clear stays deferred: not exposed even with Corporate released.

Probes/raw: `claudy-feeder-shuttle-probe.*`, `claudy-feeder-offlane-diff-probe.*`, `claudy-shuttle-delay-probe.mjs` + `claudy-shuttle-delay-final-{before,f1}.{json,log}`, `claudy-departure-timing-probe.mjs` + `claudy-departure-timing-final-{before,f1}.json`, `claudy-corp-on-f1-{eleven,final}-all-stalls.json`, `claudy-corp-on-f1-traffic.jsonl`, `claudy-equity-c-opposing-probe.*`, `claudy-equity-c-pavement-probe.mjs`.
