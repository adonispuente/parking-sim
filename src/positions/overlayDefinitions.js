// M3 S4: explicit definition stubs, not traffic controllers. No routing imports.
export const OVERLAY_DEFINITIONS = Object.freeze({
  'pos:c-layout-demo': Object.freeze({
    title: 'Lot C layout demo',
    duty: 'Demonstrates adding a named position without editing the original map. This is not a confirmed real-world worker location.',
    implemented: 'Advisory Routes marker and registry entry only. No worker, radio, stop or traffic admission is activated.',
    intended: Object.freeze([]),
    provisional: Object.freeze(['Illustrative point near Lot C, checked only against source roofs; not a surveyed work station']),
    controllers: Object.freeze([]),
  }),
});

export class PositionDefinitionError extends Error {
  constructor(problems) {
    super(`Overlay positions invalid:\n- ${problems.join('\n- ')}`);
    this.name = 'PositionDefinitionError';
    this.problems = problems;
  }
}

// Pure constructor, also usable by a future definition checker/editor.
// Advisory means no controller registration even when staffed metadata is true.
export function buildOverlayPositions(layout, definitions = OVERLAY_DEFINITIONS, reservedIds = []) {
  const features = layout.features.filter(f => f.kind === 'pos');
  const ids = new Set(features.map(f => f.id));
  const reserved = new Set(reservedIds), problems = [], positions = [];
  for (const id of Object.keys(definitions)) {
    if (!ids.has(id)) problems.push(`${id}: definition has no matching pos: point`);
  }
  for (const feature of features) {
    const { id, fields } = feature;
    if (reserved.has(id) || reserved.has(id.slice(4))) problems.push(`${id}: collides with an existing position id`);
    const d = Object.hasOwn(definitions, id) ? definitions[id] : null;
    if (!d || typeof d !== 'object' || Array.isArray(d)) {
      problems.push(`${id}: missing definition stub in src/positions/overlayDefinitions.js`);
      continue;
    }
    for (const key of ['title', 'duty', 'implemented']) {
      if (typeof d[key] !== 'string' || !d[key].trim()) problems.push(`${id}: ${key} must be nonempty text`);
    }
    for (const key of ['intended', 'provisional', 'controllers']) {
      if (!Array.isArray(d[key]) || !d[key].every(v => typeof v === 'string' && v.trim()))
        problems.push(`${id}: ${key} must be a list of nonempty strings`);
    }
    if (!Array.isArray(d.controllers) || d.controllers.length !== 0)
      problems.push(`${id}: S4 advisory definitions must have controllers: []`);
    if (!fields.role?.trim() || !['true', 'false'].includes(fields.staffed))
      problems.push(`${id}: requires role and staffed=true|false metadata`);
    positions.push(Object.freeze({
      id, title: d.title, duty: d.duty, implemented: d.implemented,
      intended: Object.freeze([...(Array.isArray(d.intended) ? d.intended : [])]),
      provisional: Object.freeze([...(Array.isArray(d.provisional) ? d.provisional : [])]),
      controllers: Object.freeze([]), point: feature.points[0], index: null,
      aliases: Object.freeze([]), label: d.title, role: fields.role,
      staffed: fields.staffed === 'true', active: false, status: 'advisory',
      source: 'images/layout-overlay.json', confidence: fields.confidence,
      evidence: fields.evidence,
    }));
  }
  if (problems.length) throw new PositionDefinitionError(problems);
  return Object.freeze(positions);
}
