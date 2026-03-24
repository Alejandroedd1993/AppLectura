import { chatCompletion, extractContent } from './unifiedAiService';
import { DEEPSEEK_CHAT_MODEL } from '../constants/aiModelDefaults';
import { stripJsonFences } from '../utils/jsonClean';
import { TtlCache } from '../utils/TtlCache';
import logger from '../utils/logger';

// Caché en memoria para evitar llamadas duplicadas a la API
const _definitionCache = new TtlCache({ maxEntries: 150, ttlMs: 60 * 60 * 1000 });

/**
 * Obtiene una definición contextual de un término usando IA
 * 
 * @param {string} term - El término a definir
 * @param {string} fullText - El texto completo donde aparece el término (para contexto)
 * @returns {Promise<object>} - Objeto con definición, contexto, relacionados, nivel
 */
export async function fetchTermDefinition(term, fullText) {
  // Revisar caché primero
  const cacheKey = term.toLowerCase().trim();
  if (_definitionCache.has(cacheKey)) {
    logger.log(`📋 Definición cacheada para: "${term}"`);
    return _definitionCache.get(cacheKey);
  }

  try {
    logger.log(`🔍 Obteniendo definición contextual para: "${term}"`);

    // Crear prompt optimizado para definición contextual
    const prompt = `Eres un asistente educativo especializado en explicar conceptos de manera clara y contextual.

TÉRMINO A DEFINIR: "${term}"

CONTEXTO (extracto del texto donde aparece):
${fullText.substring(0, 1000)}...

TAREA: Proporciona una definición educativa del término "${term}" considerando su uso específico en este contexto.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin \`\`\`json) con esta estructura exacta:
{
  "definicion": "Definición clara y concisa del término (2-3 oraciones máximo)",
  "contexto_en_texto": "Cómo se usa específicamente este término en el texto analizado",
  "conceptos_relacionados": ["concepto1", "concepto2", "concepto3"],
  "nivel_complejidad": "Básico|Intermedio|Avanzado - con explicación breve"
}

IMPORTANTE: 
- NO uses markdown
- NO incluyas explicaciones adicionales
- SOLO el objeto JSON
- La definición debe ser educativa y accesible para estudiantes`;

    // Llamar a DeepSeek (rápido y gratis)
    const data = await chatCompletion({
      provider: 'deepseek',
      model: DEEPSEEK_CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 400
    });

    const content = extractContent(data);
    
    if (!content) {
      throw new Error('No se recibió respuesta del servicio de IA');
    }

    logger.log('📦 Respuesta recibida, parseando...');

    // Parsear JSON
    let definition;
    try {
      // Limpiar posibles marcadores de markdown
      const cleanContent = stripJsonFences(content);
      
      definition = JSON.parse(cleanContent);
    } catch (parseError) {
      logger.warn('❌ Error parseando JSON de definición:', parseError.message);
      
      // Fallback: extraer manualmente
      definition = {
        definicion: content.substring(0, 200) + '...',
        contexto_en_texto: 'No disponible',
        conceptos_relacionados: [],
        nivel_complejidad: 'Intermedio'
      };
    }

    // Validar estructura
    if (!definition.definicion) {
      definition.definicion = `Término: ${term}. Información no disponible.`;
    }
    if (!definition.contexto_en_texto) {
      definition.contexto_en_texto = 'Contexto específico no identificado.';
    }
    if (!Array.isArray(definition.conceptos_relacionados)) {
      definition.conceptos_relacionados = [];
    }
    if (!definition.nivel_complejidad) {
      definition.nivel_complejidad = 'Intermedio';
    }

    logger.log('✅ Definición generada exitosamente');
    _definitionCache.set(cacheKey, definition);
    return definition;

  } catch (error) {
    logger.warn('❌ Error obteniendo definición del término:', error.message);
    
    // Fallback robusto
    return {
      definicion: `"${term}" es un concepto relacionado con el contenido del texto. Para más información, utiliza el botón de búsqueda web.`,
      contexto_en_texto: 'No se pudo determinar el contexto específico debido a un error técnico.',
      conceptos_relacionados: [],
      nivel_complejidad: 'Intermedio - requiere investigación adicional'
    };
  }
}

/**
 * Abre búsqueda web del término
 * 
 * @param {string} term - Término a buscar
 */
export function searchTermOnWeb(term) {
  const query = encodeURIComponent(term + ' definición educativa');
  const searchUrl = `https://www.google.com/search?q=${query}`;
  window.open(searchUrl, '_blank', 'noopener,noreferrer');
  logger.log(`🌐 Búsqueda web abierta para: "${term}"`);
}
