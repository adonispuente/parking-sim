# Parking simulator: image-analysis handoff

## Copy this prompt to the scanning agent

You are a geospatial image-tracing analyst, not a game designer. Analyze the supplied church satellite images and return reviewable 2D geometry that another agent can integrate into a React + Three.js parking-training app. Do not generate an attractive imaginary campus or infer traffic rules from pavement.

### Context and established requirements
- Three lots: A, B, C. Confirmed capacities: A 411, B 487, C 686; total 1,584. These are operational totals, not a requirement to invent that many visible stalls.
- Corporate Drive is the S-shaped road. Preserve continuous connections and distinguish roads, entrances, internal aisles, and parking stalls.
- Lot B has north and west entrances. Lot C has two north entrances.
- Each lot has a roundabout/shuttle pickup-drop-off area. User descriptions establish function; photos establish approximate shape and location. Do not invent travel direction.
- Lot A's approved roof outline should be preserved unless a proposed correction is separately flagged. The eastern triangle is ground-level pavement, not roof, fully connected to the building along its eastern edge and contained by the lot's paved envelope.
- Latest satellite image is the primary geometric reference. Use the Apple image for updated building evidence, Google for clearer stall evidence, and the labeled map for lot identity. Identify any disagreement rather than silently combining incompatible geometry.
- Heights, exact boundaries hidden by trees, one-way rules, accessible-space markings, signs, and capacities inferred from visible stripes must not be presented as measured facts.

### Inputs the project owner should send
1. Original full-resolution latest satellite image, not just a screenshot of the app.
2. Labeled A/B/C map and supporting Apple/Google images.
3. Approved Lot A reference crop and, if available, current trace overlay for comparison.
4. This brief. Analyze one lot first to prove quality before expanding to the campus.

### Coordinate contract
Use ONE primary image as the coordinate frame. Record its exact filename, pixel width and height, north orientation if known, and any crop origin. Coordinates are pixels: origin top-left, x right, y down. Return geometry in full-image coordinates, even if you inspect crops; supply crop offsets if crops are delivered. Do not convert into Three.js coordinates, meters, or assumed map scale. Register supporting images to the primary frame using at least three dispersed matching landmarks and report alignment uncertainty. If alignment cannot be established, keep that source's trace separate.

### Required return package
- `manifest.json`: source-image identity/dimensions, coordinate convention, crop offsets, registration landmarks and limitations, revision, and referenced output files.
- `features.json`: machine-readable polygons and polylines; use the example below. Stable feature IDs; no prose embedded in coordinate strings.
- `overlay.png`: primary image with outlined and labeled features, color legend, and uncertain edges visibly distinguished. Do not substitute a standalone generated illustration.
- `trace.svg`: editable vector overlay with the primary image's pixel dimensions/viewBox and feature IDs matching JSON. Embed or reference the exact source image consistently.
- `observations.md`: visible evidence, assumptions, occlusions, alternative interpretations, and questions needing human confirmation. Distinguish roof edge from building ground footprint where image perspective or shadows make them differ.

Trace separately: lot paved envelopes; roof masses; ground-level forecourts/triangles; road pavement polygons; road centerlines; entrance connections; internal aisles; parking-row extents and orientation; clearly visible individual stalls where feasible; planted islands; roundabout outer pavement and inner islands; visible sidewalks. Shuttle-stop function should be tagged as user-supplied, not visually proven.

Do not manufacture stalls behind trees or use repeated rows to force the supplied capacity total. Report visible stall counts separately from confirmed capacity. Omit unresolvable details or flag them as uncertain.

### Feature example (illustrative coordinates only; NOT a campus trace)
```json
{
  "coordinateSystem": "primary-image-pixels-top-left",
  "features": [
    {
      "id": "lot-a-east-pavement",
      "lot": "A",
      "kind": "pavement",
      "geometry": {"type": "Polygon", "coordinates": [[[100,100],[140,120],[135,170],[100,100]]]},
      "evidence": "visible",
      "sourceImage": "REPLACE-WITH-EXACT-FILENAME",
      "confidence": "medium",
      "uncertaintyPixels": null,
      "notes": "Example only; null means uncertainty not measured."
    }
  ]
}
```
Use GeoJSON-shaped geometry but explicitly retain image pixels: this is not geographic longitude/latitude GeoJSON. Polygon rings must close; line strings must not be forcibly closed. Confidence is qualitative, not a calibrated probability. Supply an uncertainty estimate only when justified.

### Quality gates
- Overlay can be placed on the original image without manual shifting or resizing.
- Every feature matches between SVG, JSON, and overlay.
- Shared pavement/roof boundaries reuse matching coordinates where they truly touch; no accidental gaps or unsupported overlaps.
- Paved envelopes include their forecourts and entrances; centerlines connect continuously where the image supports connection.
- No self-intersecting polygons; holes/inner islands represented distinctly.
- All claimed image details are auditable in the overlay. Disagreements and invisible edges remain explicit.
- Deliver analysis files only; do not change application code or saved layouts.

## How to bring the result back
Place the complete package in `research/scans/<revision>/`, keeping original source images or unambiguous links to existing repo files. Tell the implementing agent: “Review this scan overlay against the source, preserve approved geometry unless explicitly flagged, and integrate accepted features into the app.”

The implementation agent should first check coordinate registration and one known building, then convert pixel coordinates into the existing scene coordinate system. Current `src/lotA.js` already converts crop-relative roof points to scene units; external analysts should not copy its scale into unrelated image dimensions. Review the overlay before changing roads, buildings, or saved-layout migrations.

## Selection criterion for a better scanner
Judge tools/agents on their ability to return source-aligned editable polygons plus an overlay—not on photorealistic output. Trial the same Lot A image with each candidate. Reject results that cannot identify source dimensions, invent hidden structures, or cannot export coordinates. A human-assisted tracing tool is a better fallback than a convincing but geometrically inaccurate 3D reconstruction.
