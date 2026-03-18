/**
 * Utilidades de parsing y selección de modelos IA permitidos.
 * Centraliza la lógica duplicada en chat.completion, preLectura y webSearch.
 */

/**
 * Parsea una lista CSV de modelos permitidos desde variable de entorno o fallback.
 * @param {string} envValue - Valor crudo de la variable de entorno.
 * @param {string} [fallbackCsv=''] - CSV de fallback si envValue está vacío.
 * @returns {Set<string>} Modelos permitidos (nunca vacío si fallbackCsv provee uno).
 */
export function parseAllowedModels(envValue, fallbackCsv = '') {
  const raw = String(envValue || '').trim();
  const csv = raw || String(fallbackCsv || '').trim();
  return new Set(
    csv
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
}

/**
 * Selecciona un modelo entre los permitidos, o cae al fallback.
 * @param {object} opts
 * @param {string} [opts.requested] - Modelo solicitado por el cliente.
 * @param {Set<string>} opts.allowed - Set de modelos permitidos.
 * @param {string} [opts.fallback] - Modelo por defecto si el solicitado no está permitido.
 * @returns {string} Modelo elegido.
 */
export function pickAllowedModel({ requested, allowed, fallback }) {
  const requestedModel = String(requested || '').trim();
  const fallbackModel = String(fallback || '').trim();

  if (allowed && allowed.size > 0) {
    if (requestedModel && allowed.has(requestedModel)) return requestedModel;
    if (fallbackModel && allowed.has(fallbackModel)) return fallbackModel;
    return Array.from(allowed)[0];
  }

  return requestedModel || fallbackModel;
}
