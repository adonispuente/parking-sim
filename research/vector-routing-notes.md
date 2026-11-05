# Vector-route registration and uncertainty (2026-11-04)

Sources: `images/HopeCityLayoutVectors.json` (735 × 566), `research/Map with streets.json` (1698 × 1378), and visual inspection of `images/HopeCityLayout.png`. The PNG is an unlabeled aerial image; the JSON supplies access labels. Approved `src/tracedMap.js` and map geometry were not changed.

## Registration

The helper uses an **approximate building-landmark fit**, `newX ≈ .415 × oldX`, `newY ≈ .375 × oldY`, with zero origin translation. These are not the width/height ratios (.433 and .411). Corresponding building corners, old → new, predicted new and residual (actual minus predicted, new-image pixels):

| Landmark | Old | New | Residual (x,y) px |
|---|---:|---:|---:|
| A northwest-ish corner | (214.43,445.64) | (89.95,167.01) | (+0.96,-0.11) |
| A lower corner | (295.87,502.10) | (130.87,190.99) | (+8.08,+2.70) |
| B northwestern corner | (906.03,324.29) | (376.46,119.12) | (+0.46,-2.49) |
| B northeastern diagonal corner | (975.48,364.22) | (404.91,133.86) | (+0.09,-2.72) |
| C upper-left | (1271.56,317.14) | (527.63,119.14) | (+0.43,+0.21) |
| C upper-right | (1533.71,324.34) | (627.85,123.07) | (-8.64,+1.44) |

The corner fit is nonuniform (up to roughly 9 new pixels in this sample). This affine approximation is **not a survey registration**: images/crops and/or tracing differ locally. Access corridors need visual alignment review before operational use. Vector coordinates convert back to old trace pixels, then through existing `traceWorldPoint` (both world axes use old image width). No approved map geometry is replaced.

## Access/routing interpretation

Entrance/exit polygons are sampled at three paired-edge stations, never by polygon centroid; index checks fail loudly if a label or station disappears. Public A entrance near north feeder and separate public exit farther north; A badge/shuttle permit throat near Corporate; B west entrance and separate west feeder exit; B north exit via Corporate; C west north entrance and exit plus east north exit. C east **entrance is not separately labeled** in this vector file, so east-arrival path reverses the labeled `Lot C  exit` corridor as a provisional assumption. The parking maneuvers joining distinct entrance/exit throats are untraced straight connectors, not asserted aisle permissions. B north likewise reverses labeled north exit for arrivals. B west outbound bends toward feeder via Corporate: its exact approach/merge must be visually verified. Corporate-to-Equity exit and Equity-to-C arrival paths share an estimated junction, not a traced turning lane.

A public and permit departures and B west departures follow feeder north; B north/C departures head to the right-side Equity corridor and then image-south. They **do not** traverse the bottom road westward. The legacy `makeLanes()` exposes an unused southbound lane and is not used by campus traffic. Equity fallback remains C→B→A, an existing unconfirmed policy. Arrival `exited` means arrival completed; `departed` is actual lot-exit completion. Preloaded occupancy never auto-departs. Actual car departures start after a configurable illustrative dwell; neither individual stalls nor departure demand is modeled. Shared-geometry merge/collision priority is not implemented.

No browser visual review or build/focused numeric run was available **to this delegated worker**. The lead reports a successful build after a separate Scene asset-import repair, but the lead must run a fresh build after these route changes and a runtime import: bundle success alone does not evaluate the module. Numerical checks should test mapped old/new landmark errors and each access station, route continuity between arrival endpoint and departure start, feeder y decreasing after merge, outbound headings, A/B-full feeder allocation and simultaneous feeder/Equity C allocation. Execute in the project root `npm run build` followed by `node --input-type=module -e "import('./src/traffic.js').then(m=>console.log(m.createCampusTraffic().lanes.map(l=>[l.name,l.length])))"` and simulation probes.
