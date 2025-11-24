// Utilidades para construir contexto de prompts de tutor y enriquecimiento web
// Centraliza la lógica que antes estaba duplicada entre LecturaInteractiva y ReadingWorkspace.

/**
 * buildContextFromFullText
 * Limita el texto completo y añade nota si fue truncado.
 * @param {string} texto
 * @param {number} maxChars
 * @returns {string}
 */
export function buildContextFromFullText(texto, maxChars = 8000) {
  if (!texto) return '';
  if (texto.length <= maxChars) {
    return `Texto completo del documento:\n${texto}`;
  }
  return `Texto completo del documento (truncado a ${maxChars} caracteres):\n${texto.slice(0, maxChars)}...\n[NOTA: Texto original tenía ${texto.length} caracteres]`;
}

/**
 * buildContextFromParagraphSelection
 * Construye contexto cuando hay un párrafo seleccionado + algunos adyacentes.
 * @param {Array<{contenido:string}>} parrafos
 * @param {number} indexSeleccionado
 * @param {number} maxChars
 * @returns {string}
 */
export function buildContextFromParagraphSelection(parrafos, indexSeleccionado, maxChars = 8000) {
  if (!Array.isArray(parrafos) || indexSeleccionado == null || indexSeleccionado < 0 || indexSeleccionado >= parrafos.length) {
    return '';
  }
  const parrafoActual = parrafos[indexSeleccionado].contenido;
  const inicio = Math.max(0, indexSeleccionado - 2);
  const fin = Math.min(parrafos.length, indexSeleccionado + 3);
  const contextoParagrafos = parrafos.slice(inicio, fin)
    .map((p, i) => `${i === (indexSeleccionado - inicio) ? '>>> ' : ''}${p.contenido}`)
    .join('\n\n');
  return `Párrafo específico seleccionado:\n"${parrafoActual}"\n\nContexto adicional:\n${contextoParagrafos.substring(0, maxChars)}`;
}

/**
 * buildTutorContext decide según si hay selección de párrafo.
 */
export function buildTutorContext({ texto, parrafos, selectedIndex }) {
  if (selectedIndex != null) {
    const ctx = buildContextFromParagraphSelection(parrafos, selectedIndex);
    if (ctx) return ctx;
  }
  return buildContextFromFullText(texto);
}

/**
 * buildReadingWorkspaceContext genera contexto resumido (versión ligera) para ReadingWorkspace.
 */
export function buildReadingWorkspaceContext(texto, maxChars = 4000) {
  if (!texto) return '';
  const base = texto.length > maxChars ? texto.slice(0, maxChars) + '\n[Texto truncado]' : texto;
  return `Texto base para contextualizar la pregunta del usuario:\n${base}`;
}

export default {
  buildContextFromFullText,
  buildContextFromParagraphSelection,
  buildTutorContext,
  buildReadingWorkspaceContext
};
