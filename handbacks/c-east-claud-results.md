# C East (#64) gridlock — CLAUD repair results (2026-11-09)

Status: repair implemented and verified by CLAUD. SPARTAN's independent acceptance is still pending. Shuttle detours are NOT implemented.

## Junction and cause
- Junction: position #64 [1247.16, 74.36], controlled by the C exit radio in `src/northernCorporateControl.js`. This is not the three-way Equity/Clay stop; `equityClayStop.js` was not changed.
- The radio held car 1176 for shuttle-3, while shuttle-3 was itself waiting on 1176 through this chain: shuttle-3 → 1039 (safe-following) → 546 → 1186 (occupied-conflict) → 1176.
- Original lines 92-106 only released the direct leaders of already-clearing cars. `sharedTraffic.js:212` never breaks a cycle through a `holdForNorthern` car.
- `campusSimulation.js:243-244`: the radio's prepare step runs before `advanceSharedTraffic`, so the previous tick's `yieldingTo` links are readable.
- This is an admission dependency cycle. It is not a geometry overlap and not a dispatch defect.

## Repair
In `src/northernCorporateControl.js` only:
- The radio walks each release bus's previous-tick `yieldingTo` chain (at most 40 hops, cycle-safe).
- Any car on that chain the radio is holding is released and treated as admitted traffic that clears first.
- New diagnostic field: `northernRadio.dependencyReleased`.
- All other conflicting cars on both approaches stay held.

Unchanged: conflict geometry, tail release, B five-car diversion, sharedTraffic, M1, M2.

New test file: `tests/c-east-radio-dependency.test.js` (3 tests).

## Verification (all run this pass)
| Check | Result |
|---|---|
| `c-east-radio-dependency` + `northern-radio` (includes the real 40-min eleven handoff) | 13/13 pass |
| Exact reproduction: .05 step, badge 5, demand, C300 | 0 stalled at every sample 10:10–11:10. C departures 285 at 10:40 and 300 at 10:45 (before: frozen at 283). Equity parked 47/47 (before: 1/1). Trips 14/15/15/14/14 (before: frozen 8/9/7/9/10). |
| Rule engaged? (`count-releases.mjs`) | Yes. First release at 10:38:38, over 6 ticks, 2 cars. Max held 11 (before: 80). |
| .05 matrix, demand/fixed × C103/300/403 | All clear every C departure, with 0 routing issues. Demand C403 has a transient 13-car stall at 10:20 that clears by 10:25; the pre-fix run had a transient stall of 2 cars there. |
| Full suite | 329 tests, 317 pass, 12 fail. The 8 standing failures match the M2 baseline exactly. The other 4 are in QWEN's in-progress `shuttle-demand-independent.test.js`, which was last modified at 14:27, before this edit, and does not reference the radio. That file runs 7 pass / 4 fail, the count QWEN reported mid-work. No new failure was attributable to this change; QWEN's file was not re-run against pre-fix source. |
| recorded-rewind | Pass |
| Build | Pass, with the existing chunk-size warning |
| Source hashes | Only `northernCorporateControl.js` changed |

## Not done
- **Browser observation** and **SPARTAN acceptance**.
- ~~Equity→Corporate turn test~~ — superseded: proven in the Addendum below.
- **Shuttle detours:** not implemented. Superseded finding in the Addendum: #29 is the only traced C return, so a detour needs a Commander-confirmed route first.

## Risks
- **Previous-tick `yieldingTo`:** the fix depends on links from the previous tick. Rewind tests pass, but browser seek is unobserved.
- **Released car crosses first:** a released car may cross ahead of the bus. This is intended, and body rules still apply.
- **Calibration:** radius 9 and conflictWidth .95 remain provisional.

## Evidence
`research/runs/c-east-claud/` contains:
- `plan.md`
- `after/` and `after-matrix/`
- `count-releases.mjs` and its log
- `full-suite.log` and `fail-names.txt`
- `build.log`
- source hashes from before and after the change

## Addendum (same day) — Equity-turn concurrency proven; detour status settled

### Equity → Corporate concurrency at #64 (Commander's two-way requirement)
Probe `concurrency-probe.mjs` (log: `concurrency-probe.log`), exact scenario (11AM, C300, .05, badge 5, demand), within 9 world units of #64:
- Arrivals and C exits were both present for 818 ticks; **both moving in 625 (76%)**.
- Cross-flow yields in only 23 ticks, all physical: exits→arrivals `clear-occupied-conflict` 15; arrivals→exits `departure-priority` 4, `clear-occupied-conflict` 4.
- **0** cross-flow yields attributable to the radio without a releasing C bus.
- Closest simultaneously moving cross-flow pair: 1.134 world units (car/car body clearance .80).
- 300/300 C departed, 0 routing issues.
Conclusion: the turn and the exits already run concurrently; no source change was needed for this requirement.

New regression: `tests/c-east-equity-concurrency.test.js` (production path; asserts overlap >200 ticks, both-moving ≥60%, no-bus cross-yields ≤10%, only physical yield reasons, gap >.8, all 300 exit).

### Shuttle detours
`src/shuttleRoutes.js:26-32`: source trace **#29 is the only traced C return**; both C North and C South legs end on it. No second drivable return exists in the source map. Implementing a detour would require a new traced path (or a deliberate reversal of #30), which is a Commander layout decision. **Status: pending, blocked on that decision.** With the #64 repair, no C bus stalled in any matrix run, so this is resilience, not a live jam.

### Re-verification this pass
| Check | Result |
|---|---|
| concurrency + dependency + northern-radio tests | 14/14 pass |
| Full suite (`node --test tests/*.test.js`) | 330 tests, 318 pass, 12 fail; failing names identical to the post-repair run (`fail-names-2.txt`) |
| Build | pass (`build-2.log`), existing chunk warning |
| Source | all 46 files in `source-after.sha256` unchanged; no app source edited this pass |
