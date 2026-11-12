# S0 — Stall feasibility survey (READ-ONLY) — packet for QWEN, revision 3

Author: CLAUD, 2026-11-11. Status: **DRAFT FOR SPARTAN REVIEW. NOT RELEASED.**
QWEN must not start until SPARTAN issues a separate release record naming this file's SHA-256.
Parent plan: `handoffs/individual-parking-plan-claud.md` revision 3.2.
Revision 1 (`ee1b1a5e…`, artifact `ca2bbcc9`) answered review `ab11b28b` findings 1–2.
**Revision 2 answers review `69eb17dd` (probes `d0d0b07a`):** blocker 1 (false SHORT) → sections
3, 6, 6a; blocker 2 (blocked/disconnected access) → sections 5, 5a, 5b, 6a; calibration
clarification → section 3. Changed text is marked **[s0r2]**.
**Revision 3 answers review `2c44cddd` (probes `c23f4ab6`), narrow amendment only** (from r2
`95f4329a…`, artifact `26fb692b`): a sampled minimum stall size is an estimate, not a certified
global minimum, so this survey cannot prove SHORT. Changes → sections 1.5, 3.6, 6, 6a (N5 and U1
added, P1 premise explicit), 7, 8, 9. Union-once area arithmetic → section 6. Access, corridor,
final-set, connectivity and aliasing rules (sections 4c, 5, 5a, 5b) are unchanged from
revision 2. Changed text is marked **[s0r3]**.

## 0. What this task is

Count how many real, aisle-connected parking stalls each of the 11 zones holds, using only
evidence you can point to in the map image and existing traced files. Classify each zone as
FITS or UNDETERMINED (**[s0r3]** this survey cannot produce SHORT; section 6). You change
nothing in the project.

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
5. **[s0r2]** The verified count is a LOWER bound. A verified count below capacity is never by
   itself a shortage. **[s0r3]** This survey has no certified global minimum stall area, so it
   reports no SHORT: every calibrated below-capacity zone is UNDETERMINED with reason
   `minimum-stall-area-unproven` (section 6; tests N1, N5).
6. Do not contact the Commander. Questions go to CLAUD via the group.
7. If the pre-check in section 2 fails, stop immediately and report the mismatch.
8. **[s0r2]** Run the decision-rule tests of section 6a before the real survey. Any failure →
   stop and report; do not survey with a failing rule implementation.

## 2. Pre-check: content manifest

Git status is supplemental only. It cannot prove file contents.

1. Read `research/runs/asouth-activation-533b/live-capture.json` → `protectedFiles`
   (path → sha256, 123 entries). Record that file's own SHA-256 (expected
   `a82920d6b3cbc04d2c68d4b478639acd5be1515e7e14757eef4bd43074fbd916`).
2. SHA-256 every one of those 123 paths now. All must match. Any mismatch → STOP.
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

1. In each of lots A, B and C, find rows with clearly painted stall lines (at least one row per lot).
2. Measure 10 consecutive stall lines per row: line-to-line pitch (stall width) and stall
   depth (painted line length, or kerb to aisle edge).
3. Save a crop of each measured row with your measurement lines drawn on it, in /tmp.
4. Report per row: lot, crop path, pitch px, depth px, row heading in degrees.
5. Placement size: `W` = median pitch, `D` = median depth, angle tolerance ±10° from the row
   heading. If lots differ by more than 15 %, use per-lot values and say so.
6. **[s0r3] Sampled size estimate (evidence, NOT a bound).** Per lot:
   `Wmin` = smallest single measured pitch, `Dmin` = smallest single measured depth in that lot,
   `δ` = 1 px measurement uncertainty, and
   `sampledAreaEstimate = max(0, Wmin − δ) × max(0, Dmin − δ)`.
   Report Wmin, Dmin, sampledAreaEstimate and the row each came from. This is the minimum over
   the rows you measured only. It does not exclude smaller stalls in unmeasured rows, so it is
   never used as a certified minimum and never produces SHORT. Measuring more rows does not
   change that; do not attempt to certify a global minimum in S0.
7. **[s0r2] Unreadable lot.** A lot with no readable painted lines is UNCALIBRATED: it has no W,
   D or sampledAreaEstimate. Every zone in it is reported UNDETERMINED with reason `uncalibrated`
   (or omitted from a PARTIAL report and listed as skipped). Never borrow another lot's values,
   even when the other two lots proceed.

## 4. Evidence inventory — before placing anything

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
- Lot C has no medians-excluded polygon. Permitted = C zone piece minus roofs minus the C throat
  (`inCThroat`, `src/parkingRoutes.js:35`), intersected with an image classification of asphalt
  pixels. Report the classifier (colour thresholds, sample patches) and save the mask. Every C row
  placed on classifier evidence alone is tagged `evidence: image-classified`.
- If a zone maps to more than one medians-excluded polygon, or to none outside Lot C, list it
  and ask CLAUD before continuing that zone.

**4b. Aisle polylines.** A drivable ring is a boundary, not an aisle. Aisles may come only from:
- built arrival/departure lane polylines inside the zone (import `src/parkingRoutes.js`
  read-only; record route id and vertex range), or
- drawn exit paths in `images/ExitPaths.json` / `images/ExitPathsAndC.json` inside the zone, or
- a visible paved aisle between two painted rows, traced in /tmp ONLY if both edge rows are
  visible in a crop you save. Tag these `evidence: traced-by-qwen`.
Record each aisle: id, provenance, polyline, crop path.

**[s0r2] 4c. Aliasing.** If a drawn or traced aisle lies within 1 px of a live built route over
some span, that span IS the built route: record the route id(s) and vertex range. Every live
route coincident (≤ 1 px) with an aisle span is listed on that aisle by id.

Area inside a zone that is neither proven permitted pavement nor proven excluded is **unknown
coverage**. Report it in px² per zone.

## 5. Stall candidates and validity

For each aisle, lay candidate stalls on each side, perpendicular to the aisle within the
angle tolerance, at pitch `W` and depth `D`, starting where the aisle enters the zone.

**[s0r2] Definitions.**
- *Own-aisle span*: the aisle polyline the stall's access leg lands on, restricted to the vertex
  range within `D + W` of the access point. If that span aliases live routes (4c), all of those
  coincident routes, over that range only, are the own aisle.
- *Access corridor*: the rectangle of full stall width `W`, extending the footprint from its
  front edge to the own-aisle centreline (the swept body, not a centreline).
- *Maneuver zone*: the strip between the stall's front edge and the own-aisle centreline,
  extended `W` beyond each side of the stall along the aisle (total length `3W`).

A candidate is VALID only if ALL hold:
1. **Whole footprint**: sample the full oriented rectangle on a ≤1 px grid. Every sample is
   inside the zone polygon (C: inside its own C piece), inside permitted pavement (4a), outside
   every roof, and passes `avoidsObstacles` and `onDrivable`.
2. **No overlap** with any other accepted stall (polygon intersection, not centre distance).
3. **Own-aisle clearance**: footprint edge ≥ 5.45 px (half of 10.89) from its own-aisle span.
4. **Access corridor**: corridor length ≤ `D`; every ≤1 px sample of the corridor is on the
   lot's permitted pavement (4a, any zone of the same lot, since an aisle may run on a zone edge)
   and inside no other accepted stall footprint.
5. **[s0r2] Maneuver zone**: every ≤1 px sample is on the lot's permitted pavement (as rule 4)
   and inside no other accepted stall footprint. A sample in unknown coverage makes the candidate
   `uncertain` (not verified, not rejected); a sample on proven non-pavement rejects it.
6. **Corridor protection**: footprint ≥ 10.89 px from every live built route centreline other than
   its own-aisle span — every other route id, AND the same route id outside the own-aisle vertex
   range, including shuttle routes, A South split lanes, the Main approach and the C entrance
   roadways. **[s0r2]** The only relaxation is the own-aisle span, at 5.45 px (rule 3). Record in
   `stalls.json` every route id and vertex range treated as own aisle; nothing else is exempt.
7. Not inside the C throat (`inCThroat`).
8. **[s0r2] Connected aisle** (5b).

**[s0r2] 5a. Joint acceptance against the final set.** Insertion order does not decide validity.
1. Place candidates in a deterministic order (aisle id, then along-aisle distance). A new
   candidate is rejected if its footprint intersects an accepted stall's footprint, access corridor
   or maneuver zone, or if its own corridor or maneuver zone intersects an accepted footprint.
2. After placement, recheck rules 2, 4 and 5 for every accepted stall against the FINAL accepted
   set. For a conflicting pair, remove the later-placed stall with first failing rule
   `access-blocked-by:<id>`. Repeat until no conflict remains (fixed point). Report the pass count.
3. `verified` = the final accepted set that also passes rule 8. Report it per zone.

**[s0r2] 5b. Connectivity.** Build an aisle graph from 4b aisles only. Two aisles are joined
only where they intersect or meet within 1 px, or through another evidence-backed aisle. A zone's
entry anchors are the vertices of its live arrival route inside the zone and its `ZONE_STAGING`
point. An aisle is CONNECTED if a path through the graph reaches an anchor; built lanes are
connected by definition. No obstacle-only auto-connector, no straight join across unknown
coverage. Stalls on an unconnected aisle are `unconnected`: reported, never counted in `verified`.
Record each connected aisle's path (aisle ids in order) to its anchor.

Rejected candidates keep their first failing rule. Save a crop for every rejected cluster of
3 or more adjacent stalls.

## 6. Classification per zone — do not overclaim **[s0r3] rewritten**

`verified` is a lower bound. A shortage needs an upper bound that covers every possible
placement, independent of your placement strategy. Such a bound needs a certified minimum area
for every admissible stall. Sampled rows cannot provide that, so this survey has none.

**[s0r3] usableArea (always computed and reported).** Per zone, by set operations, not scalar sums:
- `Z` = zone polygon (C: its own C piece minus the C throat).
- `X` = UNION of (roof polygons ∩ Z) and (PROVEN exclusions ∩ Z). Proven exclusions: for A/B,
  Z outside the medians-excluded polygon. For C, classifier-excluded pixels are NOT proven
  exclusions and are not in X.
- `usableArea = area(Z) − area(X)`: the union is subtracted once, so a roof that also lies
  outside the medians-excluded polygon is not counted twice. Unknown coverage stays in usableArea.
  Compute on the same ≤1 px raster or by exact polygon clipping; state which.

**[s0r3] Upper bound — rule kept, certificate absent.** The rule function takes
`certifiedAmin` (default `null`):
- `certifiedAmin = null` → `upperBound = null`, non-certifying. This is the ONLY setting the real
  survey may use. `sampledAreaEstimate` is never passed in as `certifiedAmin`.
- `certifiedAmin` given → `upperBound = floor(usableArea ÷ certifiedAmin)`. Allowed only in the
  synthetic test P1, where the certificate is an explicit premise. A real certificate needs a
  separate packet naming its provenance, scope and uncertainty; no vehicle or stall standard is
  adopted here.

Classes:
- **FITS**: `verified ≥ capacity`.
- **SHORT**: `upperBound` not null AND `upperBound < capacity`. Cannot occur in this survey.
- **UNDETERMINED**: everything else. Reasons: `uncalibrated`, or
  `minimum-stall-area-unproven` (calibrated, verified < capacity, no certificate). State which
  evidence would settle it (more verified stalls, or a certified minimum stall area).

Report per zone: capacity, candidates, verified, uncertain, unconnected, usableArea,
sampledAreaEstimate, usableArea ÷ capacity, upperBound (null), class, reason.

No zone goes to the Commander from this survey. Do not propose fixes.

Pay specific attention to `cFirstSouth` (98 px² of zone polygon per operational space) and
`cNorth` (124). Report `usableArea ÷ capacity` beside `sampledAreaEstimate` as information for
CLAUD; it is not a classification.

**[s0r2] 6a. Decision-rule tests (run first, save as `/tmp/s0-<runid>/rules.test.mjs`).**
Synthetic geometry only; these are rule checks, not map claims. Use the same functions as the survey.
- **N1 false SHORT (review counterexample 1):** paved, fully known zone [0,30]×[0,20] inside lot
  permitted pavement [−10,40]×[−6,20], connected built aisle y=0,
  W=D=10, capacity 2, heuristic verified 1, unknown area 0. **[s0r3]** With
  `certifiedAmin = null`: UNDETERMINED, reason `minimum-stall-area-unproven`, upperBound null,
  never SHORT. Accepting both stalls [0,10]×[6,16] and [15,25]×[6,16] must yield FITS.
- **N2 blocked access (review counterexample 2):** W=10, D=20; near stall [0,20]×[6,16] on aisle
  x=−6; far stall [5,15]×[17,37] on aisle y=0, both aisles traced and connected. Both must not
  end in the final verified set: the far stall's corridor crosses the near footprint.
- **N3 disconnected aisle:** a valid stall on a traced aisle with no graph path to an anchor must
  be `unconnected` and not counted.
- **N4 own-aisle aliasing:** a stall 6 px from a built route used as its own aisle passes rule 3;
  the same route id 6 px away outside the own-aisle vertex range fails rule 6.
- **[s0r3] N5 sampled minimum is not a certificate (review 2c44cddd):** calibrated lot with
  sampled minima pitch 12, depth 20 (sampledAreaEstimate 209). Zone [0,17]×[0,24], area 408,
  capacity 2, connected aisle y=0, lot permitted pavement [−8,25]×[−6,24]. Actual stalls
  [0,8]×[6,24] and [9,17]×[6,24] (8×18). No certificate, heuristic verified 0 or 1. Must be
  UNDETERMINED, reason `minimum-stall-area-unproven`, upperBound null, NEVER SHORT (the r2 formula
  gave floor(408/209) = 1). Accepting both stalls as verified must yield FITS.
- **[s0r3] U1 union-once area:** Z = [0,20]×[0,20] (400), roof [0,10]×[0,10], proven exclusion
  the same [0,10]×[0,10]. usableArea must be 300, not 200. With synthetic `certifiedAmin = 100`
  and capacity 3, the class must not be SHORT (upperBound 3).
- **P1 true SHORT (synthetic certificate):** **[s0r3]** `certifiedAmin = 100` supplied explicitly
  as the test premise; usableArea 150, capacity 2 → upperBound 1 → SHORT. With
  `certifiedAmin = null` the same zone must be UNDETERMINED, reason `minimum-stall-area-unproven`.
- **P2 uncalibrated:** a zone in a lot with no calibration → UNDETERMINED, reason `uncalibrated`.
**[s0r3]** All eight (N1–N5, U1, P1, P2) must pass before section 3 starts.

## 7. Deliverables (in /tmp/s0-<runid>/, copied to your workspace)

`s0-report.md`, in exactly this order:
1. Run id, start/end UTC, this packet's SHA-256, the release record's SHA-256.
2. Manifest: 123/123 before and after, input hashes, diff (expected none).
3. Decision-rule test output (6a), all eight named.
4. Calibration table with crop paths, including Wmin/Dmin/sampledAreaEstimate per lot and
   uncalibrated lots.
5. Evidence inventory per zone: permitted-area source, aisles with provenance and aliases,
   connectivity paths, unknown px².
6. Table: zone · capacity · candidates · verified · uncertain · unconnected · usableArea ·
   sampledAreaEstimate · usableArea÷capacity · upperBound (null) · class · reason.
7. Rejection counts per zone by first failing rule, including `access-blocked-by` removals and
   fixed-point pass count.
8. Every `image-classified` and `traced-by-qwen` evidence item.
9. Exact commands run.
10. What you could not do, and why.

Also: `stalls.json` (every candidate: id, zone, corners, heading, aisle id, own-aisle route ids and
vertex range, access corridor polygon, maneuver zone polygon, connectivity path, status
`verified | uncertain | unconnected | rejected`, first failing rule, evidence tags — survey data,
NOT the S1 catalog), `manifest-before.json`, `manifest-after.json`, `rules.test.mjs`, crops,
masks, scripts.

Publish `s0-report.md` and `stalls.json` with group.publish. Hand back to SPARTAN for review.

## 8. Stop rules

- Protected-file mismatch before or after → stop.
- Any write lands inside the project → stop; report exactly what and where.
- Any of the eight 6a decision-rule tests fails → stop.
- Calibration impossible in 2 of 3 lots → stop; do not guess dimensions. (One uncalibrated lot
  does not stop the run; see 3.7.)
- **[s0r3]** Any real-survey call passes a non-null `certifiedAmin`, or any zone is classed SHORT
  → stop; that is a rule-implementation error.
- Out of budget → stop, keep everything in /tmp, publish a report marked PARTIAL listing
  finished and skipped zones.

## 9. Out of scope

S1 catalog; any `src/`, `scripts/`, `tests/` file; slot ranking; church distance; exit-start
binding; stronger upper bounds; **[s0r3]** certifying a global minimum stall area or adopting a
vehicle/stall standard; cleanup; B North #34; A South; Lot C staging.
