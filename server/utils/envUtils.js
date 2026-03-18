/**
 * Utilidades de parsing de variables de entorno.
 * Centraliza parseBool para evitar N copias con semántica divergente.
 */

/**
 * Interpreta un valor como booleano.
 * Acepta strings como 'true', '1', 'yes', 'on' (case-insensitive).
 * @param {*} value - Valor a interpretar (string, boolean, undefined, null).
 * @param {boolean} [fallback=false] - Valor por defecto si el input está vacío.
 * @returns {boolean}
 */
export function parseBool(value, fallback = false) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}
