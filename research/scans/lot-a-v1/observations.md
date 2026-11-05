# Lot A v1 — preliminary source-pixel trace

## Status and scope

This is an editable **review draft**, not a survey or approved replacement for the simulator. No application code, layouts, or LabelMe source was changed. Thirty features cover the approved roof sections and east pavement, a provisional paved-campus envelope, the western shuttle forecourt, visible planted patches, access/aisle centerlines, and eight provisional row extents. No individual stalls have been manufactured or counted. Operational capacity remains 411, not the number of visible marks.

## Source and alignment

Primary: `images/Mosst updated satelite image.png`, 1698 × 1378 pixels, unrotated and unresized. Origin upper left, x right, y down. `overlay.png` is the full original raster with outlines drawn directly at these coordinates. `trace.svg` contains editable vectors only and uses the identical viewBox. `detail-review.png` is an EXTRA inspection crop with offset (80,70); it is not the primary output coordinate frame.

The approved 410 × 500 roof crop was verified pixel-for-pixel against primary rectangle (190,180)–(600,680). Existing approved roof and eastern pavement coordinates were transferred by translation only, adding (190,180). No scene-unit conversion is used. Supporting Apple/Google/labeled images are inventoried but unregistered; no coordinate transfer from them was attempted.

## Evidence and uncertainty

- Red: preserved approved roof sections. Main, west, and south roof sections have some overlap in the pre-existing geometry; approval is preserved, not silently corrected. A higher main roof creates a visible shadow band to the north; shadow is not added as roof. The source geometry is an approved schematic, not an exact architectural footprint.
- Yellow: separately classified east ground pavement. Its complete shared edge with main roof uses precisely (550,345)–(475,475). Height or roof attribution is not inferred.
- Cyan dashed: pavement/campus envelope around Lot A. Tree canopies conceal much of the curb; this is an outer envelope containing buildings and islands, not a single all-paved polygon or property boundary. Entrances connect beyond it.
- Green dashed: selected visible planted islands. Not exhaustive; shadows, trees and dark pavement make exact edges uncertain. The small round center and two lobes in the western forecourt are approximated as polygons rather than ideal circles.
- White dashed: western shuttle forecourt extent. Physical pavement is visible; shuttle use is Commander-supplied context. Inner islands are separate features, not holes embedded in this polygon.
- Purple/orange dashed: approximate aisle and entrance connectivity, not lane edges, permitted turns, or one-way assignments. Three explicit junctions share exact coordinates, recorded in manifest. These are a partial schematic centerline network, not a complete routable graph. East access restrictions remain outside geometric inference.
- Pink dashed: approximate parking-bank extents/orientations, not a space-count reconstruction. Roof-adjacent northern stripes are particularly faint; row endpoints need zoomed manual review. Western and southern banks are partly tree-obscured. Do not generate stalls from these lines without review.

All new visually picked geometry is conservatively marked uncertain. The preserved approved outlines are solid. Confidence is qualitative provenance, not a numerical measurement error.

## Visual review performed

Inspected original source crop and generated `detail-review.png` directly. Approved roof sections and east pavement land on their intended source regions; the pavement remains distinct from the roof. The outer envelope surrounds the triangular pavement and follows the broad curb shape but cannot resolve hidden edges. Small text overlaps at closely spaced features; IDs and coordinates remain individually editable in native JSON/SVG. Full-image overlay retains original dimensions.

## Review queue before integration

1. Open native JSON in LabelMe and refine the cyan perimeter at native zoom, especially west/south under tree cover.
2. Verify north row offsets against actual stripe locations. Delete rows whose visible evidence is inadequate rather than regularizing them.
3. Review forecourt extent and lobe boundaries; confirm which paved subareas are used for shuttle loading.
4. Trace missing islands/sidewalks and aisle pavement edges only where distinguishable. No sidewalk classification is asserted here.
5. Verify driveway throat endpoints and actual traffic rules separately with church staff.
6. Decide whether to propose corrections to approved roof section overlaps; no correction is proposed or applied in this package.

## Validation meaning

`validation.json` records bounds, unique IDs, closed rings, nonzero area, and polygon self-intersection checks. Additional package checks verify SVG/JSON point consistency, image size, pixel-identical source outside the annotation region, approved roof equality, the east shared boundary, and declared network junction equality. These checks establish coordinate consistency, **not real-world completeness or geometric accuracy**. Source hash in manifest detects later replacement.

## Editing and regeneration

Use `annotations.labelme.json` as the editable source. Polygon closure is implicit in native LabelMe and explicit in normalized JSON; polylines are not closed. Shape `description` contains metadata JSON. Keep stable labels/IDs, and preserve this description when editing. After changes, run from project root:

```sh
research/scans/.venv/bin/python research/scans/export_labelme.py research/scans/lot-a-v1/annotations.labelme.json research/scans/lot-a-v1
```

Do not rerun `prepare_lot_a.py` over manual work: it recreates the initial draft. SVG edits are not imported automatically back into LabelMe. The original image remains external via a relative path; keep project folder structure or adjust `imagePath` explicitly. See `../labelme-workflow.md` for inspected launch options and assisted tracing limitations.
