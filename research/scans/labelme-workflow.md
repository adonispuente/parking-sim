# LabelMe workflow assessment for parking-sim

**Inspection date:** 2026-11-04. This is a source-tree inspection of `/Users/adonispuente/Desktop/Developer/labelme`; LabelMe was not launched, no dependencies were installed, and no app/LabelMe files were changed. Because code execution was not authorized/available in this delegated run, “launch instructions” below are verified from the checked-in README and CLI parser, not experimentally executed against the machine's installed environment.

## Verdict

LabelMe is suitable for manual tracing and review drafts: it supports polygon and open linestrip shapes and stores per-shape image-coordinate point lists in JSON. It is not a GIS/vector editor and does not establish real-world scale, topology, georeferencing, semantic correctness, or measured campus accuracy. AI assistance exists, but is a prompt-based segmentation/detection aid with downloaded models and must be treated as an editable proposal, never trusted geometry.

## Verified launch instructions

From the local repository, if its existing Python environment already has LabelMe and its dependencies installed, run:

```bash
cd /Users/adonispuente/Desktop/Developer/labelme
labelme /absolute/path/to/source-image.jpg --output /absolute/path/to/annotations
```

The documented CLI accepts an image file, annotation JSON, or folder as its optional positional path; `--output` selects/creates the annotation folder. The README also documents `labelme` to open the GUI, `labelme IMAGE --with-image-data` to embed the source image in JSON, and `labelme DIR --labels labels.txt` for predefined labels. The project README documents `pip install labelme` / `pip install git+https://github.com/wkentaro/labelme.git`, but installation of LabelMe itself was outside this inspection subtask; the Commander did not prohibit dependency installation. The lead installed Pillow only in the research-local virtual environment for export tooling. Repository README says current v7 line supports Python 3.12–3.14, Qt6/PySide6, and 64-bit macOS/Windows/Linux. Check what is already installed before selecting an invocation; the checkout itself does not prove its CLI entry point is installed.

Sources: `/Users/adonispuente/Desktop/Developer/labelme/README.md` (Installation, Usage); `/Users/adonispuente/Desktop/Developer/labelme/labelme/__main__.py` (`argparse` positional `path`, `--output`, `--with-image-data`, labels parsing, GUI entry point); `/Users/adonispuente/Desktop/Developer/labelme/pyproject.toml` (dependencies).

## Annotation modes relevant to campus features

- **Polygon:** use for roof sections, pavement boundaries/islands/forecourts, and other closed regions. The GUI's polygon tool is registered in `/Users/adonispuente/Desktop/Developer/labelme/labelme/_app.py`; geometry model recognizes `polygon` in `/Users/adonispuente/Desktop/Developer/labelme/labelme/_shape/_model.py`.
- **Linestrip:** an open, multi-vertex polyline suitable for road centerlines, row extents, or aisle/edge traces. The tool is exposed as `LineStrip` and maps to `linestrip`; rendering/hit testing treats it as open (no last-to-first segment). Sources: `/Users/adonispuente/Desktop/Developer/labelme/labelme/_app.py`, `/Users/adonispuente/Desktop/Developer/labelme/labelme/_shape/_model.py`, `/Users/adonispuente/Desktop/Developer/labelme/labelme/_widgets/_shape_render.py`.
- **Line:** exactly two points, suitable only for a straight segment, not a curved road. Native shape schema supports it. Source: `/Users/adonispuente/Desktop/Developer/labelme/labelme/_label_file.py`.
- Parking-space markings can be polygons or lines only where visually distinguishable; poor/occluded striping should be marked uncertain/out-of-scope rather than completed by inference. LabelMe does not provide a semantic class taxonomy for this project: meaningful names/labels must be supplied by the annotator.

The repository README lists polygon, rectangle, circle, line, and point; `linestrip` is confirmed directly in current implementation even though not listed in that README feature bullet.

## Native JSON semantics and limits

The on-disk file is JSON. Top-level fields written by current code are `version`, `flags`, `shapes`, `imagePath`, `imageData`, `imageHeight`, and `imageWidth` (`/Users/adonispuente/Desktop/Developer/labelme/labelme/_label_file.py`). Shape entries have `label`, `points` (ordered `[x,y]` coordinate pairs), `group_id`, `description`, `shape_type`, `flags`, and `mask`; `locked` is included when true. Additional non-reserved keys are retained as `other_data` on load/save. Coordinates are image pixel-space coordinates represented as numbers, not geographic coordinates or world units. `imagePath` is relative to the annotation file on load. With `--with-image-data`, `imageData` is embedded base64; otherwise it is null and the image must remain reachable at its recorded path. Dimensions are validated against decoded image when read.

Native JSON is a useful source format but not the requested standardized simulator schema, SVG export, or PNG overlay. Convert it with a separate, tested script that preserves coordinates and metadata, and generate overlays from the same coordinates. Do not treat LabelMe’s mask rasterization or VOC/COCO examples as a geospatial export: examples demonstrate segmentation dataset conversions, not campus topology or physical scale. LabelMe README explicitly says it is an application with no stable Python API; read JSON directly rather than coupling to internal Python imports.

Source: `/Users/adonispuente/Desktop/Developer/labelme/labelme/_label_file.py`; `/Users/adonispuente/Desktop/Developer/labelme/README.md` (Public interface and FAQ); `/Users/adonispuente/Desktop/Developer/labelme/examples/utils.py` (JSON-to-mask utility).

## AI-assisted annotation: capability, caveats, reliability

The README advertises AI-assisted point-to-polygon/mask annotation (SAM/EfficientSAM) and text-to-annotation (YOLO-World/SAM3). Current implementation provides point/box prompt segmentation, text prompts, and find-all behavior; these are model suggestions initiated by the user, not automatic verified tracing. Model list and repository tooltips distinguish speed/quality and include EfficientSAM Tiny as “rough outlines,” YOLO-World as boxes without masks, and SAM3 as slower / best with GPU. Those are project descriptions, not independent accuracy benchmarks. There is no source evidence here that model output reaches parcel/roof/parking-space accuracy or meets the project’s accuracy requirement. Manually inspect each result against the unmodified original and correct vertices; for authoritative geometry use manual tracing and cross-reference imagery, not model confidence.

Models are not necessarily present initially. The model manager offers downloads and says downloaded models run offline; downloading requires connectivity and storage. Checked-in size constants range from about 41 MB (EfficientSAM Tiny) to about 3.62 GB (SAM3) (`/Users/adonispuente/Desktop/Developer/labelme/labelme/_ai_models.py`). SAM3 has an explicit license/trade-control/end-use notice; read its actual license before download or use (`/Users/adonispuente/Desktop/Developer/labelme/labelme/_widgets/_models_widget.py`). AI dependencies include `osam` and ONNX Runtime, with an optional WebGPU extra under a platform marker (`/Users/adonispuente/Desktop/Developer/labelme/pyproject.toml`). No model download, license acceptance, or inference was performed in this task.

## Project-specific workflow recommendation

1. Preserve the original satellite raster as read-only; record its exact dimensions and source. Open the original image, not a rescaled screenshot, as the annotation canvas.
2. Use separate labels and shapes for roof sections, identifiable ground footprint, Lot A paved triangle/forecourt, pavement boundaries, rows, centerlines, entrances, shuttle/roundabout, sidewalks and islands. Keep roof and ground-level areas distinct. Use polygons for areas and linestrips for curved/open routes.
3. Save one draft annotation JSON alongside a stable copy of the image or embed image data. Avoid changing the image between tracing and export because coordinates are tied to its pixel dimensions/orientation.
4. Export to project-specific standardized JSON and SVG/PNG only via a deterministic converter; preserve exact source pixel coordinates, label, geometry type, and provenance. Validate file dimensions, finite coordinates, bounds, polygon closure/validity, and round-trip coordinate equality. Overlay the trace on the same original raster and visually review at full resolution.
5. Keep traces as review drafts. Preserve approved Lot A geometry and app code; do not replace either. Do not infer travel directions, access restrictions, or parking counts from pavement appearance. Operational capacities remain the supplied figures, not image-derived counts.

This workflow does not itself prove geometry accuracy. A human review against the primary image and other approved evidence remains required before integration into Three.js.

## Could not confirm

- Whether the local checkout’s Python environment has LabelMe installed or the `labelme` executable resolves; no command was run.
- Actual application launch behavior and GUI interaction in this machine; GUI launch was expressly prohibited.
- Accuracy of AI proposals on the Hope City imagery, actual available GPU/runtime, and whether model files are already cached.
- Any ground sampling distance, georeferencing, or conversion from image pixels to physical units; none is established by the inspected LabelMe source.

**Confidence:** High for repository-supported CLI/schema/shape/model-manager behavior (read directly from current source and README); low/none for local installed state, GUI launch, model performance on this campus, or physical/geospatial accuracy.
