import annotation from '../images/HopeCityLayoutCUpdated.json' with { type: 'json' };

// One source for rendering, parking masks, street routing and shuttle driveways.
// LabelMe whitespace and the source's 'entrace' typo do not change identity.
export const TRACE_SOURCE = 'images/HopeCityLayoutCUpdated.json';
export const normalizeLabel = label => label.toLowerCase().replace(/entrace/g,'entrance').replace(/\s+/g,' ').trim();
export const annotationShape = label => annotation.shapes.find(shape=>normalizeLabel(shape.label)===normalizeLabel(label));
if(annotation.imageWidth!==735||annotation.imageHeight!==566)throw new Error('Updated C trace does not match the satellite image dimensions.');
export default annotation;
