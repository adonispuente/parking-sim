# Stage 1R-d: Lot A South shared-centreline split lanes (CLAUD, 2026-11-11). Isolated trial released to SPARTAN.

Replaces Stage 1R-c (`asouth-1r-c-split-lanes-claud.md`, artifact 551bf25b), rejected by SPARTAN in
`research/runs/asouth-split-644f/results.md` (10.17 px U-turn gap, 9 drivable failures, 16 pavement-margin failures).
Commander decisions in force (do not re-ask): aisle carries two lanes side by side; both built lanes may shift;
the two large rows are grass + median and are never crossed; departures go south, U-turn, pass Main position.

## Why 1R-c failed (measured, read-only)
1. exitpaths-16 crosses arrival #0 eleven times. Offsetting each lane from its OWN trace adds unevenly where the
   traces diverge, so the nominal 12.5-14.5 px split shrank to 10.17 px at the U-turn.
2. The drawn U-turn is a tight V hugging the median nose [84-88,284-294]. There is no room for two lanes there,
   but rows y 296-316 south of the nose are open pavement (`research/runs/asouth-1r-d-claud/uturn-map.txt`; final lanes drawn in `uturn-lanes-final.txt`).
3. `keepRight()` re-centres onStreet points; on split lanes it collapses separation near A South staging
   (to 9.73 px, 9 samples on the final geometry) - the same failure the code already documents and exempts at Main.

## Design
- ONE centreline M from A South staging to the Main anchor (`pointAt(57)`), in exit-16 travel order:
  staging -> west leg south -> U-turn -> east leg north -> Main. Legs = mean of the two drawn traces with
  continuous pavement re-centring; U-turn = circular arc, centre C=[84,290], radius 16, around the median nose.
- Stored as generated data, not computed from the PNG at runtime:
  `research/runs/asouth-1r-d-claud/centreline.json` (193 points, exact staging/Main terminals),
  sha256 47df728fc5fc666322f97298d0bc21b36b4e9352898d555038bd81b9e10f6c04,
  generator `arc2.mjs centre 84 290 16` (sha256 d1736da1...b18d).
- Lanes: resample M at 1 px; tangent from samples i+-4; n=[-ty,tx] (right of travel, image y down);
  offset o = s*h*taper(i), h=6.2 px, taper(i)=min(1,min(i,N-1-i)/18).
  DEPARTURE (out:a:aSouth loop part) = s=+1 (outer); ARRIVAL (in:a:aSouth / in:eA:aSouth loop part) = s=-1 (inner), reversed to arrival order.
- keepRight exemption (required, not optional): skip generic re-centring for indices between the exact
  A South staging vertex (`drivingPrefix(0).at(-1)`, match < .001 px) and the Main anchor, only when a route
  contains both exact vertices. Exact diff: `research/runs/asouth-1r-d-claud/keepright-exemption.diff`.

## Pre-trial evidence (scratch only; live src unchanged)
| check (gate = 644f rules) | result |
|---|---|
| lanes rebuilt from stored centreline, raw | worst 11.96 px (gate T 10.886), 0 sep / 0 pave / 0 clear failures, min pavement margin 2.5 px |
| same after scratch keepRight (with exemption) | identical: 11.96 px, 0/0/0 |
| same after LIVE keepRight (no exemption) | FAILS: 10.53 px, 3 samples - hence the exemption |
| arc2 gate on rebuild | 11.65 px, 0/0/0 |
| neighbour sweep C/R +-2 px / +-1 | 4 of 4 neighbours pass, 11.65 px |
| exemption blast radius over 64 live routes | keepRight output changes ONLY in:a:aSouth, in:eA:aSouth, out:a:aSouth |
| without pixel re-centring | fails pavement margin (1.5 px at [77,270-273]) - so use stored data |
Live hashes at writing: src/traffic.js 0057665896fd...a8, src/parkingRoutes.js 70fdad8ee7f4...d5.

## SPARTAN: isolated trial (copy of project; never edit live until promotion)
1. Precheck: live src/traffic.js and src/parkingRoutes.js hashes match the values above; 121-file/64-route baseline exact. Drift -> stop, report.
2. Add `src/aSouthCentreline.js`: deep-frozen export of centreline.json points + provenance (generator, sha256, C, R). No PNG reads.
3. In `src/parkingRoutes.js`, replace only the A South loop part (staging<->Main) of the three routes with the built lanes.
   Everything before Main on arrivals and after Main on departures stays byte-identical. Remove the generic
   staging->Main internalPath chord (~[164,88]->[204,100]) for aSouth. No auto-connector fallback: if a lane
   segment fails `clearSegment` or `clearSegment(..,drivableAllowed)`, throw.
4. Apply the keepRight exemption exactly as in the diff.
5. Geometry gate on BUILT (keepRight) routes: separation >= .9/WORLD_SCALE outside 18 px terminals, every
   segment passes both clearSegment checks, pavement margin >= 2 px. One permitted adjustment: h in [6.0, 6.6]
   (6.6 measured 12.33 px, 0/0/0; 7.0 fails pavement). Still failing -> stop, report; do not squeeze or cross the median.
6. Combine with the feeder-officer exit-room guard (revision 2 / 33a3 evidence). Route and guard are one change.
7. Trial checks: default 11:00 and South-first services each past 12:15 let-out (>= 9000 s) - no Main-gate or
   loop lock, report A South departures, max wait, any lock time/ids (South-first previously locked 10:38:50, dep 251 vs arr 1000);
   focused A/Main tests incl. tests/lot-a-main-median.test.js; npm run build; npm run layout:check;
   browser Top view with one rewind; 121-file integrity (only permitted files changed); other 61 routes byte-identical.
8. Promote only if every check passes. On promotion: median-crossing chord gone, exit 16 marked "in traffic use",
   display of exit 16 coordinates unchanged. Otherwise live stays as is and you hand back evidence.

## Riskiest assumption and kill-test
Assumption: separate lanes remove the head-on conflict, so the South-first lock does not move to the 18 px
terminal tapers (staging, Main) where the lanes rejoin. Kill-test: step 7 South-first run past let-out. A lock
there fails the trial; I then redesign the terminal (staggered staging), not the loop.

Out of scope: cleanup (parked), individual parking, other lots.
