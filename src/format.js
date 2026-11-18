import { LOT_CAPACITY } from './parkingZones.js';

const countFormat = new Intl.NumberFormat();

/** Locale-aware whole-number formatting for counts shown in the UI (1,584 / 1 584 / 1.584). */
export function formatCount(n) {
  return countFormat.format(n);
}

/** Total user-supplied parking capacity across Lots A, B and C. */
export const TOTAL_LOT_CAPACITY = Object.values(LOT_CAPACITY).reduce((sum, n) => sum + n, 0);

/** "A 411 · B 487 · C 686" — the capacity summary repeated across panels. */
export function lotCapacitySummary(separator = ' · ') {
  return Object.entries(LOT_CAPACITY)
    .map(([lot, n]) => `${lot.toUpperCase()} ${formatCount(n)}`)
    .join(separator);
}
