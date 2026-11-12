# Positions

What every person on the map does, where the code implements it, and which new points are advisory only.

## Registry API
- `POSITIONS`: the **unchanged eight staffed source points** (#57–#64).
- `CONTROL_POINTS`: the existing unstaffed Equity / Clay stop; unlike a new stub, it has implemented stop behavior.
- `OVERLAY_POSITIONS`: named `pos:` points plus definitions from `overlayDefinitions.js`. **Advisory/inactive**, with zero controllers.
- `ALL_POSITIONS`: those three lists combined. `positionById('pos:...')` includes new points. `positionByIndex` only resolves original source indices/aliases; null never resolves to an advisory entry.
- `duty`, `implemented`, `intended`, `provisional`, `controllers`: real duty versus actual model behavior, unmodeled duties, estimates, and implementing files. Describe them honestly.

| # | id | Position |
|---|---|---|
| 57 (alias 31) | aMain | Lot A Main |
| 58 | aExitOfficer | Lot A Feeder exit officer |
| 59 | corporateOfficer | Feeder / Corporate officer |
| 60 | permitOfficer | Black Permit officer |
| 61 (alias 32) | bEntrance | Lot B entrance |
| 62 (alias 33) | bExit | Lot B north exit |
| 63 (alias 34) | cEntrance | Lot C staffed entrance |
| 64 (alias 35) | cExit | Lot C exit |
| — | equityClayStop | Equity / Clay three-way stop (implemented, unstaffed) |
| — | pos:c-layout-demo | Illustrative unstaffed overlay sample; not a real worker location |

## Add a map-defined position (M3 S4)

**Do not append to or renumber `images/EverythingClearImage.json`.** That source intentionally requires exactly 65 shapes. No rebind is needed for a new overlay position.

1. In LabelMe open `images/layout-overlay.json` on the same image. Draw a point named `pos:your-name`, using lowercase letters, digits and dashes. Do not reuse a canonical position ID.
2. Copy the description and set its evidence honestly:
   ```
   role=row-marshal
   staffed=false
   evidence=inferred
   confidence=unknown
   note=Proposed location; not an active worker
   ```
   `role` must be nonempty; `staffed` must be exactly `true` or `false`.
3. In `src/positions/overlayDefinitions.js`, add one matching entry to `OVERLAY_DEFINITIONS`:
   ```js
   'pos:your-name': {
     title: 'Proposed row marshal',
     duty: 'Describe the real or proposed duty, and whether it is confirmed.',
     implemented: 'Advisory marker only; no worker, stop or controller is activated.',
     intended: [],
     provisional: ['Location is unconfirmed'],
     controllers: [],
   },
   ```
4. Run `npm run layout:check`. Missing/orphan definitions, bad fields, source-ID collisions, controllers in an advisory stub, and points on roofs fail with named errors.
5. Reload the app; turn on Routes. The point is a confidence-colored diamond, not a volunteer. Dashboard → Route sources → Map-defined positions shows definition details.

`staffed=true` describes a proposed staffed role only; **it does not create a person, add a radio member, consume staff, or stop traffic**. `active` stays false. Full worker/controller activation is M5+ and requires explicit code and behavior verification. A new point must never add an unexplained hold.

The sample `pos:c-layout-demo` is deliberately `inferred` / `unknown`, not a claim about a real station. It may be moved in LabelMe; deleting it also requires deleting its matching definition. The strict source map and its aliases remain authoritative for the original eight positions.

Full operator reference/history: [`docs/positions.md`](../../docs/positions.md).
