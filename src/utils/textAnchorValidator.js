/**
 * @file Validador de Anclaje al Texto - Affordance #1 de Literacidad Crítica
 * @module textAnchorValidator
 * @description Sistema de validación que obliga a los estudiantes a sustentar
 * sus ideas con evidencias directas del texto mediante citas textuales.
 * 
 * Implementa el principio pedagógico: "Anclaje al texto - diseñar tareas que
 * obliguen a los estudiantes a sustentar sus ideas con evidencias directas del texto"
 */

/**
 * Valida que una respuesta contenga anclaje al texto mediante citas explícitas
 * @param {string} studentResponse - Respuesta del estudiante a validar
 * @param {string} sourceText - Texto original de referencia
 * @param {Object} options - Opciones de configuración
 * @param {number} options.minQuotes - Mínimo de citas requeridas (default: 1)
 * @param {number} options.minQuoteLength - Longitud mínima de cita en caracteres (default: 10)
 * @param {number} options.maxAnalysisRatio - Máximo ratio citas/análisis (default: 0.7)
 * @returns {Object} Resultado de validación con feedback pedagógico
 */
export function validateTextEvidence(studentResponse, sourceText, options = {}) {
  const {
    minQuotes = 1,
    minQuoteLength = 10,
    maxAnalysisRatio = 0.7 // 70% del texto puede ser citas
  } = options;

  // Validación de inputs
  if (!studentResponse || typeof studentResponse !== 'string') {
    return {
      valid: false,
      severity: 'error',
      feedback: '⚠️ Se requiere una respuesta para validar.',
      quotesCount: 0
    };
  }

  if (!sourceText || typeof sourceText !== 'string') {
    return {
      valid: false,
      severity: 'error',
      feedback: '⚠️ No se encontró el texto de referencia.',
      quotesCount: 0
    };
  }

  const response = studentResponse.trim();
  if (response.length < 20) {
    return {
      valid: false,
      severity: 'warning',
      feedback: '⚠️ Tu respuesta es muy breve. Desarrolla más tu análisis e incluye citas del texto.',
      quotesCount: 0
    };
  }

  // Detectar citas con comillas dobles ("...") o latinas («...»)
  const quotesPattern = /"([^"]{10,})"|«([^»]{10,})»|"([^"]{10,})"|'([^']{10,})'/g;
  const quotesMatches = [...response.matchAll(quotesPattern)];
  
  // Extraer el texto de cada cita
  const quotes = quotesMatches.map((match, index) => {
    const text = match[1] || match[2] || match[3] || match[4];
    return {
      id: index,
      text: text.trim(),
      raw: match[0],
      index: match.index,
      exists: false // se verificará después
    };
  });

  // VALIDACIÓN 1: Verificar cantidad mínima de citas
  if (quotes.length === 0) {
    return {
      valid: false,
      severity: 'error',
      feedback: `⚠️ **Tu respuesta necesita incluir citas directas del texto.**\n\n` +
                `Las citas demuestran que tus afirmaciones están ancladas en evidencia textual.\n\n` +
                `**Cómo citar correctamente:**\n` +
                `• Usa comillas dobles: "texto exacto del documento"\n` +
                `• Integra la cita en tu redacción: Como señala el autor, "..."\n` +
                `• Referencia el párrafo: "..." (párrafo 3)\n\n` +
                `**Ejemplo:**\n` +
                `El autor argumenta que la economía "está en crisis estructural" (p. 2), ` +
                `lo cual sugiere que...`,
      quotesCount: 0,
      quotes: [],
      suggestion: 'Lee el texto nuevamente e identifica fragmentos clave que apoyen tu idea principal.'
    };
  }

  if (quotes.length < minQuotes) {
    return {
      valid: false,
      severity: 'warning',
      feedback: `⚠️ Se requieren al menos ${minQuotes} cita(s). Encontraste ${quotes.length}.\n\n` +
                `Añade más evidencia textual para sustentar tu argumento.`,
      quotesCount: quotes.length,
      quotes
    };
  }

  // VALIDACIÓN 2: Verificar que las citas existen en el texto original
  const normalizeForComparison = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizedSource = normalizeForComparison(sourceText);
  
  quotes.forEach(quote => {
    const normalizedQuote = normalizeForComparison(quote.text);
    quote.exists = normalizedSource.includes(normalizedQuote);
    
    // Si no existe exacta, buscar substring significativo
    if (!quote.exists && quote.text.length > 30) {
      const words = normalizedQuote.split(' ').filter(w => w.length > 3);
      const significantWords = words.slice(0, Math.min(5, words.length));
      const matchCount = significantWords.filter(word => 
        normalizedSource.includes(word)
      ).length;
      
      // Si al menos 80% de las palabras significativas existen, marcar como "parcial"
      quote.partialMatch = matchCount / significantWords.length >= 0.8;
    }
  });

  const invalidQuotes = quotes.filter(q => !q.exists && !q.partialMatch);

  if (invalidQuotes.length > 0) {
    const examples = invalidQuotes.slice(0, 2).map(q => 
      `• "${q.text.slice(0, 50)}${q.text.length > 50 ? '...' : ''}"`
    ).join('\n');

    return {
      valid: false,
      severity: 'error',
      feedback: `⚠️ **Algunas citas no coinciden exactamente con el texto original.**\n\n` +
                `Verifica que estés copiando palabra por palabra del texto.\n\n` +
                `**Citas que no coinciden:**\n${examples}\n\n` +
                `**Tip:** Copia y pega directamente del texto para evitar errores.`,
      quotesCount: quotes.length,
      quotes,
      invalidCount: invalidQuotes.length,
      suggestion: 'Revisa las citas resaltadas y compáralas con el texto original.'
    };
  }

  const partialMatches = quotes.filter(q => q.partialMatch);
  if (partialMatches.length > 0) {
    const warnings = partialMatches.map(q => 
      `• "${q.text.slice(0, 40)}..." - Parafraseo detectado, usa la cita exacta`
    ).join('\n');

    return {
      valid: false,
      severity: 'warning',
      feedback: `⚠️ **Algunas citas parecen ser paráfrasis.**\n\n` +
                `Para el anclaje al texto, usa las palabras exactas del autor:\n\n${warnings}\n\n` +
                `El parafraseo es válido FUERA de las comillas.`,
      quotesCount: quotes.length,
      quotes,
      partialMatchesCount: partialMatches.length
    };
  }

  // VALIDACIÓN 3: Ratio de citas vs análisis propio
  const responseWords = response.split(/\s+/).length;
  const quotesWords = quotes.reduce((sum, q) => 
    sum + q.text.split(/\s+/).length, 0
  );
  
  const quotesRatio = quotesWords / responseWords;

  if (quotesRatio > maxAnalysisRatio) {
    return {
      valid: false,
      severity: 'warning',
      feedback: `⚠️ **Tu respuesta tiene demasiadas citas y poco análisis propio.**\n\n` +
                `Proporción actual: ${Math.round(quotesRatio * 100)}% citas / ` +
                `${Math.round((1 - quotesRatio) * 100)}% análisis\n\n` +
                `**Recuerda:** Las citas deben SUSTENTAR tus ideas, no reemplazarlas.\n\n` +
                `**Mejora tu respuesta:**\n` +
                `1. Después de cada cita, explica QUÉ significa\n` +
                `2. Conecta las citas con TU argumento principal\n` +
                `3. Analiza POR QUÉ el autor eligió esas palabras`,
      quotesCount: quotes.length,
      quotes,
      quotesRatio: Math.round(quotesRatio * 100),
      analysisRatio: Math.round((1 - quotesRatio) * 100),
      suggestion: 'Añade más análisis propio explicando el significado de las citas.'
    };
  }

  // VALIDACIÓN 4: Integración de citas (detectar integraciones mecánicas)
  const mechanicalIntegrations = [
    /el\s+autor\s+dice\s*:\s*"/gi,
    /el\s+texto\s+dice\s*:\s*"/gi,
    /la\s+cita\s+es\s*:\s*"/gi,
    /según\s+el\s+autor\s*:\s*"/gi
  ];

  let mechanicalCount = 0;
  mechanicalIntegrations.forEach(pattern => {
    mechanicalCount += (response.match(pattern) || []).length;
  });

  if (mechanicalCount >= quotes.length * 0.5) {
    return {
      valid: true, // No bloquear, pero dar feedback
      severity: 'info',
      feedback: `✅ **Anclaje válido con ${quotes.length} cita(s).**\n\n` +
                `💡 **Sugerencia para nivel Experto:**\n` +
                `Integra las citas de forma más fluida. En lugar de:\n` +
                `• "El autor dice: \"...\""\ n\n` +
                `Prueba:\n` +
                `• Como señala el texto, "..."\n` +
                `• Esta idea se confirma en la frase: "..."\n` +
                `• El fragmento revela que "..."`,
      quotesCount: quotes.length,
      quotes,
      mechanicalIntegration: true,
      integrationScore: 'basic'
    };
  }

  // VALIDACIÓN 5: Referencias a párrafos (opcional pero valorado)
  const paragraphRefs = extractParagraphReferences(response);
  
  // ✅ VALIDACIÓN EXITOSA
  return {
    valid: true,
    severity: 'success',
    feedback: `✅ **Excelente anclaje al texto: ${quotes.length} cita(s) válida(s)**\n\n` +
              `${paragraphRefs.length > 0 
                ? `✨ Bonus: Referencias a párrafos (${paragraphRefs.join(', ')})\n\n` 
                : ''}` +
              `Tu respuesta demuestra que anclas tus afirmaciones en evidencia textual. ` +
              `Esto cumple con el criterio "Selección y Uso de Citas" de la Rúbrica 1.`,
    quotesCount: quotes.length,
    quotes: quotes.map(q => ({
      ...q,
      valid: true
    })),
    quotesRatio: Math.round(quotesRatio * 100),
    analysisRatio: Math.round((1 - quotesRatio) * 100),
    paragraphReferences: paragraphRefs,
    integrationScore: mechanicalCount === 0 ? 'excellent' : 'good'
  };
}

/**
 * Extrae referencias a párrafos del tipo "párrafo 3", "(p. 5)", "[párrafo 2]"
 * @param {string} text - Texto a analizar
 * @returns {number[]} Array de números de párrafo referenciados
 */
export function extractParagraphReferences(text) {
  const patterns = [
    /párrafo\s+(\d+)/gi,
    /\(p\.\s*(\d+)\)/gi,
    /\[párrafo\s+(\d+)\]/gi,
    /\(párrafo\s+(\d+)\)/gi
  ];
  
  const refs = new Set();
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(m => {
      const num = parseInt(m[1]);
      if (num > 0 && num < 1000) refs.add(num);
    });
  });
  
  return Array.from(refs).sort((a, b) => a - b);
}

/**
 * Sugiere mejoras en la integración de citas
 * @param {string} quote - Cita a integrar
 * @param {string} context - Contexto de la respuesta (opcional)
 * @returns {string[]} Array de ejemplos de integración
 */
export function suggestQuoteIntegration(quote, context = '') {
  const examples = [
    `Como señala el autor, "${quote}", lo cual sugiere que...`,
    `El texto afirma que "${quote}", evidenciando...`,
    `Esta idea se confirma en la frase: "${quote}". Esto significa...`,
    `Según el fragmento, "${quote}", lo que revela...`,
    `El autor establece que "${quote}". Esta afirmación...`
  ];
  
  return examples;
}

/**
 * Analiza la calidad de integración de citas
 * @param {string} response - Respuesta completa del estudiante
 * @param {Array} quotes - Array de objetos de citas validadas
 * @returns {Object} Análisis de calidad de integración
 */
export function analyzeQuoteIntegration(response, quotes) {
  if (!quotes || quotes.length === 0) {
    return {
      score: 0,
      level: 'none',
      feedback: 'No se encontraron citas para analizar.'
    };
  }

  const mechanicalPhrases = [
    'el autor dice',
    'el texto dice',
    'la cita es',
    'según el autor:'
  ];

  const fluentPhrases = [
    'como señala',
    'el texto afirma que',
    'esta idea se confirma',
    'el fragmento revela',
    'lo cual sugiere',
    'evidenciando'
  ];

  let mechanicalScore = 0;
  let fluentScore = 0;

  const lowerResponse = response.toLowerCase();
  
  mechanicalPhrases.forEach(phrase => {
    mechanicalScore += (lowerResponse.match(new RegExp(phrase, 'g')) || []).length;
  });

  fluentPhrases.forEach(phrase => {
    fluentScore += (lowerResponse.match(new RegExp(phrase, 'g')) || []).length;
  });

  const totalIntegrations = mechanicalScore + fluentScore;
  const fluentRatio = totalIntegrations > 0 ? fluentScore / totalIntegrations : 0;

  let level, feedback;
  
  if (fluentRatio >= 0.8) {
    level = 'expert';
    feedback = '✨ Nivel Experto: Integras las citas de forma fluida y natural en tu redacción.';
  } else if (fluentRatio >= 0.5) {
    level = 'competent';
    feedback = '✅ Nivel Competente: Buena integración de citas. Intenta variar más las formas de introducirlas.';
  } else if (fluentRatio >= 0.2) {
    level = 'apprentice';
    feedback = '📝 Nivel Aprendiz: Integras citas pero de forma mecánica. Revisa los ejemplos de integración fluida.';
  } else {
    level = 'novice';
    feedback = '📚 Nivel Novato: Las citas están presentes pero desconectadas. Aprende a integrarlas en tu prosa.';
  }

  return {
    score: Math.round(fluentRatio * 100),
    level,
    feedback,
    mechanicalCount: mechanicalScore,
    fluentCount: fluentScore,
    suggestions: fluentScore < mechanicalScore 
      ? suggestQuoteIntegration(quotes[0]?.text || '') 
      : []
  };
}

/**
 * Valida respuesta completa incluyendo anclaje y calidad de integración
 * @param {string} studentResponse - Respuesta del estudiante
 * @param {string} sourceText - Texto de referencia
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación completo
 */
export function validateComprehensiveResponse(studentResponse, sourceText, options = {}) {
  // Validación de anclaje básico
  const anchorValidation = validateTextEvidence(studentResponse, sourceText, options);
  
  if (!anchorValidation.valid) {
    return anchorValidation;
  }

  // Análisis de calidad de integración
  const integrationAnalysis = analyzeQuoteIntegration(
    studentResponse, 
    anchorValidation.quotes
  );

  // Combinar resultados
  return {
    ...anchorValidation,
    integration: integrationAnalysis,
    overallFeedback: `${anchorValidation.feedback}\n\n${integrationAnalysis.feedback}`,
    rubricLevel: mapIntegrationToRubricLevel(integrationAnalysis.level)
  };
}

/**
 * Mapea nivel de integración a nivel de rúbrica (1-4)
 * @param {string} integrationLevel - Nivel de integración (novice|apprentice|competent|expert)
 * @returns {number} Nivel de rúbrica (1-4)
 */
function mapIntegrationToRubricLevel(integrationLevel) {
  const mapping = {
    'novice': 1,
    'apprentice': 2,
    'competent': 3,
    'expert': 4
  };
  return mapping[integrationLevel] || 1;
}

/**
 * Genera reporte de anclaje para docentes
 * @param {Object} validation - Resultado de validación
 * @returns {Object} Reporte estructurado para docentes
 */
export function generateTeacherReport(validation) {
  return {
    timestamp: new Date().toISOString(),
    studentId: validation.studentId || 'unknown',
    anchorQuality: {
      quotesCount: validation.quotesCount,
      valid: validation.valid,
      severity: validation.severity
    },
    integration: validation.integration || null,
    rubricLevel: validation.rubricLevel || 1,
    feedback: validation.feedback,
    recommendations: validation.integration?.suggestions || [],
    flagsForReview: {
      noQuotes: validation.quotesCount === 0,
      invalidQuotes: validation.invalidCount > 0,
      excessiveQuotes: validation.quotesRatio > 70,
      mechanicalIntegration: validation.integration?.level === 'novice'
    }
  };
}

export default {
  validateTextEvidence,
  extractParagraphReferences,
  suggestQuoteIntegration,
  analyzeQuoteIntegration,
  validateComprehensiveResponse,
  generateTeacherReport
};
