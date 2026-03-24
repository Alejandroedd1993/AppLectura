/**
 * Utilidad compartida para limpiar respuestas JSON de modelos de IA.
 * Elimina markdown code fences (```json / ```) y extrae el bloque JSON.
 */

/**
 * Elimina bloques markdown ```json ... ``` y extrae el JSON contenido.
 * @param {string} rawContent - Respuesta cruda de IA que puede contener fences
 * @returns {string} - String limpio listo para JSON.parse()
 */
export function stripJsonFences(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') return rawContent || '';

  let cleaned = rawContent.trim();

  // Eliminar bloques markdown ```json ... ```
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');

  // Extraer el primer bloque JSON detectado, preservando arrays cuando abren antes que objetos.
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectIndex = objectMatch ? cleaned.indexOf(objectMatch[0]) : -1;
  const arrayIndex = arrayMatch ? cleaned.indexOf(arrayMatch[0]) : -1;

  if (arrayIndex !== -1 && (objectIndex === -1 || arrayIndex < objectIndex)) {
    cleaned = arrayMatch[0];
  } else if (objectIndex !== -1) {
    cleaned = objectMatch[0];
  }

  return cleaned;
}
