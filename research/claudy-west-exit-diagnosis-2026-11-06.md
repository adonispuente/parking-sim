# West B exit deadlock — diagnosis (CLAUDYBEAR, 2026-11-06)

Status: DIAGNOSIS milestone. No simulation source or tests changed.

## Reproduction
`node research/claudy-west-exit-diag.mjs eleven 7200` -> `research/claudy-west-exit-diag-eleven.log` (exit 0).
- Cycle forms at sim t = 1249.1 s and never clears (end: 104/1224 entered, same as ledger).
- Chain: 422 -> shuttle-1 -> 511 -> 422.
  - 422 departing bSouth, px (389.8,505.8), heading 132 deg (southwest), dist 119.0/152.1, `clear-occupied-conflict` to shuttle-1.
  - shuttle-1, `Shuttle · b · leg 1 → bSouth`, px (383,526.3), heading -44 deg (northeast), dist 34.3/103.5, `clear-occupied-conflict` to 511.
  - 511 departing bBanana, px (414.4,486.2), heading 141 deg, `safe-following` behind 422.
- 422 and shuttle-1 are HEAD-ON on the same stretch. Neither can reverse; the cycle breaker in `sharedTraffic.js:201-232` can release only a vehicle whose swept body is clear, and here neither body is clear.

## Root cause
`node research/claudy-west-exit-separation.mjs` -> `research/claudy-west-exit-separation.log` (exit 0).
- The B-west departure lanes and the inbound B shuttle lane run anti-parallel 0.69-1.00 world units apart (8-12 source px) for ~20 world units, from about px (464,401) to (257,538), and cross at about px (266,537).
- The simulator's own body clearance for bus vs car is 0.44 + 0.325 + 0.15 = 0.915 (`sharedTraffic.js:197`). Over that stretch the two directions therefore cannot pass each other in the model: it behaves as a single shared lane carrying opposing traffic.
- No staffed control governs entry to that stretch, so a southbound departure and a northbound shuttle can both enter it and meet head-on. The valve the Commander described does not exist in code: `corporateOfficer` (#59) and `permitOfficer` (#60) are labelled "visual only" (`clearImageSource.js:40`) and nothing references them operationally.

## Staff positions on Corporate Drive (map + source)
Map (`images/Clear Image.png`) shows Corporate Drive as the curved road; polygon #56. Staff points on its west/south stretch:
- #59 Police Officer, px (26,538) — west end, where Corporate Drive meets Feeder Road.
- #60 Police officer, px (268,514) — middle, where B/C shuttles and the Black Permit turn join/leave.
- #61 Lot B Entrance Position, px (486,370) — east end of the shared stretch.
Identity mapping of the Commander's "three north-side Corporate Drive people" to #59/#60/#61 is my inference from the map, not a Commander statement.

## Lanes through those points
`node research/claudy-corporate-lane-inventory.mjs eleven 1300` -> `research/claudy-corporate-lane-inventory-eleven.log` (exit 0).
- Southwest-bound through #61 then #60: `Departure · bWest · bSouth/bBanana` (continue past #59), `Shuttle · b · leg 3 → home`, `Shuttle · cNorth/cSouth · leg 3 → home`.
- Northeast-bound through #60 then #61: `Shuttle · b · leg 1 → bSouth`, `Shuttle · cNorth/cSouth · leg 1 → cRoundabout`, arrivals `Feeder → B west`, `Feeder → C staffed entrance` (enter at #59).
- `Feeder → A Black Permit` passes #59 and turns at #60.

## Next step
Measure opposing-lane separation on the #59-#60 stretch, then save `research/claudy-west-exit-plan-2026-11-06.md` before any source change.
