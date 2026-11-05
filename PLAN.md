# Satellite geometry update

Goal: recognizable top-three-building campus and continuous roads matching images/Mosst updated satelite image.png, cross-checked with images/zoomed in.png.

Context: model.js has rectangular starter buildings and disconnected straight roads; Scene.jsx has an invented tube road and a broken ../apple.png reference. Existing local saves must remain intact.

1. Store normalized footprint and road traces in src/campus.js, preserving image aspect ratio.
2. Replace starter buildings and roads with polygon footprints and flat road ribbons; remove invented context geometry.
3. Align the latest satellite overlay to the same coordinates. Add explicit revised-map loading using the existing confirmation and Undo path.
4. Validate optional shape data, test geometry, run npm test and npm run build, and inspect browser if available.

Risks: roof outlines approximate wall footprints; shadows obscure some edges; driveway widths are visual estimates. No legal directions, verified capacities, or surveyed scale are inferred. Saved user layouts stay intact until explicit replacement.

Out of scope: traffic policy, capacity verification, parking-stall inventory, broader simulation changes.
