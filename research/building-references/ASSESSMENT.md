# Individual building reference assessment

Source: `images/zoomed in.png` (2030 × 906). Individual crops preserve original pixels, without perspective correction. These are references, not reconstructed meshes.

## Lot A
`lot-a.png`: crop x=190, y=150, width=470, height=580.
Visible: a broad main roof with multiple perimeter offsets; a long narrower extension toward the bottom of the crop; raised rectangular rooftop equipment/enclosures. The principal roof and extension should be separate masses rather than one flat extruded outline. Do not treat the paved triangular area to the right as roof. Roof heights, wall openings, and concealed walls cannot be measured from this view.

## Lot B
`lot-b.png`: crop x=890, y=260, width=310, height=550.
Visible: two elongated roof masses on the same diagonal axis, offset laterally and joined near their ends. Apparent roof shading in the crop is ambiguous: cross-checking `images/Mosst updated satelite image.png` does not establish pitched roofs and shows predominantly flat surfaces with equipment. Do not infer a pitched roof from this crop. A single extrusion loses the separate roof masses. Tree cover obscures portions of the perimeter. Roof slope and building heights need additional evidence.

## Lot C
`lot-c.png`: crop x=1430, y=270, width=405, height=330.
Visible: two broad approximately parallel rectangular roof wings, joined by a central connector, with opposing recessed side areas. Small rooftop equipment groups are visible. Separate wings and connector should be modeled, not merely a solid slab. Heights remain unknown.

## Why the current models are inadequate
`src/campus.js` defines one 2D boundary per building. A boundary alone cannot express the distinct roof masses, slopes, and heights above. Keep app geometry unchanged during this review rather than substituting another unverified outline.

## Decision: how to get faithful building assets
A. Free single-image generative reconstruction: fastest draft, but it must invent unseen walls and may alter roof geometry. Test only; no claim of architectural accuracy.
B. Reference-traced low-poly modeling: manually trace each roof mass from these crops, set explicit estimated heights, and compare top-down overlays. More effort, but controllable footprints and useful mobile geometry.
C. Multi-view capture/photogrammetry: collect authorized overlapping ground/oblique views; more real surface evidence, but substantial capture/cleanup effort and possible access constraints. One satellite screenshot is not a multi-view scan.

Recommendation: B for the accepted assets, with a free A experiment if downloadable output is verified by the delegated research. Start with A's distinctive main block and long extension; review its top-down silhouette before doing B and C. Export a GLB if using Blender; keep individual building assets separate. Do not add detail that changes parking clearances without evidence.

Acceptance: each building separately recognizable against its source crop; roof masses preserved; top-down outline compared against the same reference; inferred heights explicitly recorded; mobile rendering checked after import. No road, capacity, or parking-policy changes in this task.

Next evidence that would improve fidelity: one known building dimension for scale and ground-level photographs showing roof/wall height relationships. Not prerequisites for a clearly labeled schematic draft.

No external image uploads or 3D generation were performed in this assessment.
