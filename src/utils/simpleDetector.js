import logger from './logger';


/**
 * Detector SIMPLE de tipos de párrafo
 * Enfoque visual y directo sin complejidad innecesaria
 */

/**
 * Detecta el tipo de párrafo basándose en características visuales simples
 * @param {string} text - Texto del párrafo
 * @returns {string} - Tipo: 'title', 'subtitle', 'list', 'quote', 'paragraph'
 */
export function detectType(text) {
  if (!text || typeof text !== 'string') return 'paragraph';
  
  const trimmed = text.trim();
  const length = trimmed.length;
  
  // 1. TÍTULO: Texto corto, TODO MAYÚSCULAS o palabras clave
  if (length < 150) {
    // Todo mayúsculas
    if (trimmed === trimmed.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(trimmed)) {
      logger.log('🎯 TÍTULO detectado (mayúsculas):', trimmed.substring(0, 50));
      return 'title';
    }
    
    // Empieza con palabras clave académicas comunes
    const keywords = /^(resumen|abstract|introducción|introduction|metodología|methodology|resultados|results|conclusión|conclusion|discusión|discussion|referencias|references|bibliografía|bibliography|capítulo|chapter|anexo|annex)/i;
    if (keywords.test(trimmed)) {
      logger.log('🎯 TÍTULO detectado (keyword):', trimmed.substring(0, 50));
      return 'title';
    }
    
    // Empieza con número + punto + palabra en mayúscula
    if (/^\d+\.\s+[A-ZÁÉÍÓÚÑ]/.test(trimmed) && length < 100) {
      logger.log('🎯 TÍTULO numerado:', trimmed.substring(0, 50));
      return 'title';
    }
  }
  
  // 2. SUBTÍTULO: Texto mediano sin punto final, empieza con mayúscula
  if (length >= 15 && length < 200 && !trimmed.endsWith('.')) {
    if (/^[A-ZÁÉÍÓÚÑ]/.test(trimmed)) {
      logger.log('📌 SUBTÍTULO detectado:', trimmed.substring(0, 50));
      return 'subtitle';
    }
  }
  
  // 3. LISTA: Empieza con marcador
  const listMarkers = /^(\d+[\.\)]\s+|[a-z][\.\)]\s+|•|–|—|\*|\-|►|▪|◆|○|●)/;
  if (listMarkers.test(trimmed)) {
    logger.log('📋 LISTA detectada:', trimmed.substring(0, 50));
    return 'list';
  }
  
  // 4. CITA: Empieza con comillas o >
  if (trimmed.startsWith('"') || trimmed.startsWith('>')) {
    logger.log('💬 CITA detectada:', trimmed.substring(0, 50));
    return 'quote';
  }
  
  // 5. Por defecto: PÁRRAFO normal
  return 'paragraph';
}

/**
 * Obtiene el color para cada tipo
 * @param {string} type - Tipo de párrafo
 * @param {boolean} darkMode - Si está en modo oscuro
 * @returns {string} - Color hexadecimal
 */
export function getColorForType(type, darkMode = false) {
  const colors = {
    light: {
      title: '#1e40af',      // Azul fuerte
      subtitle: '#7c3aed',   // Púrpura
      list: '#059669',       // Verde
      quote: '#d97706',      // Naranja
      paragraph: '#374151'   // Gris oscuro
    },
    dark: {
      title: '#60a5fa',      // Azul claro
      subtitle: '#a78bfa',   // Púrpura claro
      list: '#34d399',       // Verde claro
      quote: '#fbbf24',      // Amarillo
      paragraph: '#d1d5db'   // Gris claro
    }
  };
  
  const palette = darkMode ? colors.dark : colors.light;
  return palette[type] || palette.paragraph;
}

/**
 * Obtiene el tamaño de fuente para cada tipo
 * @param {string} type - Tipo de párrafo
 * @returns {string} - Tamaño CSS
 */
export function getFontSizeForType(type) {
  const sizes = {
    title: '1.5em',
    subtitle: '1.2em',
    list: '1em',
    quote: '1em',
    paragraph: '1.05em'
  };
  
  return sizes[type] || sizes.paragraph;
}

/**
 * Obtiene el peso de fuente para cada tipo
 * @param {string} type - Tipo de párrafo
 * @returns {string|number} - Peso CSS
 */
export function getFontWeightForType(type) {
  const weights = {
    title: 700,      // Bold
    subtitle: 600,   // Semi-bold
    list: 400,       // Normal
    quote: 400,      // Normal
    paragraph: 400   // Normal
  };
  
  return weights[type] || weights.paragraph;
}
