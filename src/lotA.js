// Traced roof edges in the latest satellite crop (190,180), 410×500 pixels.
// Heights are illustrative scene units, NOT measured building elevations.
export const LOT_A_CROP = { x: 190, y: 180, width: 410, height: 500 };
export const LOT_A_MASSES = [
  { name: 'West and lower roof', height: 1.8, color: '#eeeadd', points: [[140,68],[210,105],[143,214],[285,295],[220,277],[184,336],[108,321],[126,290],[84,299],[26,265]] },
  { name: 'Main hall roof', height: 2.5, color: '#eeeadd', points: [[210,83],[360,165],[285,295],[143,214]] },
  { name: 'Long south wing', height: 1.8, color: '#eeeadd', points: [[108,321],[184,336],[114,451],[48,423]] },
  { name: 'East triangle · occasional parking', height: .1, color: '#858b8b', points: [[360,165],[369,207],[369,331],[285,295]], surface: 'parking' },
];
export function lotABuilding() {
  const scale = 113.6 / 1698;
  const x = (190 + 193) * scale, z = (180 + 260) * scale;
  const masses = LOT_A_MASSES.map(mass => ({ ...mass,
    points: mass.points.map(([px,py]) => [(px-193)*scale,(py-260)*scale]) }));
  return { id: 'church', type: 'building', name: 'Lot A · traced roof masses',
    x, z, width: 343*scale, depth: 383*scale, rotation: 0,
    points: [[-167,-192],[176,-192],[176,191],[-167,191]].map(p=>p.map(n=>n*scale)),
    masses, modelRevision: 'lot-a-roofs-3', heightNote: 'Illustrative roof heights; east triangle is ground-level occasional parking, joined along the full east roof edge.' };
}
// Clear existing positions once; retain positions added after this update.
export function upgradeLotADraft(layout) {
  const clearOldPositions = layout.lotADraftRevision !== 2;
  return { ...layout, lotADraftRevision: 2, items: layout.items
    .filter(i => !clearOldPositions || i.type !== 'position')
    .map(i => {
      if (i.id !== 'church' || i.modelRevision === 'lot-a-roofs-3') return i;
      if (!i.modelRevision) return lotABuilding();
      return { ...lotABuilding(), x: i.x, z: i.z, rotation: i.rotation };
    }) };
}
export function replaceLotA(layout) {
  const next = lotABuilding();
  return { ...layout, items: layout.items.some(i=>i.id==='church')
    ? layout.items.map(i=>i.id==='church'?next:i) : [...layout.items,next] };
}
