
export function dividirTextoEnChunks(texto, tamanoChunk = 1000) {
  if (!texto || texto.trim().length === 0) return [];
  
  // Dividir por párrafos primero (doble salto de línea)
  const parrafos = texto.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks = [];
  let chunkActual = '';
  
  for (const parrafo of parrafos) {
    // Si el chunk actual + nuevo párrafo excede el tamaño, guardar chunk actual
    if (chunkActual.length + parrafo.length > tamanoChunk && chunkActual.length > 0) {
      chunks.push(chunkActual.trim());
      chunkActual = parrafo;
    } else {
      chunkActual += (chunkActual.length > 0 ? '\n\n' : '') + parrafo;
    }
  }
  
  // Agregar último chunk si tiene contenido
  if (chunkActual.trim().length > 0) {
    chunks.push(chunkActual.trim());
  }
  
  return chunks.length > 0 ? chunks : [texto];
}

export function formatearTextoMensaje(texto) {
  // Placeholder: Implementación real debería formatear el texto para mostrarlo en el chat (ej. markdown a HTML).
  return texto;
}
