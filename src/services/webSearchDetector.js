import logger from '../utils/logger';


/**
 * Detector Inteligente de Necesidad de Búsqueda Web
 * Analiza texto y decide automáticamente si requiere contexto web actualizado
 * 
 * @module webSearchDetector
 */

/**
 * Analiza el texto y determina si requiere búsqueda web para enriquecer el análisis
 * 
 * @param {string} texto - Texto a analizar
 * @param {Object} metadata - Metadatos opcionales (género textual, fecha, etc.)
 * @returns {Object} Decisión de búsqueda con confianza y razones
 * 
 * @example
 * const decision = shouldSearchWeb(texto, { genero_textual: 'noticia' });
 * if (decision.needsWeb) {
 *   logger.log(`Buscar en web (confianza: ${decision.confidence})`);
 *   logger.log('Razones:', decision.reasons);
 * }
 */
export function shouldSearchWeb(texto, metadata = {}) {
  const indicators = {
    needsWeb: false,
    confidence: 0,
    reasons: [],
    keywords: []
  };

  if (!texto || texto.trim().length < 100) {
    // Textos muy cortos no requieren búsqueda web
    return indicators;
  }

  const textoLower = texto.toLowerCase();
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  // ============================================================
  // 1. DETECTAR REFERENCIAS TEMPORALES RECIENTES
  // ============================================================
  
  // Años recientes (2024, 2025, etc.)
  const yearPatterns = [
    new RegExp(`\\b${currentYear}\\b`, 'g'),
    new RegExp(`\\b${lastYear}\\b`, 'g'),
  ];
  
  yearPatterns.forEach(pattern => {
    if (pattern.test(texto)) {
      indicators.needsWeb = true;
      indicators.confidence += 0.25;
      indicators.reasons.push(`Menciona año reciente (${currentYear}/${lastYear})`);
    }
  });

  // Expresiones temporales actuales
  const temporalPhrases = [
    /últimos?\s+(?:meses?|años?|días?|semanas?)/i,
    /recientemente|actualmente|hoy en día/i,
    /en\s+(?:la\s+)?actualidad/i,
    /durante\s+(?:el\s+)?presente\s+año/i,
    /este\s+año|este\s+mes/i,
    /según\s+datos\s+(?:de|del)\s+\d{4}/,
    /últimas?\s+(?:cifras?|datos?|estadísticas?)/i
  ];

  temporalPhrases.forEach(pattern => {
    if (pattern.test(textoLower)) {
      indicators.needsWeb = true;
      indicators.confidence += 0.2;
      if (!indicators.reasons.includes('Referencias temporales actuales')) {
        indicators.reasons.push('Referencias temporales actuales');
      }
    }
  });

  // ============================================================
  // 2. DETECTAR DATOS ESTADÍSTICOS Y CIFRAS
  // ============================================================
  
  // Porcentajes y cifras
  const statsPatterns = [
    /\d+(?:\.\d+)?%/g,  // 45.3%, 12%
    /\d{1,3}(?:,\d{3})+/g,  // 1,234,567
    /estadística[s]?|dato[s]?|cifra[s]?/gi,
    /según\s+(?:el\s+)?(?:INEC|INE|censo|encuesta|estudio)/gi,
    /informe|reporte|investigación/gi
  ];

  let statsCount = 0;
  statsPatterns.forEach(pattern => {
    const matches = texto.match(pattern);
    if (matches) {
      statsCount += matches.length;
    }
  });

  if (statsCount >= 3) {
    indicators.needsWeb = true;
    indicators.confidence += 0.3;
    indicators.reasons.push(`Contiene datos estadísticos (${statsCount} referencias)`);
  }

  // ============================================================
  // 3. DETECTAR EVENTOS ESPECÍFICOS Y NOTICIAS
  // ============================================================
  
  const eventPhrases = [
    /evento|noticia|suceso|acontecimiento/gi,
    /según\s+(?:informó|reportó|anunció)/gi,
    /la\s+(?:última|reciente)\s+(?:crisis|situación)/gi,
    /el\s+gobierno\s+(?:anunció|implementó|aprobó)/gi,
    /ha\s+(?:ocurrido|sucedido|acontecido)/gi
  ];

  eventPhrases.forEach(pattern => {
    if (pattern.test(texto)) {
      indicators.needsWeb = true;
      indicators.confidence += 0.15;
      if (!indicators.reasons.includes('Menciona eventos o noticias específicas')) {
        indicators.reasons.push('Menciona eventos o noticias específicas');
      }
    }
  });

  // ============================================================
  // 4. DETECTAR FIGURAS PÚBLICAS Y AUTORIDADES
  // ============================================================
  
  const publicFiguresPatterns = [
    /presidente|ministro|alcalde|gobernador|secretario/gi,
    /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?/g,  // Nombres propios
    /autoridades?|funcionarios?|dirigentes?/gi
  ];

  let publicFiguresCount = 0;
  publicFiguresPatterns.forEach(pattern => {
    const matches = texto.match(pattern);
    if (matches) {
      publicFiguresCount += matches.length;
    }
  });

  if (publicFiguresCount >= 2) {
    indicators.needsWeb = true;
    indicators.confidence += 0.15;
    indicators.reasons.push('Menciona figuras públicas o autoridades');
  }

  // ============================================================
  // 5. DETECTAR UBICACIONES GEOGRÁFICAS ESPECÍFICAS
  // ============================================================
  
  const locations = detectLocations(texto);
  if (locations.length > 0) {
    indicators.keywords.push(...locations);
    indicators.confidence += 0.1;
    indicators.reasons.push(`Menciona ubicaciones específicas: ${locations.slice(0, 3).join(', ')}`);
  }

  // ============================================================
  // 6. ANÁLISIS DE GÉNERO TEXTUAL (Metadata)
  // ============================================================
  
  if (metadata.genero_textual) {
    const genero = metadata.genero_textual.toLowerCase();
    
    // Géneros que SIEMPRE requieren web
    const webRequiredGenres = ['noticia', 'reportaje', 'crónica', 'informe periodístico'];
    
    if (webRequiredGenres.some(g => genero.includes(g))) {
      indicators.needsWeb = true;
      indicators.confidence += 0.4;
      indicators.reasons.push(`Género textual: ${metadata.genero_textual}`);
    }
    
    // Géneros que PODRÍAN requerir web
    const webOptionalGenres = ['ensayo', 'artículo', 'análisis'];
    
    if (webOptionalGenres.some(g => genero.includes(g))) {
      indicators.confidence += 0.1;
    }
  }

  // ============================================================
  // 7. DETECTAR CRISIS, EMERGENCIAS O PROBLEMAS SOCIALES
  // ============================================================
  
  const crisisPatterns = [
    /crisis\s+(?:económica|social|política|sanitaria|energética)/gi,
    /emergencia|problema\s+(?:grave|serio)|situación\s+crítica/gi,
    /desempleo|inflación|pobreza|violencia/gi,
    /protestas?|manifestaciones?|huelga[s]?/gi
  ];

  crisisPatterns.forEach(pattern => {
    if (pattern.test(texto)) {
      indicators.needsWeb = true;
      indicators.confidence += 0.2;
      if (!indicators.reasons.includes('Trata temas de crisis o problemas sociales actuales')) {
        indicators.reasons.push('Trata temas de crisis o problemas sociales actuales');
      }
    }
  });

  // ============================================================
  // 8. DETECTAR POLÍTICAS PÚBLICAS O LEGISLACIÓN RECIENTE
  // ============================================================
  
  const policyPatterns = [
    /política[s]?\s+pública[s]?/gi,
    /ley|decreto|reforma|regulación/gi,
    /el\s+gobierno\s+(?:ha\s+)?(?:aprobado|implementado|propuesto)/gi,
    /nueva\s+(?:ley|política|medida|normativa)/gi
  ];

  policyPatterns.forEach(pattern => {
    if (pattern.test(texto)) {
      indicators.needsWeb = true;
      indicators.confidence += 0.15;
      if (!indicators.reasons.includes('Menciona políticas públicas o legislación')) {
        indicators.reasons.push('Menciona políticas públicas o legislación');
      }
    }
  });

  // ============================================================
  // 9. CALCULAR DECISIÓN FINAL
  // ============================================================
  
  // Umbral de decisión: 0.5 (50% de confianza)
  const threshold = 0.5;
  indicators.needsWeb = indicators.confidence >= threshold;

  // Limitar confianza a máximo 1.0
  indicators.confidence = Math.min(indicators.confidence, 1.0);

  // Log para debugging
  if (indicators.needsWeb) {
    logger.log('🌐 Búsqueda web REQUERIDA');
    logger.log(`   Confianza: ${(indicators.confidence * 100).toFixed(1)}%`);
    logger.log('   Razones:', indicators.reasons);
  } else {
    logger.log('✅ Búsqueda web NO necesaria');
    logger.log(`   Confianza: ${(indicators.confidence * 100).toFixed(1)}%`);
  }

  return indicators;
}

/**
 * Detecta ubicaciones geográficas mencionadas en el texto
 * 
 * @param {string} texto - Texto a analizar
 * @returns {Array<string>} Lista de ubicaciones detectadas
 */
function detectLocations(texto) {
  const locations = [];

  // Países de América Latina
  const countries = [
    'Ecuador', 'Colombia', 'Perú', 'Bolivia', 'Venezuela', 'Chile', 'Argentina',
    'Uruguay', 'Paraguay', 'Brasil', 'México', 'Guatemala', 'Honduras', 'Nicaragua',
    'Costa Rica', 'Panamá', 'Cuba', 'República Dominicana', 'Puerto Rico'
  ];

  // Ciudades principales
  const cities = [
    'Quito', 'Guayaquil', 'Cuenca', 'Bogotá', 'Lima', 'Buenos Aires', 'Santiago',
    'Ciudad de México', 'Caracas', 'La Paz', 'Montevideo', 'Asunción', 'São Paulo'
  ];

  // Buscar países
  countries.forEach(country => {
    const pattern = new RegExp(`\\b${country}\\b`, 'gi');
    if (pattern.test(texto)) {
      if (!locations.includes(country)) {
        locations.push(country);
      }
    }
  });

  // Buscar ciudades
  cities.forEach(city => {
    const pattern = new RegExp(`\\b${city}\\b`, 'gi');
    if (pattern.test(texto)) {
      if (!locations.includes(city)) {
        locations.push(city);
      }
    }
  });

  // Buscar provincias/estados (Ecuador específico)
  const provinces = [
    'Pichincha', 'Guayas', 'Azuay', 'Manabí', 'Tungurahua', 'El Oro', 'Los Ríos',
    'Loja', 'Imbabura', 'Esmeraldas'
  ];

  provinces.forEach(province => {
    const pattern = new RegExp(`\\b${province}\\b`, 'gi');
    if (pattern.test(texto)) {
      if (!locations.includes(province)) {
        locations.push(province);
      }
    }
  });

  return locations;
}

/**
 * Extrae palabras clave principales del texto para búsquedas
 * 
 * @param {string} texto - Texto a analizar
 * @param {number} maxKeywords - Máximo de palabras clave a extraer
 * @returns {Array<string>} Lista de palabras clave
 */
export function extractKeywords(texto, maxKeywords = 5) {
  if (!texto) return [];

  // Extraer palabras capitalizadas (posibles nombres propios o conceptos clave)
  const capitalizedPattern = /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*\b/g;
  const capitalizedWords = texto.match(capitalizedPattern) || [];

  // Filtrar palabras comunes
  const stopWords = [
    'El', 'La', 'Los', 'Las', 'Un', 'Una', 'Unos', 'Unas', 
    'Este', 'Esta', 'Estos', 'Estas', 'Ese', 'Esa', 'Esos', 'Esas',
    'Según', 'Durante', 'Entre', 'Sobre', 'Para', 'Por', 'Sin', 'Con'
  ];

  const keywords = capitalizedWords
    .filter(word => !stopWords.includes(word))
    .filter(word => word.length >= 4)
    .reduce((acc, word) => {
      // Contar frecuencia
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

  // Ordenar por frecuencia y tomar las más comunes
  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, maxKeywords);
}

/**
 * Genera términos de búsqueda optimizados para literacidad crítica
 * 
 * @param {string} texto - Texto original
 * @param {Object} indicators - Resultado de shouldSearchWeb
 * @returns {Array<Object>} Lista de términos de búsqueda con tipo y propósito
 */
export function generateSearchQueries(texto, indicators) {
  const queries = [];
  
  if (!indicators.needsWeb) {
    return queries;
  }

  const keywords = extractKeywords(texto, 3);
  const locations = indicators.keywords || [];
  const currentYear = new Date().getFullYear();

  // Query 1: Contexto general actualizado
  if (keywords.length > 0) {
    queries.push({
      type: 'context',
      text: `${keywords.join(' ')} contexto actual ${currentYear}`,
      purpose: 'Obtener contexto general actualizado'
    });
  }

  // Query 2: Datos estadísticos (si el texto menciona cifras)
  if (indicators.reasons.some(r => r.includes('estadísticos'))) {
    queries.push({
      type: 'statistics',
      text: `${keywords[0]} estadísticas ${currentYear} datos oficiales`,
      purpose: 'Verificar datos estadísticos actuales'
    });
  }

  // Query 3: Noticias recientes (si es género noticia o menciona eventos)
  if (indicators.reasons.some(r => r.includes('noticia') || r.includes('evento'))) {
    const searchTerm = locations.length > 0 ? 
      `${keywords[0]} ${locations[0]}` : 
      keywords.slice(0, 2).join(' ');
    
    queries.push({
      type: 'news',
      text: `${searchTerm} noticias últimas semanas`,
      purpose: 'Encontrar noticias recientes relacionadas'
    });
  }

  // Query 4: Políticas públicas (si menciona gobierno/leyes)
  if (indicators.reasons.some(r => r.includes('políticas') || r.includes('legislación'))) {
    queries.push({
      type: 'policies',
      text: `${keywords[0]} políticas públicas ${locations[0] || ''} ${currentYear}`,
      purpose: 'Identificar políticas públicas actuales'
    });
  }

  // Limitar a 3 queries para no saturar
  return queries.slice(0, 3);
}

export default {
  shouldSearchWeb,
  extractKeywords,
  generateSearchQueries,
  detectLocations
};
