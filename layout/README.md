# Layout overlay (M3)

`images/layout-overlay.json` is a second LabelMe file drawn on the same picture as the
map (`images/Clear Image.png`). The original 65-shape map file is never edited: its shapes
are bound by position, and adding one breaks loading.

## Draw a feature
1. Open `images/layout-overlay.json` in LabelMe.
2. Draw the shape and name it `kind:name` (lowercase, digits, dashes), e.g. `lane:c-exit-north`.
3. In the shape's description, write one `key=value` per line. `evidence` and `confidence` are required.
4. Save, then run `npm run layout:check`. Open the SVG it prints to see what the simulation reads.

`layout/labelme-labels.txt` lists the label prefixes. LabelMe can load a label list with
`labelme --labels layout/labelme-labels.txt` (not tested on this machine; `labelme` is not on PATH
here). LabelMe has no dropdown for description keys, so copy from the template below.

## Kinds

| Kind | Draw as | Extra keys | Used by the simulation now? |
|---|---|---|---|
| `meta` | point | `version`, `source_pair` | file check only |
| `stage` | rectangle or point | `role` (required) | `stage:c-throat`, `stage:c-staging-target` |
| `oneway` | rectangle | `direction=north`, `tolerance_px` (both required) | `oneway:feeder-north` |
| `lane` | linestrip (point order = travel direction) | `from`, `to`, `classes`, `width_px` | `lane:b-north-direct` only; others advisory |
| `road` | linestrip (two-way) | `classes`, `width_px` | no, advisory |
| `nodrive` | polygon or rectangle | none | no, advisory |
| `pave` | polygon or rectangle | none | two named S5 patches active; others advisory |
| `stop` | line, 2 points | `controller` | no, advisory |
| `node` | point | none | no, advisory |
| `pos` | point | `role`, `staffed=true/false` (required) | advisory registry + Routes marker only |

Only the explicitly named features in `RUNTIME_FEATURES` (`src/layoutOverlay.js`) change traffic.
Everything else is checked and drawn in the review image but has no effect until code adopts it.

Allowed `evidence`: `traced`, `measured`, `commander-observed`, `inferred`, `approved-abstraction`.
Allowed `confidence`: `confirmed`, `estimated`, `unknown`.

## Description template

```
evidence=commander-observed
confidence=confirmed
from=road:equity-drive
to=lane:c-entry
width_px=20
note=What you saw and when
```

## See it in the app
Turn on **Routes** (map controls, works in Top and 3D). The layout overlay is drawn on top of the map:
- Areas are translucent fills; **dashed** outlines are rule areas, not roads (`stage`, `oneway`).
- Points are diamonds. Lanes end in a chevron pointing the travel direction; a one-way band shows a column of chevrons.
- Colour is confidence: green confirmed, amber estimated, grey unknown. Red = a geometry problem from the same checks as `npm run layout:check`.
- Each feature has its id with **runtime** (changes traffic) or **advisory** (drawn only), and a one-line meaning.
- The legend appears at the lower right while Routes is on. Dashboard › Route sources › Layout overlay lists every feature.

The app reads the overlay when the page loads, so reload after saving in LabelMe. A file the
parser rejects (bad label, missing key) stops the app from loading; run `npm run layout:check` first.

## What the checker does
- Rejects unknown kinds, unknown keys, duplicate names, missing required keys, bad evidence or
  confidence values, non-finite or out-of-image points, wrong shape types, and `from`/`to`
  names that do not exist. A wrong image or size is rejected.
- Flags lanes and roads that cross a building roof or a `nodrive` area, lane ends more than
  18 px from their `from`/`to` feature, and points placed on a roof.
- Widths are in image pixels. No physical or body clearance is certified.

## Current runtime features (moved from code, values unchanged)
- `stage:c-throat`: Lot C entrance throat where parking staging is not placed. It is **not a
  median**. Both C roadways run through it. Runtime uses its x range and bottom edge only.
- `stage:c-staging-target`: preferred Lot C staging point.
- `oneway:feeder-north`: Feeder is northbound where x is strictly below the rectangle's right
  edge. A simplified band, not surveyed lane edges. Two checks read it, kept exactly as before:
  joins and shortcuts are blocked only when both ends are in the band; grid steps are blocked
  when the start is in the band.

## Map-defined positions (S4)

A new position needs **one `pos:` point here plus one matching definition** in
`src/positions/overlayDefinitions.js`. Copy the template in
[`src/positions/README.md`](../src/positions/README.md). `npm run layout:check` checks
both sides and rejects missing/orphan definitions. Leave the frozen 65-shape map alone.

`staffed=true` is proposed-role metadata, not activation: all S4 points have
`active=false`, `controllers=[]` and no traffic/staff/radio effect. Routes shows a diamond,
not a person. The included `pos:c-layout-demo` is illustrative, unstaffed and explicitly
unconfirmed. Route sources lists its duty, actual implementation and confidence.

## S5 pavement patches

Commander drawings in `research/runs/m3-s5-3318/s5-returned.labelme.json` supply
`pave:lot-a-entrance-road` and `pave:equity-exit2-driveway`. Original vertices are
unchanged. These two patches feed street routing, drivable connectors and mapped
pavement diagnostics. Existing roof polygons and their 1px margin remain excluded
from travel. The Lot A boundary has a small overlap with that mask; it is NOT a
building-removal instruction. Confidence remains estimated, not field-certified.
Other pave features are advisory. The duplicate raw Lot C entrance points were
not imported as positions and do not change staffing or holds.

## S6 B North corridor pilot

`lane:b-north-direct` is the existing three-point northern-row departure
centerline, now read from this overlay at runtime. It is an approved abstraction,
not surveyed pavement: source #7 vertices 18/19 then the existing #11 exit start.
Draw as a three-point linestrip in travel order with `classes=car`. Its final
point must match the current north-exit source; the runtime rejects a bad join.
A final point more than 0.001 px off #11's first point fails `npm run layout:check`
with a named error and stops the app from loading, so keep vertex 3 exactly on it.
If a redraw puts either leg on a roof, the checker warns, B North departures fall
back to the B loop exit, and Routes labels the lane `configured, not used (blocked)`.
No lane width is known, so the checker warns rather than certifying clearance.
The overlay only controls the internal northbound leg for bNorth/north access.
Both exits, section-weighted choices, prelaunch Clay diversion and shuttle paths
are unchanged; no direct connector from the western arm has been added.
Routes shows the line and eastward chevron as runtime/estimated.
