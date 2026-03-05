export const HATE_SLUR_PATTERNS = [
  /\b(maric[ao]s?)\b/i,
  /\b(negr[oa]s?)\b\s+\b(maric[ao]s?)\b/i,
  /\b(indio(?:s)?\s+de\s+mierda)\b/i,
  /\b(moro(?:s)?\s+de\s+mierda)\b/i,
  /\b(judi[io]s?\s+de\s+mierda)\b/i,
  /\b(gitano(?:s|a|as)?\s+de\s+mierda)\b/i,
  /\b(sudaca(?:s)?)\b/i,
  /\b(mund[oa]s?\s+de\s+mierda)\b/i,
  /\b(retrasa(?:do|da|dos|das))\b/i,
  /\b(mongol(?:o|a|os|as|ito|ita))\b/i,
  /\b(inval|minus)\s*v[aá]lid[oa]s?\b/i,
  /\b(pu(?:t[ao]s?|nhet[ao]?))\b\s+\b(negr[oa]s?|indi[oa]s?|moro|judi[oa]s?)\b/i,
];

export function detectHateOrSlur(text) {
  const t = String(text || '').toLowerCase();
  return HATE_SLUR_PATTERNS.some((r) => r.test(t));
}

export function redactHateOrSlur(text) {
  let s = String(text || '');
  // Redacción conservadora: oculta términos muy problemáticos sin destruir el sentido.
  s = s.replace(/\b(maric)(a|o)(s?)\b/gi, 'm***$2$3');
  // Combinaciones explícitas (para evitar que el tutor las repita)
  s = s.replace(/\b(negr)(a|o)(s?)\s+(m\*\*\*|maric(a|o)(s?))\b/gi, 'n***$2$3 m***$5$6');
  s = s.replace(/\b(indio)(s)?\s+de\s+mierda\b/gi, 'i***$2 de m***');
  s = s.replace(/\b(moro)(s)?\s+de\s+mierda\b/gi, 'm***$2 de m***');
  s = s.replace(/\b(judi)(o|a)(s)?\s+de\s+mierda\b/gi, 'j***$2$3 de m***');
  // Nuevos patrones ampliados (género, discapacidad, xenofobia)
  s = s.replace(/\b(gitano)(s|a|as)?\s+de\s+mierda\b/gi, 'g***$2 de m***');
  s = s.replace(/\b(sudaca)(s?)\b/gi, 's***$2');
  s = s.replace(/\b(retrasa)(do|da|dos|das)\b/gi, 'r***$2');
  s = s.replace(/\b(mongol)(o|a|os|as|ito|ita)\b/gi, 'm***$2');
  return s;
}

export function slurAppearsInContext(contextText) {
  if (!contextText) return false;
  return detectHateOrSlur(contextText);
}

/**
 * Valida que la respuesta del tutor no contenga errores críticos:
 * 1. No inventa metadatos (autor, título, fecha) que no están en el texto
 * 2. No pregunta sobre palabras de sus propios mensajes anteriores
 * @param {string} response - Respuesta del asistente
 * @param {Object} context - { fragment, fullText }
 * @returns {Object} { isValid, errors, correctedResponse }
 */
export function validateResponse(response, context = {}) {
  // FIX #6: previousAssistantMessages se declaraba pero nunca se usaba.
  // Eliminado de la desestructuración para no dar falsa sensación de cobertura.
  const { fragment = '', fullText = '' } = context;
  const errors = [];

  if (!response || typeof response !== 'string') {
    return { isValid: false, errors: ['Respuesta vacía o inválida'], correctedResponse: null };
  }

  const textContext = (fullText || fragment || '').toLowerCase();

  // 1. VALIDAR METADATOS INVENTADOS
  // Buscar menciones de autor/título/fecha que no están en el texto
  const metadataPatterns = {
    autor: [
      /el autor (?:se llama|es|llamado|de nombre|llamada)\s+["']?([^"']+?)["']?[\s.]/i,
      /según (?:el )?autor[:\s]+([^.]+?)[.]/i,
      /autor[:\s]+([^.]+?)[.]/i
    ],
    titulo: [
      /el (?:título|libro|texto|obra) (?:se llama|es|llamado|titulado)\s+["']([^"']+?)["']/i,
      /titulado\s+["']([^"']+?)["']/i,
      /(?:libro|obra|texto|poema) (?:titulado|llamado)\s+["']([^"']+?)["']/i
    ],
    fecha: [
      /\b(?:escrito|publicado|publicada|data de|fechado|redactado)\s+(?:en\s+)?(?:el\s+año\s+)?(\d{4})\b/i,
      /\b(?:del|el)\s+año\s+(\d{4})\b/i
    ]
  };

  // Extraer todas las menciones potenciales
  const foundMetadata = {};
  for (const [type, patterns] of Object.entries(metadataPatterns)) {
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        const mentioned = match[1].trim();
        // Verificar si está en el texto original
        if (mentioned.length > 2 && !textContext.includes(mentioned.toLowerCase())) {
          if (!foundMetadata[type]) foundMetadata[type] = [];
          foundMetadata[type].push(mentioned);
        }
      }
    }
  }

  // Si se encontró metadata inventado, agregar error
  for (const [type, mentions] of Object.entries(foundMetadata)) {
    if (mentions.length > 0) {
      errors.push(`Menciona ${type} "${mentions[0]}" que no está en el texto original`);
    }
  }

  // 2. VALIDAR PREGUNTAS SOBRE PALABRAS DEL TUTOR
  // Extraer todas las preguntas de la respuesta
  const questionMatches = response.match(/[¿?]\s*([^¿?.]+?)[?.]/g) || [];

  for (const questionMatch of questionMatches) {
    const question = questionMatch.replace(/[¿?]/g, '').trim().toLowerCase();

    // Verificar patrones problemáticos específicos
    const problematicPatterns = [
      /cómo se relacionan?\s+(["']?\w+["']?)\s+y\s+(["']?\w+["']?)\s+en\s+(?:este|el)\s+fragmento/i,
      /qué\s+significa\s+(["']?\w+["']?)\s+en\s+este\s+fragmento/i
    ];

    for (const pattern of problematicPatterns) {
      const match = question.match(pattern);
      if (match) {
        // Extraer palabras mencionadas en la pregunta
        const mentionedWords = match.slice(1).filter(Boolean);
        // Verificar si alguna palabra no está en el texto original
        const invalidWords = mentionedWords.filter(w => {
          const cleanWord = w.replace(/["']/g, '').toLowerCase();
          return cleanWord.length > 2 && !textContext.includes(cleanWord);
        });

        if (invalidWords.length > 0 && !textContext.includes(invalidWords[0].toLowerCase())) {
          errors.push(`Pregunta sobre palabra "${invalidWords[0]}" que no está en el fragmento original`);
        }
      }
    }
  }

  // 3. CONSTRUIR RESPUESTA CORREGIDA SI HAY ERRORES
  let correctedResponse = null;
  if (errors.length > 0) {
    // Crear prompt de corrección para regenerar
    correctedResponse = {
      needsRegeneration: true,
      errors,
      correctionPrompt: `La respuesta anterior tenía estos problemas:\n${errors.map(e => `- ${e}`).join('\n')}\n\nPor favor, corrige la respuesta evitando estos errores. Enfócate solo en el texto que el estudiante está leyendo, sin mencionar información que no esté explícitamente en el texto.`
    };
  }

  return {
    isValid: errors.length === 0,
    errors,
    correctedResponse
  };
}
