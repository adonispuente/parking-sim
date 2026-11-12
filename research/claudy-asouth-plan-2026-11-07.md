# CLAUDYBEAR aSouth 299/1150 — plan (2026-11-07)

Baseline: retained Main-setback revision; `research/claudy-main-hold-back-after.sha256` 74/74 OK before change. Pre-change fingerprints: `research/claudy-asouth-before.sha256`. Backup: `research/claudy-backup-asouth/`.

## Diagnosis (read-only probes, zero sim steps, production-built lanes)
- Probe: `claudy-asouth-lock-probe.mjs` -> `.json`. Arrival 1150 held exactly at its Main stop (d=101.22, px 198.4,86). Departure 299 is the ADMITTED car at its own stop (d=3.99, px 208.4,101.7), unheld.
- 299's look-ahead chord (210.4,102.3)->(217.7,92.3) cuts inside the departure bend at (216,104) and passes 0.896 from 1150's front bumper (< CONFLICT_WIDTH 0.9). Held 1150 counts as occupying -> 299 yields to a car the batch holds -> lock. True lanes are 0.94 apart: a chord artifact on a thin margin.
- Sweep (`claudy-asouth-stop-sweep-probe.mjs`): all 26 Main-inbound arrival lanes x both departures, departures slid over their admitted path. Arrival hold 1.7: min 0.882 (aSouth-bound), 0.907 (aNorth-bound). 2.2: 0.979.
- Reverse (existing aSouth TODO): aSouth departure held at 1.7 sits on the admitted aSouth arrival path (gap 0). Would surface as soon as the forward lock clears.
- aSouth departure hold sweep incl. full arrival lane (`claudy-asouth-departure-back-probe-full.mjs`, `-fine.json`): 3.0 -> 0.893 (near Main, eA lanes); 3.05-3.25 clear; 3.2 best (0.956); 3.3 -> 0.894, 3.5 -> 0.699 (arrival final aisle d~139.9). North's 3.0 does NOT transfer.

## Change (bounded, existing stop-line mechanism only)
`src/lotAControl.js`: `MAIN_DEPARTURE_HOLD_BACK = { aNorth: 3.0, aSouth: 3.2, aMain: 2.2 }`. Production attaches arrivals as `'aMain'` (campusSimulation.js:53, :142). No change to CONFLICT_WIDTH, windows, clearances, held-car rules, batch size or routes.

## Coverage
- New `tests/lot-a-south-held-chord.test.js`: chord-rule checks both directions, all 26 arrivals, full arrival lane; guards that old 1.7 locks and that 3.0 and 3.5 both lock.
- `tests/lot-a-main-held-departure.test.js`: arrival-stop test now asserts 2.2 applied, base mainStopBack unchanged.
- `tests/lot-a-main-median.test.js`: held-arrival body/queue checks read the applied stop (mainHoldBack 'aMain').

## Gates after change
Focused, targeted, full (vs retained 28 failing names), build, nine/eleven/final same map with full stall capture. Reject and restore from backup if eleven or final regress or any new failing name.

## Known limits
Margins thin (0.056 / 0.079 over 0.9). `tests/clear-image-runtime.test.js` holdPoint still reads base mainStopBack. Moving arrivals back 0.5 shifts queue tails ~6px further from Main.
