# Lot A reconstruction

Goal: a separately reviewable, reference-traced Lot A building, not a surveyed model.

Context: Scene.jsx currently extrudes a single campus.js polygon at uniform height. Existing individual crop comes from zoomed in.png, while campus coordinates use the latest 1698×1378 image. Do not assume these images share an affine alignment.

Steps:
1. Inspect latest-image crop and independently review visible roof boundaries.
2. Trace separate roof masses directly in latest-image pixels, excluding the paved eastern triangle.
3. Render those masses in Three.js; provide an explicit Lot A-only replacement for saved layouts and a source comparison.
4. Test serialization, polygon geometry and unchanged other objects; run tests/build and browser checks.

Unknowns: elevations, precise dimensions, concealed wall edges. Heights are illustrative scene units, not measurements. Out of scope: other buildings, roads, parking counts and rules.
