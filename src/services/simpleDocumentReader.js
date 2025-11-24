/**
 * Lector de Documentos SIMPLE y DIRECTO
 * Sin complejidad innecesaria - solo divide el texto en párrafos legibles
 */

/**
 * Procesa un documento y lo divide en párrafos
 * @param {string} text - Texto crudo del documento
 * @returns {Array<string>} - Array de párrafos
 */
export function processDocument(text) {
  console.log('📖 [SimpleReader] === INICIO ===');
  console.log('📄 Longitud texto:', text?.length || 0);
  
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn('⚠️ Texto vacío o inválido');
    return [];
  }

  // 1. Limpiar texto
  let cleaned = text
    // Eliminar caracteres de control
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalizar saltos de línea
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Limpiar espacios
    .trim();
  
  console.log('✅ Texto limpiado:', cleaned.length, 'caracteres');
  console.log('📝 Primeros 300 caracteres:', cleaned.substring(0, 300));

  let paragraphs = [];

  // ESTRATEGIA 1: Dividir por doble salto de línea
  console.log('\n🔄 Estrategia 1: Doble salto de línea (\\n\\n)');
  paragraphs = cleaned
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length >= 20);
  
  console.log(`   Resultado: ${paragraphs.length} párrafos`);
  
  // Si hay muy pocos, probar estrategia 2
  if (paragraphs.length < 5) {
    console.log('\n🔄 Estrategia 2: Salto de línea simple (\\n)');
    paragraphs = cleaned
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length >= 30); // Más restrictivo para evitar líneas sueltas
    
    console.log(`   Resultado: ${paragraphs.length} líneas`);
  }

  // Si aún hay pocos, probar estrategia 3
  if (paragraphs.length < 5) {
    console.log('\n🔄 Estrategia 3: Por oraciones (. + Mayúscula)');
    
    // Dividir por punto seguido de espacio y mayúscula
    paragraphs = cleaned
      .split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/)
      .map(p => {
        const trimmed = p.trim();
        // Re-agregar el punto si no termina con uno
        return trimmed.endsWith('.') ? trimmed : trimmed + '.';
      })
      .filter(p => p.length >= 50); // Oraciones completas
    
    console.log(`   Resultado: ${paragraphs.length} oraciones`);
  }

  // Si TODAVÍA hay muy pocos, crear bloques fijos
  if (paragraphs.length < 3) {
    console.log('\n🔄 Estrategia 4: Bloques fijos de 2000 caracteres');
    paragraphs = [];
    const blockSize = 2000;
    
    for (let i = 0; i < cleaned.length; i += blockSize) {
      const block = cleaned.substring(i, i + blockSize).trim();
      if (block.length > 0) {
        paragraphs.push(block);
      }
    }
    
    console.log(`   Resultado: ${paragraphs.length} bloques`);
  }

  // Validación final
  paragraphs = paragraphs.filter(p => {
    // Debe tener al menos 15 caracteres
    if (p.length < 15) return false;
    
    // Debe contener al menos letras (no solo números/símbolos)
    if (!/[a-záéíóúñA-ZÁÉÍÓÚÑ]{2,}/.test(p)) return false;
    
    return true;
  });

  console.log('\n✅ FINAL:', paragraphs.length, 'párrafos válidos');
  console.log('📊 Primeros 5 párrafos (100 chars cada uno):');
  paragraphs.slice(0, 5).forEach((p, i) => {
    console.log(`   [${i}]: ${p.substring(0, 100)}...`);
  });
  
  console.log('📖 [SimpleReader] === FIN ===\n');
  
  return paragraphs;
}

/**
 * Analiza la calidad del resultado
 */
export function analyzeQuality(paragraphs) {
  if (!paragraphs || paragraphs.length === 0) {
    return { quality: 'empty', message: 'Sin párrafos' };
  }

  const avgLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
  
  if (paragraphs.length === 1) {
    return { quality: 'poor', message: 'Solo 1 párrafo - documento sin segmentar' };
  }
  
  if (paragraphs.length < 5) {
    return { quality: 'low', message: `${paragraphs.length} párrafos - segmentación mínima` };
  }
  
  if (avgLength > 1500) {
    return { quality: 'low', message: 'Párrafos muy largos (promedio > 1500 chars)' };
  }
  
  if (avgLength < 50) {
    return { quality: 'low', message: 'Párrafos muy cortos (promedio < 50 chars)' };
  }
  
  return {
    quality: 'good',
    message: `${paragraphs.length} párrafos, longitud promedio: ${Math.round(avgLength)} caracteres`
  };
}
