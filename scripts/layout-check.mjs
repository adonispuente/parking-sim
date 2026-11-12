// npm run layout:check [-- path/to/overlay.json]
// Validates a LabelMe layout overlay and writes an SVG review image to
// research/layout-check/<hash>.svg. Exit 0 = valid, 1 = problems found.
// Geometry checks here use routing helpers; the runtime parser stays pure.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseOverlay, LayoutOverlayError, RUNTIME_FEATURES, OVERLAY_FILE } from '../src/layoutOverlay.js';
import { checkLayoutGeometry, featureRing as ring } from '../src/layoutGeometryCheck.js';
import { buildOverlayPositions, PositionDefinitionError } from '../src/positions/overlayDefinitions.js';
import { IMAGE_SIZE, STAFF_POSITIONS } from '../src/clearImageSource.js';

const file = process.argv[2] ?? OVERLAY_FILE;
const text = fs.readFileSync(file, 'utf8');
const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
let doc;
try { doc = JSON.parse(text); } catch (e) { console.error(`FAIL ${file}: not valid JSON (${e.message})`); process.exit(1); }
let layout;
try { layout = parseOverlay(doc); }
catch (e) { if (!(e instanceof LayoutOverlayError)) throw e; console.error(`FAIL ${file}\n${e.message}`); process.exit(1); }

// S4 checks definitions too, so a visually valid point cannot crash the app later.
try { buildOverlayPositions(layout, undefined, [...STAFF_POSITIONS.map(p => p.id), 'equityClayStop']); }
catch (e) { if (!(e instanceof PositionDefinitionError)) throw e; console.error(`FAIL ${file}\n${e.message}`); process.exit(1); }

// Geometry checks are shared with the in-app Routes view (src/layoutGeometryCheck.js).
const geo = checkLayoutGeometry(layout), badIds = geo.badIds, warnings = geo.warnings;
const problems = geo.problems.map(p => `${p.id}: ${p.message}`);

// SVG review image: overlay on the source photo. Colour = confidence, red = problem.
const colour = f => badIds.has(f.id) ? '#e0312b' : { confirmed:'#2e9d4f', estimated:'#e3a21a', unknown:'#8a8a8a' }[f.fields.confidence] ?? '#3a6fd8';
const outDir = 'research/layout-check'; fs.mkdirSync(outDir, { recursive: true });
const img = path.relative(outDir, 'images/Clear Image.png').split(path.sep).map(encodeURIComponent).join('/');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]);
const P = pts => pts.map(p => p.join(',')).join(' ');
const body = layout.features.filter(f => f.kind !== 'meta').map(f => {
  const c = colour(f), tag = RUNTIME_FEATURES.includes(f.id) ? ' [runtime]' : ' [advisory]', t = `<title>${esc(f.id + tag)}</title>`;
  const [lx, ly] = f.points[0], right = lx > IMAGE_SIZE.width - 260;
  const label = `<text x="${right ? lx - 6 : lx + 6}" y="${Math.max(16, ly - 6)}" text-anchor="${right ? 'end' : 'start'}" font-size="12" fill="${c}" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(f.id + tag)}</text>`;
  if (f.type === 'point') return `<g>${t}<circle cx="${f.points[0][0]}" cy="${f.points[0][1]}" r="5" fill="${c}"/>${label}</g>`;
  if (f.type === 'rectangle' || f.type === 'polygon') return `<g>${t}<polygon points="${P(ring(f))}" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="2" stroke-dasharray="${f.kind==='stage'||f.kind==='oneway'?'6 4':'0'}"/>${label}</g>`;
  return `<g>${t}<polyline points="${P(f.points)}" fill="none" stroke="${c}" stroke-width="3" marker-end="${f.kind==='lane'?'url(#arrow)':''}"/>${label}</g>`;
}).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${IMAGE_SIZE.width} ${IMAGE_SIZE.height}" width="${IMAGE_SIZE.width}" height="${IMAGE_SIZE.height}">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="context-stroke"/></marker></defs>
<image href="${img}" xlink:href="${img}" width="${IMAGE_SIZE.width}" height="${IMAGE_SIZE.height}"/>
${body}
<text x="10" y="${IMAGE_SIZE.height-12}" font-size="14" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(`${file} · ${hash} · green confirmed · amber estimated · grey unknown · red problem · dashed = rule area`)}</text>
</svg>\n`;
const out = path.join(outDir, `${hash}.svg`); fs.writeFileSync(out, svg);

const features = layout.features.filter(f => f.kind !== 'meta');
console.log(`${problems.length ? 'FAIL' : 'PASS'} ${file} (${features.length} features, sha256 ${hash})`);
for (const f of features) console.log(`  ${RUNTIME_FEATURES.includes(f.id) ? 'runtime ' : 'advisory'} ${f.id}  evidence=${f.fields.evidence} confidence=${f.fields.confidence}`);
warnings.forEach(w => console.log(`  warn: ${w}`));
problems.forEach(p => console.log(`  problem: ${p}`));
console.log(`  review image: ${out}`);
process.exit(problems.length ? 1 : 0);
