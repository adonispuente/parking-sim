# Lot A parking retry

Goal: finish a working, photo-led Lot A layout without LOCAL AI.

Inspection found partial parking polygons and rows in src/lotAParking.js, but no model export/integration, no surface rendering, and no validation or migration persistence. main.jsx already imports the missing export, so the partial app cannot build.

1. Integrate parking into fresh layouts and export its update function.
2. Render and validate polygon surfaces; preserve update revisions across export/reload, backing up old layouts only once.
3. Keep approved roofs unchanged and connected east pavement; use supplied capacities A411/B487/C686, not drawn row counts.
4. Compare visible north/west/southeast banks with the photo and independent GPT MINION 2 review.
5. Add regression tests; run npm test and npm run build, then inspect desktop/mobile browser and console.

Unknown: exact painted stall counts, hidden curbs, signage, heights, and traffic rules. Drawn stripes remain approximations, not a forced 411-space reconstruction. No B/C geometry or traffic-policy changes.
