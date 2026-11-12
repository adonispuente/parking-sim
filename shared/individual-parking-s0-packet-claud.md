# S0 — Stall feasibility survey (READ-ONLY) — packet for QWEN

Author: CLAUD, 2026-11-11. Status: **DRAFT FOR SPARTAN REVIEW. NOT RELEASED.**
QWEN must not start until SPARTAN issues a separate release record naming this file's SHA-256.
Parent plan: `handoffs/individual-parking-plan-claud.md` revision 3.
Addresses SPARTAN review `ab11b28b` findings 1 and 2.

## 0. What this task is

Count how many real, aisle-connected parking stalls each of the 11 zones holds, using only
evidence you can point to in the map image and existing traced files. Classify each zone as
FITS, UNDETERMINED or SHORT. You change nothing in the project.

This is a measurement, not a design. You do not create slots, catalogs, or code in `src/`.

## 1. Hard rules (any breach = stop and report)

1. Write ONLY to `/tmp/s0-<runid>/` and your own workspace. Never write anywhere under
   `/Users/adonispuente/Desktop/Developer/parking-sim/`. No `src/`, `images/`, `tests/`,
   `handoffs/`, `research/`, `scripts/` writes. No image edits.
2. Do not start a dev server, build, or test run. Node scripts that `import` project modules
   read-only are allowed; run them from /tmp with the project path as an argument.
3. Do not change, reinterpret, or round zone capacities. They come from `src/parkingZones.js`
   and only the Commander changes them.
4. Do not invent a stall. If evidence for a row is missing, the row is unknown coverage.
5. One placement heuristic failing to fit capacity is NOT proof of a shortage (section 6).
6. Do not contact the Commander. Questions go to CLAUD via the group.
7. If the pre-check in section 2 fails, stop immediately and report the mismatch.

## 2. Pre-check: content manifest (finding 2)

Git status is supplemental only. It cannot prove file contents.

1. Read `research/runs/asouth-activation-533b/live-capture.json` → `protectedFiles`
   (path → sha256, 123 entries). Record that file's own SHA-256 (CLAUD measured
   `a82920d6b3cbc04d2c68d4b478639acd5be1515e7e14757eef4bd43074fbd916`).
2. SHA-256 every one of those 123 paths now. All must match. Any mismatch → STOP.
   (CLAUD check at 21:50 UTC: 123/123 match.)
3. Also SHA-256 every input you read that is not in that list, and record them. Expected
   at packet time:
   - `images/Clear Image.png` `9b88a0585275896580f28b6ff13e10e0200dde7ed2b36c263384bc166be279be`
   - `images/EverythingClearImage.json` `e09faa49fc9fb6e0f3f7455fe255d064cd45160b2477eb3283dc2c4ba3eabd90`
   - `images/index.json` `bcbc332dda8ad2bb8ac5d7050bdb9b5877354a5d78e12ae0ef0e5d4c226b6eb0`
   - `images/NoMedians.json` `d51377c66e8c765af5c0adab014f7c44b722425c5cfa937b48fe3d4688f06f12`
   A differing hash on a file outside the protected 123 is recorded and reported, not a stop.
4. Record `git status --porcelain` SHA-256 and line count as supplemental evidence only.
5. Save the before-manifest as `/tmp/s0-<runid>/manifest-before.json`.

At the end repeat steps 2–3 into `manifest-after.json` and diff. Report additions, removals
and changes for every path in both manifests. Expected: none.

## 3. Calibration: stall size from painted lines

Image: `images/Clear Image.png` (1374 × 1118). Source frame = image pixels.

1. In at least 3 different lots (A, B, C), find a row with clearly painted stall lines.
2. Measure 10 consecutive stall lines per row: line-to-line pitch (stall width) and stall
   depth (painted line length, or kerb to aisle edge).
3. Save a crop of each measured row with your measurement lines drawn on it, in /tmp.
4. Report per row: lot, crop path, pitch px, depth px, row heading in degrees.
5. Fix `W` = median pitch, `D` = median depth, angle tolerance ±10° from the row heading.
   Report min/max spread. If lots differ by more than 15 %, use per-lot values and say so.
6. If a lot has no readable painted lines, say so; do not borrow numbers silently.

## 4. Evidence inventory (finding 1) — before placing anything

The existing helpers are BROAD BOUNDS ONLY:
- `avoidsObstacles` (`src/sourceRouting.js:19–21`) checks the three roof polygons only.
- `onDrivable` (`src/sourceRouting.js:54–59`) is true over whole lot polygons and street
  patches, including grass and medians inside a lot.
- `C_ZONE_PIECES` (`src/cParkingGeometry.js`) partitions Lot C; it does not certify asphalt.
Use them as necessary conditions, never as proof of pavement.

Build, per zone, two evidence layers and record provenance for every piece.

**4a. Permitted pavement area.**
- Lots A and B: the Commander's medians-excluded polygons in `images/index.json`:
  shape 5 "Lot A North With Medians excluded", 6 "Lot A south excluding medians",
  8 "Lot A black permit avoiding medians", 11 "Lot B with medians removed".
  Permitted = zone polygon ∩ that medians-excluded polygon, minus roofs.
- Lot C has no medians-excluded polygon. Permitted = C zone piece minus roofs, intersected
  with an image classification of asphalt pixels. Report the classifier (colour thresholds,
  sample patches) and save the mask. Every C row placed on classifier evidence alone is
  tagged `evidence: image-classified`.
- If a zone maps to more than one medians-excluded polygon, or to none outside Lot C, list it
  and ask CLAUD before continuing that zone.

**4b. Aisle polylines.** A drivable ring is a boundary, not an aisle. Aisles may come only from:
- built arrival/departure lane polylines inside the zone (import `src/parkingRoutes.js`
  read-only; record route id and vertex range), or
- drawn exit paths in `images/ExitPaths.json` / `images/ExitPathsAndC.json` inside the zone, or
- a visible paved aisle between two painted rows, traced in /tmp ONLY if both edge rows are
  visible in a crop you save. Tag these `evidence: traced-by-qwen`.
Record each aisle: id, provenance, polyline, crop path.

Area inside a zone that is neither proven permitted pavement nor proven excluded is **unknown
coverage**. Report it in px² per zone.

## 5. Stall candidates and validity

For each aisle, lay candidate stalls on each side, perpendicular to the aisle within the
angle tolerance, at pitch `W` and depth `D`, starting where the aisle enters the zone.

A candidate is VALID only if ALL hold:
1. **Whole footprint**: sample the full oriented rectangle on a ≤1 px grid. Every sample is
   inside the zone polygon (C: inside its own C piece), inside permitted pavement (4a), outside
   every roof, and passes `avoidsObstacles` and `onDrivable`.
2. **No overlap** with any other valid stall (polygon intersection, not centre distance).
3. **Own-aisle clearance**: footprint edge ≥ 5.45 px (half of 10.89) from its aisle centreline.
4. **Access leg**: segment from stall front-centre to the nearest point on its aisle is ≤ `D`
   and every 1-px sample of it is on permitted pavement.
5. **Corridor protection**: footprint ≥ 10.89 px from every live built route centreline that
   is not its own aisle, including shuttle routes, A South split lanes, the Main approach and
   the C entrance roadways. No aisle exemption. Import built routes read-only; record the count.
6. Not inside the C throat (`inCThroat`).

Rejected candidates keep their first failing rule. Save a crop for every rejected cluster of
3 or more adjacent stalls.

## 6. Classification per zone — do not overclaim

Report per zone: `capacity` (parkingZones.js), `candidates`, `verified`, and
`unknownUpperBound` = floor(unknown-coverage area ÷ (W × D)), an optimistic ceiling.

- **FITS**: `verified ≥ capacity`.
- **UNDETERMINED**: `verified < capacity ≤ verified + unknownUpperBound`. Nothing is decided.
  State which evidence would settle it.
- **SHORT**: `verified + unknownUpperBound < capacity`. The only demonstrated shortfall.

Only SHORT zones go to the Commander, and only via CLAUD. Do not propose fixes.

Pay specific attention to `cFirstSouth` (98 px² of zone polygon per operational space) and
`cNorth` (124). Show the arithmetic: W × D per stall versus area per space.

## 7. Deliverables (in /tmp/s0-<runid>/, copied to your workspace)

`s0-report.md`, in exactly this order:
1. Run id, start/end UTC, this packet's SHA-256, the release record's SHA-256.
2. Manifest: 123/123 before and after, input hashes, diff (expected none).
3. Calibration table with crop paths.
4. Evidence inventory per zone: permitted-area source, aisles with provenance, unknown px².
5. Table: zone · capacity · candidates · verified · unknownUpperBound · class.
6. Rejection counts per zone by first failing rule.
7. Every `image-classified` and `traced-by-qwen` evidence item.
8. Exact commands run.
9. What you could not do, and why.

Also: `stalls.json` (every candidate: id, zone, corners, heading, aisle id, access point, valid,
first failing rule, evidence tags — survey data, NOT the S1 catalog), `manifest-before.json`,
`manifest-after.json`, crops, masks, scripts.

Publish `s0-report.md` and `stalls.json` with group.publish. Hand back to SPARTAN for review.

## 8. Stop rules

- Protected-file mismatch before or after → stop.
- Any write lands inside the project → stop; report exactly what and where.
- Calibration impossible in 2 of 3 lots → stop; do not guess dimensions.
- Out of budget → stop, keep everything in /tmp, publish a report marked PARTIAL listing
  finished zones.

## 9. Out of scope

S1 catalog; any `src/`, `scripts/`, `tests/` file; slot ranking; church distance; exit-start
binding; cleanup; B North #34; A South; Lot C staging.
