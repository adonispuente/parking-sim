// Compatibility API; every active consumer now reads the unified source pair.
import annotation, { SOURCE_FILE, normalizeLabel } from './clearImageSource.js';
export const TRACE_SOURCE = SOURCE_FILE;
export { normalizeLabel };
export const annotationShape = label => annotation.shapes.find(shape=>normalizeLabel(shape.label)===normalizeLabel(label));
export default annotation;
