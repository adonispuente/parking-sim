# Corporate Drive two-way geometry — diagnosis (CLAUDYBEAR, 2026-11-06)

Status: DIAGNOSIS milestone. Read-only probe; no simulation source changed for this step.
Commander: "remember, corporate drive is a two way street, as is equity".

## Probe
`node research/claudy-two-way-width-probe.mjs` -> `research/claudy-two-way-width-probe.log` (exit 0).
For points on `Departure · bWest · bSouth` between #61 (486,370) and #60 (268,514), measured along the lane normal with the simulator's own `onStreet` (pavement polygons 54/55/56) and `avoidsObstacles`.

## Findings
| px (approx) | paved width px | opposing shuttle lane offset px | gap world |
|---|---|---|---|
| (469,387) | 51 | -10.5 | 1.16 |
| (455,420) | 43 | -10.6 | 0.87 |
| (437,451) | 41 | -12.1 | 1.00 |
| (405,493) | 50 | -10.1 | 0.84 |
| (379,518) | 53.5 | -8.5 | 0.70 |
| (346,528) | 54.5 | -11.1 | 0.93 |
| (311,535) | 52.5 | -12.1 | 1.00 |

- Paved Corporate Drive is 40–54 px (3.3–4.5 world units) wide along the entire conflict stretch. No obstacle within 30 px either side.
- Opposing lanes are 8.5–12.1 px apart because `KEEP_RIGHT_PX = 6` (`src/traffic.js:21`) puts each direction only 6 px off-centre (12 px = 0.99 world total).
- Simulator body clearance (`src/sharedTraffic.js:197`): car/car 0.80 world (9.7 px), bus/car 0.915 (11.1 px), bus/bus 1.03 (12.5 px). A 12 px separation is at or below bus clearance before any curve wobble, so the model cannot pass opposing vehicles.
- At (275,537)/(257,538) the shuttle offset is ~0: that is the real #60 junction where the shuttle turns, a genuine crossing, not a two-way defect.

## Conclusion
The road is physically two-way with ample room. The "single-file" behaviour comes from the model's lane offset being narrower than vehicle clearance. The alternating valve in `src/corporateDriveOperators.js` treats that symptom and costs final-service shuttle trips (103 -> 78). It does not satisfy the Commander's two-way requirement.

## Implication for repair (plan to follow, not yet applied)
Widen the keep-right offset LOCALLY on Corporate Drive, bounded by measured paved room (existing `room-3` guard), so opposing lanes clear bus/bus with margin. Then restrict the valve to measured residual conflicts only, keeping the three separate operators for passage control and priority. Equity two-way check is still to do.
