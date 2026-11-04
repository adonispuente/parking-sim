# Parking Flow — first working slice

## Goal
A phone-first React + Three.js editor that opens with a schematic of the supplied church-site image and lets the user refine three provisional lots, roads, parking spaces, barricades and volunteer positions with roles.

## Inspected context
The repository initially contains only LICENSE and `Screenshot 2026-11-03 at 4.46.22 PM.png` (1136×918). The image shows a western Hope City building, a central building, an eastern building and connecting roads. It does not establish exact stall counts, three approved lot boundaries, route directions or permissions to use neighboring properties.

## Approach
1. Scaffold a React/Vite app with a Three.js orthographic site viewport and a source-image reference toggle.
2. Trace schematic buildings, roads and three clearly provisional editable lots against image coordinates.
3. Add touch-friendly select/place/move tools, parking rows, barricades, role positions, building and road creation; expose edits in an inspector.
4. Add local persistence, JSON import/export with validation, reset and a clearly labeled illustrative traffic preview.
5. Test the model and file validation with Node tests, run the production build, and exercise desktop/mobile UI in a real browser.

## Risks and verification
- Geometry and capacity are unverified: show this in the UI and documentation, never present sample data as church policy.
- Mobile WebGL and touch controls: test at phone width; provide a visible fallback if WebGL cannot initialize.
- Saved/imported layouts: schema validation and bounds checks before use; preserve current layout on invalid import; test round trips and invalid inputs.
- Preview is not a traffic-engineering simulation: no collision, queue or safety claims.

## Out of scope
Accounts, backend, deployment, measured surveying, approved volunteer lessons, predictive traffic simulation and multiplayer.
