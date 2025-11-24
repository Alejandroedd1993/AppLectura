/**
 * Servicio Universal de Lectura de Documentos
 * Similar a lectores EPUB profesionales (Calibre, Adobe Digital Editions)
 * 
 * Estrategias múltiples para segmentación robusta:
 * 1. Por estructura (títulos, secciones)
 * 2. Por párrafos (puntos finales + línea nueva)
 * 3. Por líneas vacías (doble salto)
 * 4. Por longitud máxima (fallback)
 */

// Configuración de segmentación
const CONFIG = {
  // Longitudes ideales
  MIN_PARAGRAPH_LENGTH: 20,      // Mínimo 20 caracteres para ser párrafo válido
  MAX_PARAGRAPH_LENGTH: 3000,    // Máximo 3000 caracteres por párrafo (para performance)
  IDEAL_PARAGRAPH_LENGTH: 500,   // Longitud ideal para lectura
  
  // Patrones de segmentación
  SENTENCE_ENDINGS: /[.!?;]\s*$/,  // Final de oración
  PARAGRAPH_BREAK: /\n\s*\n/,      // Doble salto de línea
  LINE_BREAK: /\n/,                 // Simple salto de línea
  
  // Detección de estructura (patrones expandidos)
  SECTION_HEADERS: /^(capítulo|chapter|sección|section|parte|part|título|title|anexo|annex|apéndice|appendix|prefacio|preface|prólogo|prologue|epílogo|epilogue|\d+\.?\s+[A-ZÑÁÉÍÓÚ])/i,
  LIST_MARKERS: /^(\d+[\.\)]\s+|[a-z][\.\)]\s+|[ivxlcdm]+[\.\)]\s+|•|–|—|✓|✗|►|▪|◆|○|●|\*|\-|\+)\s+/i,
  
  // Limpieza
  // eslint-disable-next-line no-control-regex
  CONTROL_CHARS: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g,
  MULTIPLE_SPACES: /\s{2,}/g,
  MULTIPLE_NEWLINES: /\n{3,}/g,
};

/**
 * Limpia y normaliza el texto crudo
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  
  let cleaned = text;
  
  // 1. Eliminar caracteres de control y basura
  cleaned = cleaned.replace(CONFIG.CONTROL_CHARS, '');
  
  // 2. Normalizar saltos de línea (Windows, Mac, Unix)
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 3. Consolidar múltiples saltos de línea
  cleaned = cleaned.replace(CONFIG.MULTIPLE_NEWLINES, '\n\n');
  
  // 4. Consolidar múltiples espacios
  cleaned = cleaned.replace(CONFIG.MULTIPLE_SPACES, ' ');
  
  // 5. Limpiar espacios al inicio/final de líneas
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  return cleaned.trim();
}

/**
 * Valida si un texto es un párrafo válido
 * ✅ MEJORADO - Más permisivo pero con validaciones inteligentes
 */
function isValidParagraph(text) {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  
  // Debe tener longitud mínima (reducida de 20 a 15 para títulos cortos)
  if (trimmed.length < 15) return false;
  
  // No debe ser solo números, espacios o símbolos básicos
  if (/^[\d\s\.\-–—_]+$/.test(trimmed)) return false;
  
  // Debe contener al menos 2 palabras con letras (reducido de 3 para flexibilidad)
  const words = trimmed.match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]{2,}/g);
  if (!words || words.length < 2) return false;
  
  return true;
}

/**
 * Estrategia 1: Segmentación por doble salto de línea
 * Respeta la estructura original del documento
 * ✅ PREFERIDA - Más confiable para documentos bien formateados
 */
function segmentByDoubleNewline(text) {
  const paragraphs = text.split(CONFIG.PARAGRAPH_BREAK)
    .map(p => p.trim())
    .filter(p => isValidParagraph(p));
  
  console.log(`📄 [DocumentReader] Estrategia 1: ${paragraphs.length} párrafos por doble salto`);
  
  // Validar que produjo resultados razonables
  // Aceptar desde 1 párrafo (documentos cortos) hasta 2000 (libros largos)
  if (paragraphs.length >= 1 && paragraphs.length < 2000) {
    return paragraphs;
  }
  
  return null; // Estrategia falló
}

/**
 * Estrategia 2: Segmentación por oraciones + contexto
 * Agrupa oraciones en párrafos lógicos
 * ✅ MEJORADA - Mejor para PDFs sin formato
 */
function segmentBySentences(text) {
  // Dividir por puntos seguidos de mayúscula o salto de línea
  // Mejorado: también detecta puntos seguidos de comillas o paréntesis
  const sentences = text.split(/([.!?;]["']?\s+(?=[A-ZÑÁÉÍÓÚ¿¡"']|\n))/g)
    .filter(Boolean);
  
  const paragraphs = [];
  let currentParagraph = '';
  
  for (let i = 0; i < sentences.length; i++) {
    currentParagraph += sentences[i];
    
    // Condiciones para cerrar párrafo:
    const hasEnoughLength = currentParagraph.length >= CONFIG.IDEAL_PARAGRAPH_LENGTH;
    const endsWithPunctuation = CONFIG.SENTENCE_ENDINGS.test(currentParagraph);
    const nextIsNewline = sentences[i + 1]?.startsWith('\n');
    const tooLong = currentParagraph.length > CONFIG.MAX_PARAGRAPH_LENGTH;
    
    if ((hasEnoughLength && endsWithPunctuation) || nextIsNewline || tooLong) {
      const trimmed = currentParagraph.trim();
      if (isValidParagraph(trimmed)) {
        paragraphs.push(trimmed);
      }
      currentParagraph = '';
    }
  }
  
  // Agregar último párrafo si existe
  if (currentParagraph.trim() && isValidParagraph(currentParagraph.trim())) {
    paragraphs.push(currentParagraph.trim());
  }
  
  console.log(`✍️ [DocumentReader] Estrategia 2: ${paragraphs.length} párrafos por oraciones`);
  
  if (paragraphs.length >= 1) {
    return paragraphs;
  }
  
  return null;
}

/**
 * Estrategia 3: Segmentación por líneas con análisis de contexto
 * Detecta párrafos por cambios de contexto y líneas vacías
 */
function segmentByLines(text) {
  const lines = text.split(CONFIG.LINE_BREAK).map(l => l.trim());
  const paragraphs = [];
  let currentParagraph = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    
    // Línea vacía = separador de párrafos
    if (!line) {
      if (currentParagraph.trim() && isValidParagraph(currentParagraph.trim())) {
        paragraphs.push(currentParagraph.trim());
      }
      currentParagraph = '';
      continue;
    }
    
    // Agregar línea al párrafo actual
    currentParagraph += (currentParagraph ? ' ' : '') + line;
    
    // Detectar finales de párrafo por contexto
    const isHeader = CONFIG.SECTION_HEADERS.test(line);
    const nextIsEmpty = !nextLine;
    const nextIsHeader = nextLine && CONFIG.SECTION_HEADERS.test(nextLine);
    const endsWithPunctuation = CONFIG.SENTENCE_ENDINGS.test(line);
    const tooLong = currentParagraph.length > CONFIG.MAX_PARAGRAPH_LENGTH;
    
    if (isHeader || nextIsEmpty || nextIsHeader || tooLong || (endsWithPunctuation && currentParagraph.length > CONFIG.IDEAL_PARAGRAPH_LENGTH)) {
      const trimmed = currentParagraph.trim();
      if (isValidParagraph(trimmed)) {
        paragraphs.push(trimmed);
      }
      currentParagraph = '';
    }
  }
  
  // Agregar último párrafo
  if (currentParagraph.trim() && isValidParagraph(currentParagraph.trim())) {
    paragraphs.push(currentParagraph.trim());
  }
  
  console.log(`📋 [DocumentReader] Estrategia 3: ${paragraphs.length} párrafos por líneas`);
  
  if (paragraphs.length >= 2) {
    return paragraphs;
  }
  
  return null;
}

/**
 * Estrategia 4: Segmentación por bloques de longitud fija (fallback)
 * Garantiza que siempre se pueda leer el texto
 */
function segmentByFixedLength(text) {
  const paragraphs = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + CONFIG.MAX_PARAGRAPH_LENGTH;
    
    // Si no es el final del texto, buscar un punto de corte natural
    if (end < text.length) {
      // Buscar el último punto, espacio o salto de línea
      const chunk = text.substring(start, end + 100);
      const lastPeriod = chunk.lastIndexOf('. ');
      const lastNewline = chunk.lastIndexOf('\n');
      const lastSpace = chunk.lastIndexOf(' ');
      
      const breakPoint = Math.max(lastPeriod, lastNewline, lastSpace);
      if (breakPoint > 0 && breakPoint < CONFIG.MAX_PARAGRAPH_LENGTH + 100) {
        end = start + breakPoint + 1;
      }
    }
    
    const paragraph = text.substring(start, end).trim();
    if (isValidParagraph(paragraph)) {
      paragraphs.push(paragraph);
    }
    
    start = end;
  }
  
  console.log(`🔧 [DocumentReader] Estrategia 4 (fallback): ${paragraphs.length} bloques de longitud fija`);
  
  return paragraphs;
}

/**
 * FUNCIÓN PRINCIPAL: Procesa cualquier documento con estrategias múltiples
 * 
 * @param {string} rawText - Texto crudo del documento
 * @param {object} options - Opciones de configuración
 * @returns {Array<string>} - Array de párrafos limpios y válidos
 */
export function processDocument(rawText, options = {}) {
  console.log('📖 [DocumentReader] Iniciando procesamiento de documento...');
  
  // Validación inicial
  if (!rawText || typeof rawText !== 'string') {
    console.error('❌ [DocumentReader] Texto inválido recibido');
    return [];
  }
  
  // 1. Limpieza y normalización
  const cleanedText = cleanText(rawText);
  
  if (!cleanedText || cleanedText.length < 50) {
    console.error('❌ [DocumentReader] Texto demasiado corto después de limpieza');
    return [];
  }
  
  console.log(`✅ [DocumentReader] Texto limpio: ${cleanedText.length} caracteres`);
  
  // 2. Intentar estrategias en orden de prioridad
  const strategies = [
    { name: 'Doble salto', fn: segmentByDoubleNewline },
    { name: 'Por oraciones', fn: segmentBySentences },
    { name: 'Por líneas', fn: segmentByLines },
    { name: 'Longitud fija', fn: segmentByFixedLength },
  ];
  
  for (const strategy of strategies) {
    try {
      const result = strategy.fn(cleanedText);
      
      if (result && result.length > 0) {
        console.log(`✅ [DocumentReader] Éxito con estrategia: ${strategy.name}`);
        console.log(`📊 [DocumentReader] Total de párrafos: ${result.length}`);
        console.log(`📏 [DocumentReader] Longitud promedio: ${Math.round(result.reduce((sum, p) => sum + p.length, 0) / result.length)} caracteres`);
        
        return result;
      }
    } catch (error) {
      console.error(`❌ [DocumentReader] Error en estrategia ${strategy.name}:`, error);
    }
  }
  
  // Si todo falló, devolver texto completo como un solo párrafo
  console.warn('⚠️ [DocumentReader] Todas las estrategias fallaron, devolviendo texto completo');
  return [cleanedText];
}

/**
 * Análisis de calidad del texto procesado
 */
export function analyzeTextQuality(paragraphs) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    return { quality: 'poor', issues: ['No hay párrafos'] };
  }
  
  const stats = {
    total: paragraphs.length,
    avgLength: Math.round(paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length),
    minLength: Math.min(...paragraphs.map(p => p.length)),
    maxLength: Math.max(...paragraphs.map(p => p.length)),
    tooShort: paragraphs.filter(p => p.length < CONFIG.MIN_PARAGRAPH_LENGTH).length,
    tooLong: paragraphs.filter(p => p.length > CONFIG.MAX_PARAGRAPH_LENGTH).length,
  };
  
  const issues = [];
  let quality = 'excellent';
  
  if (stats.total < 2) {
    issues.push('Muy pocos párrafos');
    quality = 'poor';
  }
  
  if (stats.tooShort > stats.total * 0.3) {
    issues.push('Muchos párrafos demasiado cortos');
    quality = quality === 'excellent' ? 'good' : 'poor';
  }
  
  if (stats.tooLong > 0) {
    issues.push('Algunos párrafos muy largos');
    quality = quality === 'excellent' ? 'good' : quality;
  }
  
  console.log('📊 [DocumentReader] Análisis de calidad:', { quality, stats, issues });
  
  return { quality, stats, issues };
}

export default {
  processDocument,
  analyzeTextQuality,
  cleanText,
};
