// src/services/essayFormatValidator.js

function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const tokens = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  return tokens.length;
}

function countParagraphs(text) {
  if (!text || typeof text !== 'string') return 0;
  const paras = text
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  return paras.length;
}

function countQuotes(text) {
  if (!text || typeof text !== 'string') return 0;
  // 🆕 FIX: Soportar comillas dobles "..." y comillas angulares «...»
  const doubleQuotes = text.match(/"([^"]{10,})"/g) || [];
  const angularQuotes = text.match(/«([^»]{10,})»/g) || [];
  return doubleQuotes.length + angularQuotes.length;
}

function hasArtifactReferences(text) {
  if (!text || typeof text !== 'string') return false;
  // Heurística simple (sin UX extra): basta con alguna referencia a artefactos.
  return /\b(resumen|mapa|análisis|analisis|respuesta|artefacto|bitácora|bitacora)\b/i.test(text);
}

/**
 * Valida formato del ensayo antes de enviar a evaluación IA.
 *
 * Reglas por defecto (del plan):
 * - 800-1200 palabras
 * - >=3 citas entre comillas
 * - >=5 párrafos
 * - referencias a artefactos (heurístico)
 */
export function validateEssayFormat(text, options = {}) {
  const minWords = Number.isFinite(options.minWords) ? Number(options.minWords) : 800;
  const maxWords = Number.isFinite(options.maxWords) ? Number(options.maxWords) : 1200;
  const minCitations = Number.isFinite(options.minCitations) ? Number(options.minCitations) : 3;
  const minParagraphs = Number.isFinite(options.minParagraphs) ? Number(options.minParagraphs) : 5;
  const requireArtifactReferences = options.requireArtifactReferences !== false;

  const wordCount = countWords(text);
  const citationCount = countQuotes(text);
  const paragraphCount = countParagraphs(text);
  const artifactReferences = hasArtifactReferences(text);

  const errors = [];

  if (wordCount < minWords || wordCount > maxWords) {
    errors.push(`Debe tener entre ${minWords} y ${maxWords} palabras.`);
  }

  if (citationCount < minCitations) {
    errors.push(`Debe incluir al menos ${minCitations} citas textuales entre comillas.`);
  }

  if (paragraphCount < minParagraphs) {
    errors.push(`Debe tener al menos ${minParagraphs} párrafos.`);
  }

  if (requireArtifactReferences && !artifactReferences) {
    errors.push('Debe hacer referencia a tus artefactos formativos previos (resumen/mapa/análisis/respuesta).');
  }

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      wordCount,
      citationCount,
      paragraphCount,
      artifactReferences
    }
  };
}

export default {
  validateEssayFormat
};
