/**
 * Convierte un valor de fecha/timestamp a milisegundos.
 * Soporta: number, string (ISO/parseable), Firestore Timestamp (.toMillis(), .toDate(), .seconds), null/undefined.
 * @param {*} value
 * @returns {number} milisegundos desde epoch, o 0 si no se puede convertir
 */
export function toMillis(value) {
  try {
    if (value == null) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return 0;
  } catch {
    return 0;
  }
}
